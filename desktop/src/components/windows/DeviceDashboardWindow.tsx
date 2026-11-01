import React from 'react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  HardDrive,
  Wifi,
  Cpu,
  Clock,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Thermometer,
} from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { webSocketService } from '../../services/webSocketService';

export const DeviceDashboardWindow: React.FC = () => {
  const { hardware, battery, storage, network } = useDeviceStore();
  const { status, activeDevice, latencyMs, setShowPairingModal } = useConnectionStore();

  const isConnected = status === 'connected';

  const formatBytes = (bytes: number) => {
    const gb = bytes / 1_000_000_000;
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isConnected || !hardware) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none bg-charcoal-950">
        <div className="w-16 h-16 rounded-2xl bg-charcoal-850 border border-white/10 flex items-center justify-center text-silver-300 mb-4">
          <Smartphone className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-silver-100">No Phone Connected</h3>
        <p className="text-xs text-silver-400 max-w-sm mt-1 mb-5">
          Connect your phone running PHONE SPACE66 Companion over Wi-Fi or Hotspot to view real-time diagnostics.
        </p>
        <button
          onClick={() => setShowPairingModal(true)}
          className="px-5 py-2.5 rounded-xl bg-silver-100 hover:bg-white text-charcoal-950 font-bold text-xs transition-colors shadow-glow-subtle"
        >
          Connect Phone
        </button>
      </div>
    );
  }

  const storageUsedPercent = storage
    ? Math.round((storage.usedBytes / storage.totalBytes) * 100)
    : 0;

  return (
    <div className="p-5 space-y-4 select-none overflow-y-auto h-full text-silver-200 bg-charcoal-950">
      {/* Top Banner: Device Model & OS */}
      <div className="p-4 rounded-xl bg-charcoal-900 border border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-charcoal-800 border border-white/10 flex items-center justify-center text-silver-100 shadow-glow-subtle">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                {hardware.manufacturer} {hardware.model}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-800 text-silver-200 border border-white/10">
                Android {hardware.androidVersion} (API {hardware.sdkInt})
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-silver-400 mt-1 font-mono">
              <span>IP: {network?.ipAddress || activeDevice?.ipAddress}</span>
              <span>•</span>
              <span className="text-silver-200 flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-silver-400" />
                <span>LAN Authenticated</span>
              </span>
              {latencyMs !== null && <span>• {latencyMs}ms Ping</span>}
            </div>
          </div>
        </div>

        <button
          onClick={() => webSocketService.requestDeviceInfo()}
          className="p-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 text-silver-300 hover:text-white border border-white/5 transition-colors"
          title="Refresh Live Metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Real Battery Diagnostics */}
        {battery && (
          <div className="p-4 rounded-xl bg-charcoal-900 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono flex items-center space-x-1.5">
                <Battery className="w-3.5 h-3.5 text-silver-300" />
                <span>Battery Status</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  battery.isCharging
                    ? 'bg-charcoal-800 text-silver-100 border-white/15'
                    : 'bg-charcoal-850 text-silver-400 border-white/5'
                }`}
              >
                {battery.isCharging ? `Charging (${battery.chargingSource})` : 'Discharging'}
              </span>
            </div>

            <div className="my-3 flex items-baseline space-x-3">
              <span className="text-4xl font-black font-mono text-white">
                {battery.level}%
              </span>
              <div className="flex items-center space-x-1.5 text-xs text-silver-400">
                <Thermometer className="w-3.5 h-3.5 text-silver-400" />
                <span>{battery.temperatureCelsius}°C</span>
                <span className="text-silver-600">•</span>
                <span className="text-silver-300">{battery.health}</span>
              </div>
            </div>

            {/* Gauge Bar */}
            <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-silver-200"
                style={{ width: `${battery.level}%` }}
              />
            </div>
          </div>
        )}

        {/* Real Storage Diagnostics */}
        {storage && (
          <div className="p-4 rounded-xl bg-charcoal-900 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-silver-300" />
                <span>Internal Storage</span>
              </span>
              <span className="text-[10px] text-silver-400 font-mono">
                {storageUsedPercent}% Used
              </span>
            </div>

            <div className="my-3">
              <div className="text-xl font-bold font-mono text-white">
                {formatBytes(storage.usedBytes)}
                <span className="text-xs text-silver-400 font-normal"> / {formatBytes(storage.totalBytes)}</span>
              </div>
              <div className="text-xs text-silver-400 font-mono mt-0.5">
                {formatBytes(storage.availableBytes)} Available Free
              </div>
            </div>

            {/* Storage Progress Bar */}
            <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-silver-300 rounded-full transition-all duration-500"
                style={{ width: `${storageUsedPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Secondary Specs Table */}
      <div className="p-4 rounded-xl bg-charcoal-900 border border-white/5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono mb-3">
          Hardware & Telemetry Specifications
        </h4>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal-850 border border-white/5">
            <span className="text-silver-400 flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-silver-300" />
              <span>System Uptime</span>
            </span>
            <span className="font-mono text-silver-100">{formatUptime(hardware.uptimeMs)}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal-850 border border-white/5">
            <span className="text-silver-400 flex items-center space-x-2">
              <Wifi className="w-3.5 h-3.5 text-silver-300" />
              <span>Wi-Fi Network</span>
            </span>
            <span className="font-mono text-silver-100">
              {network?.ssid || 'Active LAN'}
              {network?.linkSpeedMbps ? ` (${network.linkSpeedMbps} Mbps)` : ''}
            </span>
          </div>

          {hardware.totalRamBytes && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal-850 border border-white/5">
              <span className="text-silver-400 flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-silver-300" />
                <span>Physical RAM</span>
              </span>
              <span className="font-mono text-silver-100">
                {formatBytes(hardware.totalRamBytes)} Total
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-charcoal-850 border border-white/5">
            <span className="text-silver-400 flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-silver-300" />
              <span>Security State</span>
            </span>
            <span className="font-mono text-silver-200">Encrypted Token</span>
          </div>
        </div>
      </div>
    </div>
  );
};
