import { create } from 'zustand';
import { DeviceHardwareInfo, BatteryInfo, StorageMetrics, NetworkInfo, DeviceInfoResponsePayload } from '../types/protocol';

interface DeviceState {
  hardware: DeviceHardwareInfo | null;
  battery: BatteryInfo | null;
  storage: StorageMetrics | null;
  network: NetworkInfo | null;
  lastUpdated: number | null;

  setTelemetry: (payload: DeviceInfoResponsePayload) => void;
  setBattery: (battery: BatteryInfo) => void;
  clearTelemetry: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  hardware: null,
  battery: null,
  storage: null,
  network: null,
  lastUpdated: null,

  setTelemetry: (payload) =>
    set({
      hardware: payload.device,
      battery: payload.battery,
      storage: payload.storage,
      network: payload.network,
      lastUpdated: Date.now(),
    }),

  setBattery: (battery) => set({ battery, lastUpdated: Date.now() }),

  clearTelemetry: () =>
    set({
      hardware: null,
      battery: null,
      storage: null,
      network: null,
      lastUpdated: null,
    }),
}));

