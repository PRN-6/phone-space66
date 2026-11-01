import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  Battery,
  BatteryCharging,
  Smartphone,
  RefreshCw,
  LogOut,
  HardDrive,
  Info,
} from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { useWindowStore } from '../../stores/windowStore';
import { webSocketService } from '../../services/webSocketService';

export const QuickSettings: React.FC = () => {
  const { isQuickSettingsOpen, toggleQuickSettings, openWindow } = useWindowStore();
  const { status, activeDevice, disconnect } = useConnectionStore();
  const { hardware, battery, storage, network } = useDeviceStore();

  if (!isQuickSettingsOpen) return null;

  const isConnected = status === 'connected';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-40"
        onClick={() => toggleQuickSettings(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-11 right-4 w-80 bg-charcoal-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl text-silver-200 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-silver-200" />
              <span className="font-semibold text-sm text-silver-100">
                {hardware ? hardware.model : 'Quick Controls'}
              </span>
            </div>
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                isConnected
                  ? 'bg-charcoal-800 text-silver-200 border-white/15'
                  : 'bg-charcoal-850 text-silver-500 border-white/5'
              }`}
            >
              {status}
            </span>
          </div>

          {/* Quick Tiles Grid */}
          <div className="grid grid-cols-2 gap-2 my-3">
            {/* Wi-Fi Tile */}
            <div className="p-3 bg-charcoal-850 border border-white/5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Wifi className="w-4 h-4 text-silver-300" />
                <span className="text-[10px] text-silver-500 font-mono">
                  {network?.linkSpeedMbps ? `${network.linkSpeedMbps} Mbps` : 'LAN'}
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-medium text-silver-100 truncate">
                  {network?.ssid || 'Wi-Fi'}
                </div>
                <div className="text-[10px] text-silver-500 font-mono truncate">
                  {network?.ipAddress || activeDevice?.ipAddress || 'Not connected'}
                </div>
              </div>
            </div>

            {/* Battery Tile */}
            <div className="p-3 bg-charcoal-850 border border-white/5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                {battery?.isCharging ? (
                  <BatteryCharging className="w-4 h-4 text-silver-100" />
                ) : (
                  <Battery className="w-4 h-4 text-silver-300" />
                )}
                <span className="text-[10px] text-silver-500 font-mono">
                  {battery ? `${battery.temperatureCelsius}°C` : '--'}
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-medium text-silver-100">
                  {battery ? `${battery.level}% Battery` : 'Battery'}
                </div>
                <div className="text-[10px] text-silver-500">
                  {battery?.isCharging ? `Charging (${battery.chargingSource})` : 'Discharging'}
                </div>
              </div>
            </div>
          </div>

          {/* Storage Summary */}
          {storage && (
            <div className="p-3 bg-charcoal-850 border border-white/5 rounded-xl mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center space-x-1.5 text-silver-300">
                  <HardDrive className="w-3.5 h-3.5 text-silver-400" />
                  <span>Phone Storage</span>
                </span>
                <span className="text-silver-400 font-mono text-[11px]">
                  {(storage.usedBytes / 1e9).toFixed(1)} / {(storage.totalBytes / 1e9).toFixed(1)} GB
                </span>
              </div>
              <div className="w-full h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-silver-200 rounded-full"
                  style={{
                    width: `${Math.min(100, (storage.usedBytes / storage.totalBytes) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => {
                toggleQuickSettings(false);
                openWindow('dashboard');
              }}
              className="w-full py-2 px-3 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-white/5 text-xs font-medium text-silver-200 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center space-x-2">
                <Info className="w-3.5 h-3.5 text-silver-300" />
                <span>Open Diagnostics Dashboard</span>
              </span>
              <span className="text-silver-500 font-mono text-[10px]">Super+D</span>
            </button>

            {isConnected ? (
              <button
                onClick={() => {
                  webSocketService.disconnect();
                  toggleQuickSettings(false);
                }}
                className="w-full py-2 px-3 rounded-lg bg-charcoal-800 hover:bg-neutral-800 text-xs font-medium text-silver-300 flex items-center justify-center space-x-2 transition-colors border border-white/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Phone</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  toggleQuickSettings(false);
                  useConnectionStore.getState().setShowPairingModal(true);
                }}
                className="w-full py-2 px-3 rounded-lg bg-silver-100 hover:bg-white text-xs font-bold text-charcoal-950 flex items-center justify-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-charcoal-950" />
                <span>Connect Phone Now</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
