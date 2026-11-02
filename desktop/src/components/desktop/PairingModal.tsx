import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Shield,
  Radio,
  X,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Zap,
} from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';
import { webSocketService } from '../../services/webSocketService';
import { discoveryService } from '../../services/discoveryService';
import { DiscoveredDevice } from '../../types/protocol';

export const PairingModal: React.FC = () => {
  const {
    showPairingModal,
    setShowPairingModal,
    status,
    discoveredDevices,
    error,
    manualIp,
    setManualIp,
  } = useConnectionStore();

  const [pinInput, setPinInput] = useState('');

  if (!showPairingModal) return null;

  const handleConnect = (device: DiscoveredDevice) => {
    webSocketService.connect(device);
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;

    let ip = manualIp.trim();
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

    handleConnect(device);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim().length === 6) {
      webSocketService.submitPairingPin(pinInput.trim());
    }
  };

  const isPairing = status === 'pairing';
  const isConnecting = status === 'connecting';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-charcoal-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-silver-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-charcoal-850">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-charcoal-800 border border-white/10">
                <Shield className="w-5 h-5 text-silver-200" />
              </div>
              <div>
                <h3 className="font-semibold text-silver-100 text-sm">Connect PHONE SPACE66</h3>
                <p className="text-[11px] text-silver-400">
                  Secure peer-to-peer LAN connection
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPairingModal(false)}
              className="p-1 rounded-lg text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-charcoal-800 border border-white/10 text-silver-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-silver-400" />
                <span>{error}</span>
              </div>
            )}

            {/* If actively in pairing PIN challenge mode */}
            {isPairing ? (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-charcoal-800 border border-white/15 flex items-center justify-center mx-auto mb-3 text-silver-100 shadow-glow-subtle">
                    <KeyRound className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-semibold text-silver-100 text-base">Enter Verification PIN</h4>
                  <p className="text-xs text-silver-400 mt-1 max-w-xs mx-auto">
                    Check your phone screen for the 6-digit pairing code and tap "Approve".
                  </p>
                </div>

                <form onSubmit={handleVerifyPin} className="space-y-4">
                  <div className="flex justify-center">
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="000000"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-52 text-center text-3xl font-mono tracking-[0.4em] px-4 py-3 bg-charcoal-950 border border-white/20 rounded-xl text-white placeholder-charcoal-600 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => webSocketService.disconnect()}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-charcoal-800 text-xs font-medium text-silver-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pinInput.length !== 6}
                      className="flex-1 py-2.5 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 border border-white/20 hover:border-white/35 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-silver-100 hover:text-white flex items-center justify-center space-x-2 transition-all"
                    >
                      <span>Authorize Pairing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* Wired USB Wire (Plug & Play - No App Needed) */}
                <div className="p-3.5 rounded-xl bg-charcoal-850 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-charcoal-800 flex items-center justify-center text-silver-100">
                      <Zap className="w-5 h-5 text-silver-300" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Plugged in with USB Wire?</div>
                      <div className="text-[11px] text-silver-400">Select &quot;File Transfer&quot; (MTP) on phone</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => discoveryService.probeAddress('127.0.0.1', 6655)}
                    className="px-3.5 py-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-white/20 text-silver-100 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-silver-300" />
                    <span>Mount Storage</span>
                  </button>
                </div>

                {/* Discovered Devices List */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono">
                      Discovered Phones on LAN
                    </span>
                    <span className="flex items-center space-x-1.5 text-[11px] text-silver-400">
                      <Radio className="w-3 h-3 animate-ping text-silver-300" />
                      <span>Scanning mDNS...</span>
                    </span>
                  </div>

                  {discoveredDevices.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {discoveredDevices.map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-charcoal-850 border border-white/5 hover:border-white/15 hover:bg-charcoal-800 transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-lg bg-charcoal-750 flex items-center justify-center text-silver-200">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-silver-100">
                                {device.name}
                              </div>
                              <div className="text-[11px] text-silver-500 font-mono">
                                {device.ipAddress}:{device.port}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleConnect(device)}
                            disabled={isConnecting}
                            className="px-3.5 py-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-white/15 hover:border-white/30 text-silver-100 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-60"
                          >
                            <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-charcoal-850 border border-white/5 text-center text-xs text-silver-400">
                      Searching for active PHONE SPACE66 Companion on your Wi-Fi or phone hotspot...
                    </div>
                  )}
                </div>

                {/* Web Companion (Zero-Install Browser Mode) */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-silver-300 font-mono flex items-center space-x-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-silver-400" />
                      <span>Zero-Install Phone Mode (No APK Needed)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-800 text-silver-300 border border-white/10">
                      Browser
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-charcoal-950 border border-white/10 text-xs">
                    <p className="text-silver-400 text-[11px] mb-2">
                      Open this link on your phone's browser (Chrome/Safari) while on the same Wi-Fi:
                    </p>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-charcoal-900 border border-white/5 font-mono text-silver-200 text-xs select-all">
                      <span>http://{window.location.hostname || '10.183.255.53'}:1420/?mobile=1</span>
                    </div>
                  </div>
                </div>

                {/* Manual IP Fallback & Simulator Connect */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-silver-400 font-mono">
                      Or Connect via IP Address
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setManualIp('127.0.0.1:6655');
                        const device: DiscoveredDevice = {
                          id: '127.0.0.1:6655',
                          name: 'Simulated Phone (Localhost)',
                          model: 'Pixel 8 Pro (Simulated)',
                          manufacturer: 'Google',
                          ipAddress: '127.0.0.1',
                          port: 6655,
                          protocolVersion: 1,
                          lastSeen: Date.now(),
                        };
                        handleConnect(device);
                      }}
                      className="text-[11px] font-mono text-silver-400 hover:text-white underline"
                    >
                      Use Local Simulator (127.0.0.1)
                    </button>
                  </div>

                  <form onSubmit={handleManualConnect} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. 192.168.43.1 or 10.183.255.xxx"
                      value={manualIp}
                      onChange={(e) => setManualIp(e.target.value)}
                      className="flex-1 px-3 py-2 bg-charcoal-950 border border-white/10 rounded-xl text-xs text-silver-100 placeholder-silver-500 focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="submit"
                      disabled={!manualIp.trim() || isConnecting}
                      className="px-4 py-2 bg-charcoal-800 hover:bg-charcoal-750 hover:text-white border border-white/10 disabled:opacity-50 text-xs font-medium rounded-xl transition-colors text-silver-200"
                    >
                      Connect
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
