import React, { useState } from 'react';
import {
  Smartphone,
  Battery,
  HardDrive,
  Wifi,
  Cpu,
  Clock,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Thermometer,
  Radio,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { webSocketService } from '../../services/webSocketService';
import { DiscoveredDevice } from '../../types/protocol';

export const DeviceDashboardWindow: React.FC = () => {
  const { hardware, battery, storage, network } = useDeviceStore();
  const {
    status,
    activeDevice,
    latencyMs,
    setShowPairingModal,
    manualIp,
    setManualIp,
  } = useConnectionStore();

  const [inputIp, setInputIp] = useState(manualIp || '');

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

  const handleDirectConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const target = inputIp.trim();
    if (!target) return;
    setManualIp(target);

    let ip = target;
    let port = 6655;
    if (ip.includes(':')) {
      const parts = ip.split(':');
      ip = parts[0];
      port = parseInt(parts[1], 10) || 6655;
    }

    const device: DiscoveredDevice = {
      id: `${ip}:${port}`,
      name: `Android Phone (${ip})`,
      model: 'Android Device',
      manufacturer: 'Android',
      ipAddress: ip,
      port,
      protocolVersion: 1,
      lastSeen: Date.now(),
    };

    webSocketService.connect(device);
  };

  // Standby / Disconnected State
  if (!isConnected || !hardware) {
    return (
      <div className="p-5 space-y-4 select-none overflow-y-auto h-full text-silver-200 bg-charcoal-950 font-sans">
        {/* Standby Banner */}
        <div className="p-4 rounded-xl bg-charcoal-900 border border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-charcoal-800 border border-white/10 flex items-center justify-center text-silver-300">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  PHONE SPACE66 Telemetry & Diagnostics
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-800 text-silver-400 border border-white/5 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-silver-500 animate-pulse" />
                  <span>STANDBY</span>
                </span>
              </div>
              <p className="text-xs text-silver-400 mt-0.5">
                No phone paired. Connect companion app to stream live hardware telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowPairingModal(true)}
            className="px-3.5 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-silver-100 hover:text-white border border-white/15 hover:border-white/30 text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-silver-300 animate-pulse" />
            <span>Scan & Pair</span>
          </button>
        </div>

        {/* Direct IP Quick-Connect Bar */}
        <div className="p-3.5 rounded-xl bg-charcoal-900/80 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-silver-400 font-semibold flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-silver-300" />
              <span>Direct LAN Connect</span>
            </span>
            <span className="text-[10px] text-silver-500 font-mono">Port 6655</span>
          </div>
          <form onSubmit={handleDirectConnect} className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. 192.168.1.100 or 192.168.43.1"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              className="flex-1 px-3 py-2 bg-charcoal-950 border border-white/10 rounded-xl text-xs text-silver-100 placeholder-silver-600 focus:outline-none focus:border-white/30 font-mono"
            />
            <button
              type="submit"
              disabled={!inputIp.trim() || status === 'connecting'}
              className="px-4 py-2 bg-charcoal-800 hover:bg-charcoal-750 text-silver-100 border border-white/15 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <span>{status === 'connecting' ? 'Connecting...' : 'Connect'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Diagnostic Telemetry Preview Gauges (Standby Placeholders) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Battery Preview */}
          <div className="p-4 rounded-xl bg-charcoal-900/60 border border-dashed border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono flex items-center space-x-1.5">
                <Battery className="w-3.5 h-3.5 text-silver-400" />
                <span>Battery & Thermal</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-charcoal-850 text-silver-500 border border-white/5">
                -- %
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold font-mono text-silver-400">--%</div>
              <div className="text-xs text-silver-500 font-mono mt-0.5 flex items-center space-x-2">
                <Thermometer className="w-3 h-3 text-silver-500" />
                <span>-- °C • Awaiting signal</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
              <div className="h-full bg-silver-500/20 w-0" />
            </div>
          </div>

          {/* Storage Preview */}
          <div className="p-4 rounded-xl bg-charcoal-900/60 border border-dashed border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-silver-400" />
                <span>Internal Storage</span>
              </span>
              <span className="text-[10px] text-silver-500 font-mono">-- Used</span>
            </div>
            <div className="my-3">
              <div className="text-xl font-bold font-mono text-silver-400">
                -- GB <span className="text-xs text-silver-500 font-normal">/ -- GB</span>
              </div>
              <div className="text-xs text-silver-500 font-mono mt-0.5">
                StatFs storage telemetry
              </div>
            </div>
            <div className="w-full h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
              <div className="h-full bg-silver-500/20 w-0" />
            </div>
          </div>
        </div>

        {/* Pairing Instructions */}
        <div className="p-4 rounded-xl bg-charcoal-900/60 border border-white/5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono mb-2.5">
            Quick Connection Steps
          </h4>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-charcoal-850 border border-white/5 space-y-1">
              <div className="font-mono text-silver-300 text-[11px] font-bold">01. Same Network</div>
              <p className="text-silver-500 text-[11px]">
                Connect laptop & phone to the same Wi-Fi router or phone hotspot.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-charcoal-850 border border-white/5 space-y-1">
              <div className="font-mono text-silver-300 text-[11px] font-bold">02. Open Companion</div>
              <p className="text-silver-500 text-[11px]">
                Launch PHONE SPACE66 Companion on your Android device.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-charcoal-850 border border-white/5 space-y-1">
              <div className="font-mono text-silver-300 text-[11px] font-bold">03. Verify PIN</div>
              <p className="text-silver-500 text-[11px]">
                Confirm the 6-digit verification code when prompted to link.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const storageUsedPercent = storage
    ? Math.round((storage.usedBytes / storage.totalBytes) * 100)
    : 0;

  // Active Connected State
  return (
    <div className="p-5 space-y-4 select-none overflow-y-auto h-full text-silver-200 bg-charcoal-950 font-sans">
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
          className="p-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 text-silver-300 hover:text-white border border-white/10 transition-colors"
          title="Refresh Live Metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Real Battery Diagnostics */}
        {battery && (
          <div className="p-4 rounded-xl bg-charcoal-900 border border-white/10 flex flex-col justify-between">
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
          <div className="p-4 rounded-xl bg-charcoal-900 border border-white/10 flex flex-col justify-between">
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
      <div className="p-4 rounded-xl bg-charcoal-900 border border-white/10">
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
