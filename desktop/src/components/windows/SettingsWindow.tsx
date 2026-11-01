import React, { useState } from 'react';
import {
  Palette,
  Wifi,
  Keyboard,
  Info,
  Trash2,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useWallpaperStore, WALLPAPER_THEMES, WallpaperThemeId } from '../../stores/wallpaperStore';

export const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'connection' | 'shortcuts' | 'about'>('appearance');
  const { authToken, setAuthToken, disconnect } = useConnectionStore();
  const { currentTheme, setTheme, customWallpaperUrl, setCustomWallpaper } = useWallpaperStore();
  const [customInput, setCustomInput] = useState(customWallpaperUrl || '');

  const shortcuts = [
    { key: 'Super / Meta', desc: 'Open Application Launcher' },
    { key: 'Super + Tab', desc: 'Task Switcher (Cycle Open Windows)' },
    { key: 'Super + D', desc: 'Toggle Phone Diagnostics' },
    { key: 'Super + E', desc: 'Open Phone File Explorer' },
    { key: 'Right Click', desc: 'Open Desktop Context Menu' },
    { key: 'Escape', desc: 'Close Active Modal / Launcher' },
  ];

  const handleCustomWallpaperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      setCustomWallpaper(customInput.trim());
    }
  };

  return (
    <div className="h-full flex select-none text-silver-200 bg-charcoal-950">
      {/* Settings Navigation */}
      <div className="w-44 bg-charcoal-900 border-r border-white/10 p-3 space-y-1 text-xs shrink-0">
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
      <div className="flex-1 p-6 overflow-y-auto text-xs space-y-6">
        {activeTab === 'appearance' && (
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-sm text-white">Desktop Wallpaper Themes</h3>
              <p className="text-silver-400 text-xs mt-0.5">
                Select your preferred monochrome gray and black desktop environment aesthetic.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {WALLPAPER_THEMES.map((theme) => {
                const isSelected = currentTheme === theme.id && !customWallpaperUrl;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-charcoal-800 border-2 border-white shadow-glow-subtle'
                        : 'bg-charcoal-900 border-white/5 hover:border-white/20 hover:bg-charcoal-850'
                    }`}
                  >
                    <div className="h-16 rounded-lg bg-charcoal-950 border border-white/10 mb-2.5 flex items-center justify-center relative overflow-hidden">
                      <div className="w-6 h-6 rounded-full border border-white/20" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-0.5 rounded-full bg-white text-charcoal-950">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-white">{theme.name}</div>
                    <div className="text-[11px] text-silver-400 mt-0.5">{theme.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Custom Wallpaper URL */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="font-semibold text-white text-xs block">Custom Wallpaper Image</span>
              <form onSubmit={handleCustomWallpaperSubmit} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="https://... or image data URL"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-charcoal-950 border border-white/10 rounded-xl text-xs text-white placeholder-silver-600 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={!customInput.trim()}
                  className="px-4 py-2 bg-charcoal-800 hover:bg-charcoal-750 border border-white/10 rounded-xl text-xs font-semibold text-silver-200"
                >
                  Apply
                </button>
                {customWallpaperUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomWallpaper(null);
                      setCustomInput('');
                    }}
                    className="px-3 py-2 bg-charcoal-800 hover:bg-neutral-800 rounded-xl text-xs text-silver-400"
                  >
                    Reset
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

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
