import { useConnectionStore } from '../stores/connectionStore';
import { DiscoveredDevice } from '../types/protocol';
import { webSocketService } from './webSocketService';

/**
 * ConnectionCoordinator & DiscoveryService
 * Orchestrates device discovery across:
 * 1. Local USB Hardware Bridge (ws://127.0.0.1:6655/ws)
 * 2. Android Hotspot Gateway (192.168.43.1:6655)
 * 3. Local LAN / Wi-Fi Subnet Broadcasts
 * 4. Native Tauri mDNS Discovery
 */
class DiscoveryService {
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async startDiscovery() {
    if (this.isScanning) return;
    this.isScanning = true;
    useConnectionStore.getState().setStatus('discovering');

    // 1. Immediate probe of local USB hardware bridge on startup
    await this.probeAddress('127.0.0.1', 6655);

    // 2. If Tauri native runtime is present, start mDNS discovery
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_discovery');
        this.pollTauriDiscovery();
        return;
      } catch (e) {
        console.warn('[DISCOVERY] Native Tauri discovery fallback to LAN polling:', e);
      }
    }

    // 3. Periodic LAN & USB Polling Loop
    this.startDirectLanProbe();
  }

  private pollTauriDiscovery() {
    this.scanInterval = setInterval(async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const devices = (await invoke('get_discovered_devices')) as DiscoveredDevice[];
        if (devices && devices.length > 0) {
          useConnectionStore.getState().setDiscoveredDevices(devices);
          const currentStatus = useConnectionStore.getState().status;
          if (
            (currentStatus === 'discovering' || currentStatus === 'disconnected') &&
            !this.isConnecting
          ) {
            this.coordinateConnection(devices[0]);
          }
        }
      } catch (e) {
        console.error('[DISCOVERY] Error polling Tauri discovered devices:', e);
      }
    }, 2000);
  }

  private startDirectLanProbe() {
    const defaultTargets = ['127.0.0.1', '192.168.43.1'];

    this.scanInterval = setInterval(async () => {
      const currentStatus = useConnectionStore.getState().status;
      // If already fully connected and active, skip aggressive probing
      if (currentStatus === 'connected' || currentStatus === 'synchronizing') {
        this.reconnectAttempts = 0;
        return;
      }

      for (const ip of defaultTargets) {
        await this.probeAddress(ip, 6655);
      }
    }, 2500);
  }

  async probeAddress(ip: string, port = 6655): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`http://${ip}:${port}/ping`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        let model = 'Android Device';
        try {
          const data = await res.json();
          if (data && data.model) model = data.model;
        } catch {}

        const isLocalBridge = ip === '127.0.0.1' || ip === 'localhost';
        const device: DiscoveredDevice = {
          id: `${ip}:${port}`,
          name: isLocalBridge ? `${model} (USB Wire)` : `Android Companion (${ip})`,
          model,
          manufacturer: 'Android',
          ipAddress: ip,
          port,
          protocolVersion: 1,
          lastSeen: Date.now(),
        };

        useConnectionStore.getState().addDiscoveredDevice(device);

        const currentStatus = useConnectionStore.getState().status;
        if (
          (currentStatus === 'disconnected' || currentStatus === 'discovering') &&
          !this.isConnecting
        ) {
          this.coordinateConnection(device);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Connection Coordinator:
   * Selects transport strategy, prevents duplicate connections,
   * sets up timeouts, and initiates session.
   */
  async coordinateConnection(device: DiscoveredDevice) {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      console.log(`[COORDINATOR] Initiating connection strategy for: ${device.name} (${device.ipAddress})`);
      const isUsb = device.ipAddress === '127.0.0.1' || device.ipAddress === 'localhost';

      useConnectionStore.getState().setConnectionMode(isUsb ? 'usb' : 'lan');
      useConnectionStore.getState().setActiveTransport(isUsb ? 'mtp' : 'companion');
      useConnectionStore.getState().setStatus('connecting', `Connecting to ${device.name}...`);

      webSocketService.connect(device);
    } finally {
      setTimeout(() => {
        this.isConnecting = false;
      }, 1000);
    }
  }

  stopDiscovery() {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

export const discoveryService = new DiscoveryService();
