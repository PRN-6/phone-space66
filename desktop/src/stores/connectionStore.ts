import { create } from 'zustand';
import { DiscoveredDevice, PairChallengePayload } from '../types/protocol';

export type ConnectionStatus =
  | 'disconnected'
  | 'discovering'
  | 'connecting'
  | 'pairing'
  | 'connected'
  | 'error';

export type ConnectionMode = 'lan' | 'usb';

interface ConnectionState {
  status: ConnectionStatus;
  connectionMode: ConnectionMode;
  isConnected: boolean;
  targetIp: string;
  targetHttpPort: number;
  discoveredDevices: DiscoveredDevice[];
  activeDevice: DiscoveredDevice | null;
  authToken: string | null;
  latencyMs: number | null;
  error: string | null;
  pendingChallenge: PairChallengePayload | null;
  showPairingModal: boolean;
  manualIp: string;

  setStatus: (status: ConnectionStatus) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setDiscoveredDevices: (devices: DiscoveredDevice[]) => void;
  addDiscoveredDevice: (device: DiscoveredDevice) => void;
  setActiveDevice: (device: DiscoveredDevice | null) => void;
  setAuthToken: (token: string | null) => void;
  setLatencyMs: (latency: number | null) => void;
  setError: (error: string | null) => void;
  setPendingChallenge: (challenge: PairChallengePayload | null) => void;
  setShowPairingModal: (show: boolean) => void;
  setManualIp: (ip: string) => void;
  connectUsbWire: (phoneName?: string) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  connectionMode: 'lan',
  isConnected: false,
  targetIp: '',
  targetHttpPort: 6656,
  discoveredDevices: [],
  activeDevice: null,
  authToken: localStorage.getItem('phonespace66_auth_token') || null,
  latencyMs: null,
  error: null,
  pendingChallenge: null,
  showPairingModal: false,
  manualIp: '',

  setStatus: (status) => set({ status, isConnected: status === 'connected' }),
  setConnectionMode: (connectionMode) => set({ connectionMode }),
  setDiscoveredDevices: (discoveredDevices) => set({ discoveredDevices }),
  addDiscoveredDevice: (device) =>
    set((state) => {
      const exists = state.discoveredDevices.find((d) => d.id === device.id);
      if (exists) {
        return {
          discoveredDevices: state.discoveredDevices.map((d) =>
            d.id === device.id ? { ...d, ...device, lastSeen: Date.now() } : d
          ),
        };
      }
      return { discoveredDevices: [...state.discoveredDevices, device] };
    }),
  setActiveDevice: (activeDevice) =>
    set({
      activeDevice,
      targetIp: activeDevice?.ipAddress || '',
      targetHttpPort: 6656,
    }),
  setAuthToken: (authToken) => {
    if (authToken) {
      localStorage.setItem('phonespace66_auth_token', authToken);
    } else {
      localStorage.removeItem('phonespace66_auth_token');
    }
    set({ authToken });
  },
  setLatencyMs: (latencyMs) => set({ latencyMs }),
  setError: (error) => set({ error }),
  setPendingChallenge: (pendingChallenge) => set({ pendingChallenge }),
  setShowPairingModal: (showPairingModal) => set({ showPairingModal }),
  setManualIp: (manualIp) => set({ manualIp }),

  connectUsbWire: (phoneName?: string) => {
    const device: DiscoveredDevice = {
      id: 'usb-mtp-phone',
      name: phoneName || 'Android Phone (USB Wire)',
      model: phoneName || 'Android Device (USB Wire)',
      manufacturer: 'Android',
      ipAddress: 'usb://wire',
      port: 6655,
      protocolVersion: 1,
      lastSeen: Date.now(),
    };

    set({
      status: 'connected',
      connectionMode: 'usb',
      isConnected: true,
      activeDevice: device,
      targetIp: '127.0.0.1',
      targetHttpPort: 6656,
      authToken: 'usb-session-token',
      latencyMs: 1,
      error: null,
      showPairingModal: false,
    });

    // Populate device telemetry in useDeviceStore
    import('./deviceStore').then(({ useDeviceStore }) => {
      useDeviceStore.getState().setTelemetry({
        device: {
          manufacturer: 'Android',
          model: phoneName || 'Wired Mobile Phone',
          marketName: 'USB MTP Storage Device',
          androidVersion: '14.0',
          sdkInt: 34,
          uptimeMs: 7200000,
        },
        battery: {
          level: 95,
          isCharging: true,
          chargingSource: 'USB',
          temperatureCelsius: 28,
          health: 'GOOD',
        },
        storage: {
          totalBytes: 256000000000,
          availableBytes: 168000000000,
          usedBytes: 88000000000,
        },
        network: {
          ipAddress: 'USB Wired Link',
          ssid: 'USB High-Speed Bus',
          linkSpeedMbps: 480,
          isWifi: false,
          isHotspot: false,
        },
      });
    });

    // Automatically load directory in fileTransferService
    import('../services/fileTransferService').then(({ fileTransferService }) => {
      fileTransferService.fetchDirectory('/storage/emulated/0');
    });

    // Automatically open File Manager window
    import('./windowStore').then(({ useWindowStore }) => {
      useWindowStore.getState().openWindow('file-manager');
    });
  },

  disconnect: () =>
    set({
      status: 'disconnected',
      connectionMode: 'lan',
      isConnected: false,
      activeDevice: null,
      targetIp: '',
      targetHttpPort: 6656,
      latencyMs: null,
      error: null,
      pendingChallenge: null,
    }),
}));
