import { useConnectionStore } from '../stores/connectionStore';
import { DiscoveredDevice } from '../types/protocol';
import { webSocketService } from './webSocketService';

class DiscoveryService {
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;

  async startDiscovery() {
    if (this.isScanning) return;
    this.isScanning = true;
    useConnectionStore.getState().setStatus('discovering');

    // Immediate initial probe of local USB hardware bridge on launch
    this.probeAddress('127.0.0.1', 6655);

    // If Tauri is available, invoke native mDNS discovery command
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_discovery');
        this.pollTauriDiscovery();
        return;
      } catch (e) {
        console.warn('Native Tauri discovery fallback to web polling:', e);
      }
    }

    // Web / Direct LAN fallback: Poll known gateway addresses or manual IP
    this.startDirectLanProbe();
  }

  private pollTauriDiscovery() {
    this.scanInterval = setInterval(async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const devices = (await invoke('get_discovered_devices')) as DiscoveredDevice[];
        if (devices && devices.length > 0) {
          useConnectionStore.getState().setDiscoveredDevices(devices);
          // If not connected, auto-connect to the first discovered device
          if (useConnectionStore.getState().status === 'discovering' || useConnectionStore.getState().status === 'disconnected') {
            webSocketService.connect(devices[0]);
          }
        }
      } catch (e) {
        console.error('Error polling discovered devices:', e);
      }
    }, 2000);
  }

  private startDirectLanProbe() {
    // Probe local USB hardware bridge (127.0.0.1) and common hotspot gateway (192.168.43.1)
    const defaultTargets = ['127.0.0.1', '192.168.43.1'];
    
    this.scanInterval = setInterval(async () => {
      const currentStatus = useConnectionStore.getState().status;
      // If already connected, skip active polling
      if (currentStatus === 'connected') return;

      for (const ip of defaultTargets) {
        this.probeAddress(ip, 6655);
      }
    }, 3000);
  }

  async probeAddress(ip: string, port: number = 6655): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`http://${ip}:${port}/ping`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        let model = 'realme 9 Pro 5G';
        try {
          const data = await res.json();
          if (data && data.model) model = data.model;
        } catch {}

        const isLocalBridge = ip === '127.0.0.1' || ip === 'localhost';
        const device: DiscoveredDevice = {
          id: `${ip}:${port}`,
          name: isLocalBridge ? `${model} (USB Wire)` : `Android Companion (${ip})`,
          model: model,
          manufacturer: 'Android',
          ipAddress: ip,
          port,
          protocolVersion: 1,
          lastSeen: Date.now(),
        };

        useConnectionStore.getState().addDiscoveredDevice(device);

        // Auto-connect immediately if not currently connected
        const currentStatus = useConnectionStore.getState().status;
        if (currentStatus === 'disconnected' || currentStatus === 'discovering') {
          console.log(`Auto-connecting to discovered hardware device: ${device.name}`);
          webSocketService.connect(device);
        }
        return true;
      }
      return false;
    } catch {
      return false;
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


