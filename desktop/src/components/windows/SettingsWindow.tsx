import React, { useState } from 'react';
import {
  Palette,
  Wifi,
  Keyboard,
  Info,
  Trash2,
} from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';

export const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'connection' | 'shortcuts' | 'about'>('connection');
  const { authToken, setAuthToken, disconnect } = useConnectionStore();

  const shortcuts = [
    { key: 'Super / Meta', desc: 'Open Application Launcher' },
    { key: 'Super + D', desc: 'Toggle Device Diagnostics' },
    { key: 'Super + E', desc: 'Open Phone File Explorer' },
    { key: 'Super + Tab', desc: 'Switch Active Windows' },
    { key: 'Escape', desc: 'Close Active Modal / Launcher' },
  ];

  return (
    <div className="h-full flex select-none text-silver-200 bg-charcoal-950">
      {/* Settings Navigation */}
      <div className="w-44 bg-charcoal-900 border-r border-white/10 p-3 space-y-1 text-xs">
        <button
          onClick={() => setActiveTab('connection')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
            activeTab === 'connection'
              ? 'bg-charcoal-800 text-white font-semibold border border-white/10'
              : 'text-silver-400 hover:bg-charcoal-850 hover:text-silver-200'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Connection</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
            activeTab === 'appearance'
              ? 'bg-charcoal-800 text-white font-semibold border border-white/10'
              : 'text-silver-400 hover:bg-charcoal-850 hover:text-silver-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('shortcuts')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
            activeTab === 'shortcuts'
              ? 'bg-charcoal-800 text-white font-semibold border border-white/10'
              : 'text-silver-400 hover:bg-charcoal-850 hover:text-silver-200'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Shortcuts</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
            activeTab === 'about'
              ? 'bg-charcoal-800 text-white font-semibold border border-white/10'
              : 'text-silver-400 hover:bg-charcoal-850 hover:text-silver-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>About</span>
        </button>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 p-6 overflow-y-auto text-xs space-y-5">
        {activeTab === 'connection' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white">LAN & Pairing Settings</h3>
            <p className="text-silver-400">
              PHONE SPACE66 communicates peer-to-peer over your local network. No external cloud servers are used.
            </p>

            <div className="p-4 rounded-xl bg-charcoal-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-silver-100">Saved Pair Token</div>
                  <div className="text-[11px] text-silver-400 font-mono mt-0.5">
                    {authToken ? `${authToken.substring(0, 16)}...` : 'No active token'}
                  </div>
                </div>

                {authToken && (
                  <button
                    onClick={() => {
                      setAuthToken(null);
                      disconnect();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-charcoal-800 text-silver-300 border border-white/10 hover:bg-neutral-800 hover:text-white flex items-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke Token</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white">Appearance & Theme</h3>
            <p className="text-silver-400">
              Ultra-minimalist monochrome gray and black operating environment.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-charcoal-900 border-2 border-white/30 cursor-pointer shadow-glow-subtle">
                <div className="h-12 rounded bg-charcoal-950 mb-2 border border-white/10 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-silver-200" />
                </div>
                <span className="font-medium text-white">Obsidian & Gray (Active)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white">Desktop Keyboard Shortcuts</h3>
            <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-charcoal-900 overflow-hidden">
              {shortcuts.map((sc) => (
                <div key={sc.key} className="flex items-center justify-between p-3">
                  <span className="text-silver-300">{sc.desc}</span>
                  <kbd className="px-2 py-1 rounded bg-charcoal-950 border border-white/10 font-mono text-[11px] text-silver-200">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4 text-center py-6">
            <img src="/logo.svg" alt="PHONE SPACE66" className="w-16 h-16 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white tracking-wider">PHONE SPACE66</h2>
            <div className="text-silver-400 font-mono text-xs">Version 0.1.0 • Desktop Edition</div>
            <p className="text-silver-400 max-w-sm mx-auto">
              Your Phone. Your Space. Your Desktop.
              <br />
              An Android-powered virtual desktop environment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
