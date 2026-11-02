import React, { useState, useEffect } from 'react';
import {
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Bell,
  Sliders,
  Minus,
  Square,
  X,
  Smartphone,
  Radio,
  Zap,
} from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { useWindowStore } from '../../stores/windowStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useMediaStore } from '../../stores/mediaStore';
import { mediaService } from '../../services/mediaService';
import { Play, Pause, SkipForward, Music } from 'lucide-react';

export const TopStatusBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  const { status, latencyMs, setShowPairingModal, connectionMode, activeDevice } = useConnectionStore();
  const { hardware, battery, network } = useDeviceStore();
  const { toggleQuickSettings, isQuickSettingsOpen, openWindow } = useWindowStore();
  const { unreadCount } = useNotificationStore();
  const { playback } = useMediaStore();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWindowAction = async (action: 'minimize' | 'maximize' | 'close') => {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke(`window_${action}`);
      } catch (e) {
        console.warn(`Window ${action} invoke failed:`, e);
      }
    }
  };

  const isConnected = status === 'connected';

  return (
    <header className="h-9 w-full bg-charcoal-900/95 backdrop-blur-md border-b border-white/[0.08] px-3.5 flex items-center justify-between text-xs select-none z-50">
      {/* Left: Brand & Phone Connection Status */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        <button
          onClick={() => openWindow('dashboard')}
          className="flex items-center space-x-2 text-silver-100 hover:text-white transition-colors focus:outline-none flex-shrink-0"
        >
          <img src="/logo.svg" alt="PHONE SPACE66" className="w-5 h-5 object-contain flex-shrink-0" />
          <span className="font-bold tracking-wider font-mono text-silver-100 whitespace-nowrap text-xs">
            PHONE SPACE66
          </span>
        </button>

        <div className="h-3.5 w-px bg-white/10 flex-shrink-0" />

        {/* Connected Device Capsule */}
        {isConnected && hardware ? (
          <button
            onClick={() => openWindow('file-manager')}
            className="flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-charcoal-800 border border-white/10 text-silver-200 hover:bg-charcoal-750 hover:border-white/20 transition-all flex-shrink-0 whitespace-nowrap"
          >
            {connectionMode === 'usb' || activeDevice?.ipAddress === 'usb://wire' ? (
              <Zap className="w-3.5 h-3.5 text-silver-200" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-silver-300" />
            )}
            <span className="font-medium text-[11px]">{hardware.model}</span>
            {connectionMode === 'usb' || activeDevice?.ipAddress === 'usb://wire' ? (
              <span className="text-[10px] text-silver-400 font-mono">(USB Wire)</span>
            ) : (
              latencyMs !== null && (
                <span className="text-[10px] text-silver-500 font-mono">({latencyMs}ms)</span>
              )
            )}
          </button>
        ) : (
          <button
            onClick={() => openWindow('dashboard')}
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-xs transition-all flex-shrink-0 whitespace-nowrap ${
              status === 'awaiting_usb_mode' || status === 'awaiting_phone_unlock'
                ? 'bg-charcoal-800 border-white/30 text-silver-100 animate-pulse'
                : 'bg-charcoal-850 border-white/10 text-silver-400 hover:text-silver-200 hover:border-white/20'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-silver-400" />
            <span className="text-[11px]">
              {status === 'awaiting_usb_mode'
                ? '⚠️ Select File Transfer on Phone'
                : status === 'awaiting_phone_unlock'
                ? '⚠️ Unlock Phone Screen'
                : status === 'awaiting_adb_authorization'
                ? '⚠️ Authorize USB Debugging'
                : status === 'device_detected'
                ? '⚡ Device Detected...'
                : status === 'connecting'
                ? 'Connecting...'
                : status === 'pairing'
                ? 'Pairing...'
                : 'Connect Phone'}
            </span>
          </button>
        )}
      </div>

      {/* Center: Live Date & Clock */}
      <div className="flex items-center space-x-2 text-silver-400 font-mono">
        <span className="text-silver-500 text-[11px]">{dateStr}</span>
        <span className="font-semibold text-silver-100">{timeStr}</span>
      </div>

      {/* Right: Telemetry Indicators, Quick Settings & Window Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Real Battery Indicator */}
        {isConnected && battery && (
          <div
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-charcoal-800 border border-white/5 text-silver-200 cursor-pointer hover:bg-charcoal-750 transition-colors"
            onClick={() => openWindow('dashboard')}
            title={`${battery.level}% - ${battery.isCharging ? 'Charging' : 'Discharging'} (${battery.temperatureCelsius}°C)`}
          >
            {battery.isCharging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-silver-100" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-silver-300" />
            )}
            <span className="font-mono text-[11px] font-semibold text-silver-100">{battery.level}%</span>
          </div>
        )}

        {/* Active Media Playback Capsule */}
        {isConnected && playback.hasActiveSession && (
          <div className="flex items-center space-x-2 px-2 py-0.5 rounded-full bg-charcoal-800 border border-white/10 text-silver-200">
            <Music className="w-3 h-3 text-silver-300" />
            <span className="max-w-[110px] truncate text-[11px] font-medium text-silver-100">
              {playback.title}
            </span>
            <button
              onClick={() => mediaService.sendAction('toggle')}
              className="p-0.5 hover:text-white transition-colors"
              title={playback.isPlaying ? 'Pause' : 'Play'}
            >
              {playback.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => mediaService.sendAction('next')}
              className="p-0.5 hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Real Wi-Fi Indicator */}
        {isConnected && network ? (
          <div
            className="flex items-center space-x-1 text-silver-300 px-1.5 py-0.5 rounded hover:bg-charcoal-800 transition-colors"
            title={`Wi-Fi: ${network.ssid || 'Connected'} (${network.ipAddress})`}
          >
            <Wifi className="w-3.5 h-3.5 text-silver-200" />
          </div>
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-silver-500" />
        )}

        {/* Notification Bell */}
        <button
          onClick={() => useWindowStore.getState().toggleNotificationCenter()}
          className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors relative"
          title="Notification Center"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-silver-100 text-charcoal-950 font-mono text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Quick Settings Toggle */}
        <button
          onClick={() => toggleQuickSettings()}
          className={`p-1 rounded transition-colors ${
            isQuickSettingsOpen
              ? 'bg-charcoal-750 text-white border border-white/10'
              : 'text-silver-400 hover:text-white hover:bg-charcoal-800'
          }`}
          title="Quick Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-px bg-white/10" />

        {/* Window Controls */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => handleWindowAction('minimize')}
            className="w-6 h-6 flex items-center justify-center rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleWindowAction('maximize')}
            className="w-6 h-6 flex items-center justify-center rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => handleWindowAction('close')}
            className="w-6 h-6 flex items-center justify-center rounded text-silver-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
