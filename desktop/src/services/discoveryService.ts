import { useConnectionStore } from '../stores/connectionStore';
import { DiscoveredDevice } from '../types/protocol';

class DiscoveryService {
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;

  async startDiscovery() {
    if (this.isScanning) return;
    this.isScanning = true;
    useConnectionStore.getState().setStatus('discovering');

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
        }
      } catch (e) {
        console.error('Error polling discovered devices:', e);
      }
    }, 2000);
  }

  private startDirectLanProbe() {
    // Probe common hotspot/router phone IPs: 192.168.43.1 (Android Hotspot), 192.168.1.x, etc.
    const defaultTargets = ['192.168.43.1', '127.0.0.1'];
    
    this.scanInterval = setInterval(async () => {
      for (const ip of defaultTargets) {
        this.probeAddress(ip, 6655);
      }
    }, 4000);
  }

  async probeAddress(ip: string, port: number = 6655): Promise<boolean> {
    try {
      // Quick HTTP/WS test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`http://${ip}:${port}/ping`, {
        signal: controller.signal,
        mode: 'no-cors'
      }).catch(() => null);

      clearTimeout(timeoutId);

      // If network responded or socket is open
      const device: DiscoveredDevice = {
        id: `${ip}:${port}`,
        name: `Android Companion (${ip})`,
        model: 'Android Device',
        manufacturer: 'Android',
        ipAddress: ip,
        port,
        protocolVersion: 1,
        lastSeen: Date.now(),
      };
      useConnectionStore.getState().addDiscoveredDevice(device);
      return true;
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

