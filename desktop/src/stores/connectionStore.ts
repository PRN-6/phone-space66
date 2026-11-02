import { create } from 'zustand';
import { DiscoveredDevice, PairChallengePayload, TransportType, ErrorCode } from '../types/protocol';

export type ConnectionStatus =
  | 'disconnected'
  | 'discovering'
  | 'device_detected'
  | 'awaiting_phone_unlock'
  | 'awaiting_usb_mode'
  | 'awaiting_adb_authorization'
  | 'connecting'
  | 'pairing'
  | 'connected'
  | 'synchronizing'
  | 'reconnecting'
  | 'error';

export type ConnectionMode = 'lan' | 'usb';

interface ConnectionState {
  status: ConnectionStatus;
  connectionMode: ConnectionMode;
  isConnected: boolean;
  statusMessage: string;

  // Real Hardware Metadata
  deviceId: string | null;
  deviceModel: string | null;
  manufacturer: string | null;
  androidVersion: string | null;
  activeTransport: TransportType;
  connectionTimestamp: number | null;
  capabilities: string[];
  lastSyncTimestamp: number | null;
  errorCode: ErrorCode | string | null;
  errorDescription: string | null;

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

  // Actions
  setStatus: (status: ConnectionStatus, statusMessage?: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setActiveTransport: (transport: TransportType) => void;
  setDeviceMetadata: (meta: {
    deviceId?: string;
    deviceModel?: string;
    manufacturer?: string;
    androidVersion?: string;
    capabilities?: string[];
  }) => void;
  setDiscoveredDevices: (devices: DiscoveredDevice[]) => void;
  addDiscoveredDevice: (device: DiscoveredDevice) => void;
  setActiveDevice: (device: DiscoveredDevice | null) => void;
  setAuthToken: (token: string | null) => void;
  setLatencyMs: (latency: number | null) => void;
  setErrorState: (code: ErrorCode | string | null, description: string | null) => void;
  setError: (error: string | null) => void;
  setPendingChallenge: (challenge: PairChallengePayload | null) => void;
  setShowPairingModal: (show: boolean) => void;
  setManualIp: (ip: string) => void;
  updateSyncTimestamp: () => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  connectionMode: 'lan',
  isConnected: false,
  statusMessage: 'No Android device connected.',

  deviceId: null,
  deviceModel: null,
  manufacturer: null,
  androidVersion: null,
  activeTransport: 'none',
  connectionTimestamp: null,
  capabilities: [],
  lastSyncTimestamp: null,
  errorCode: null,
  errorDescription: null,

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

  setStatus: (status, statusMessage) => {
    let msg = statusMessage;
    if (!msg) {
      switch (status) {
        case 'disconnected':
          msg = 'No Android device connected.';
          break;
        case 'discovering':
          msg = 'Scanning for devices over USB and local network...';
          break;
        case 'device_detected':
          msg = 'Android phone detected. Initializing link...';
          break;
        case 'awaiting_phone_unlock':
          msg = 'Phone is locked. Unlock phone screen to allow access.';
          break;
        case 'awaiting_usb_mode':
          msg = 'Storage locked. Swipe down notifications on phone and select "File Transfer".';
          break;
        case 'awaiting_adb_authorization':
          msg = 'ADB prompt detected. Approve USB debugging on phone screen.';
          break;
        case 'connecting':
          msg = 'Establishing secure handshake...';
          break;
        case 'pairing':
          msg = 'Pairing verification in progress...';
          break;
        case 'connected':
          msg = 'Phone connected and active.';
          break;
        case 'synchronizing':
          msg = 'Synchronizing storage and telemetry...';
          break;
        case 'reconnecting':
          msg = 'Reconnecting to device...';
          break;
        case 'error':
          msg = 'Connection error.';
          break;
      }
    }

    set({
      status,
      statusMessage: msg,
      isConnected: status === 'connected' || status === 'synchronizing',
      connectionTimestamp: (status === 'connected' || status === 'synchronizing') ? Date.now() : null,
    });
  },

  setConnectionMode: (connectionMode) => set({ connectionMode }),
  setActiveTransport: (activeTransport) => set({ activeTransport }),

  setDeviceMetadata: (meta) =>
    set((state) => ({
      deviceId: meta.deviceId ?? state.deviceId,
      deviceModel: meta.deviceModel ?? state.deviceModel,
      manufacturer: meta.manufacturer ?? state.manufacturer,
      androidVersion: meta.androidVersion ?? state.androidVersion,
      capabilities: meta.capabilities ?? state.capabilities,
    })),

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
      deviceId: activeDevice?.id || null,
      deviceModel: activeDevice?.model || null,
      manufacturer: activeDevice?.manufacturer || null,
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

  setErrorState: (errorCode, errorDescription) =>
    set({
      status: 'error',
      isConnected: false,
      errorCode,
      errorDescription,
      error: errorDescription,
      statusMessage: errorDescription || 'System error',
    }),

  setError: (error) => set({ error, errorDescription: error }),
  setPendingChallenge: (pendingChallenge) => set({ pendingChallenge }),
  setShowPairingModal: (showPairingModal) => set({ showPairingModal }),
  setManualIp: (manualIp) => set({ manualIp }),
  updateSyncTimestamp: () => set({ lastSyncTimestamp: Date.now() }),

  disconnect: () =>
    set({
      status: 'disconnected',
      connectionMode: 'lan',
      isConnected: false,
      statusMessage: 'No Android device connected.',
      activeDevice: null,
      deviceId: null,
      deviceModel: null,
      manufacturer: null,
      androidVersion: null,
      activeTransport: 'none',
      connectionTimestamp: null,
      capabilities: [],
      lastSyncTimestamp: null,
      targetIp: '',
      targetHttpPort: 6656,
      latencyMs: null,
      error: null,
      errorCode: null,
      errorDescription: null,
      pendingChallenge: null,
    }),
}));
