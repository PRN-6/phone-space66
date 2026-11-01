import { create } from 'zustand';
import { DiscoveredDevice, PairChallengePayload } from '../types/protocol';

export type ConnectionStatus =
  | 'disconnected'
  | 'discovering'
  | 'connecting'
  | 'pairing'
  | 'connected'
  | 'error';

interface ConnectionState {
  status: ConnectionStatus;
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
  setDiscoveredDevices: (devices: DiscoveredDevice[]) => void;
  addDiscoveredDevice: (device: DiscoveredDevice) => void;
  setActiveDevice: (device: DiscoveredDevice | null) => void;
  setAuthToken: (token: string | null) => void;
  setLatencyMs: (latency: number | null) => void;
  setError: (error: string | null) => void;
  setPendingChallenge: (challenge: PairChallengePayload | null) => void;
  setShowPairingModal: (show: boolean) => void;
  setManualIp: (ip: string) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
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
  disconnect: () =>
    set({
      status: 'disconnected',
      isConnected: false,
      activeDevice: null,
      targetIp: '',
      targetHttpPort: 6656,
      latencyMs: null,
      error: null,
      pendingChallenge: null,
    }),
}));
