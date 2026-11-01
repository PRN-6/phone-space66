import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Activity,
  Folder,
  Smartphone,
  Image,
  Settings,
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { WindowId } from '../../types/window';

export const LauncherModal: React.FC = () => {
  const { isLauncherOpen, toggleLauncher, openWindow } = useWindowStore();
  const [search, setSearch] = useState('');

  if (!isLauncherOpen) return null;

  const apps = [
    {
      id: 'dashboard' as WindowId,
      name: 'Phone Diagnostics',
      desc: 'Real-time battery, storage, and hardware telemetry',
      icon: <Activity className="w-6 h-6 text-silver-100" />,
    },
    {
      id: 'file-manager' as WindowId,
      name: 'Storage Explorer',
      desc: 'KDE Dolphin-inspired phone file manager',
      icon: <Folder className="w-6 h-6 text-silver-200" />,
    },
    {
      id: 'screen-mirror' as WindowId,
      name: 'Screen Mirror',
      desc: 'Live Android screen mirror and remote touch',
      icon: <Smartphone className="w-6 h-6 text-silver-100" />,
    },
    {
      id: 'gallery' as WindowId,
      name: 'Media Gallery',
      desc: 'Browse photos and videos stored on phone',
      icon: <Image className="w-6 h-6 text-silver-200" />,
    },
    {
      id: 'settings' as WindowId,
      name: 'System Settings',
      desc: 'Configure appearance, connection, and shortcuts',
      icon: <Settings className="w-6 h-6 text-silver-300" />,
    },
  ];

  const filtered = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.desc.toLowerCase().includes(search.toLowerCase())
  );

  const handleLaunch = (id: WindowId) => {
    openWindow(id);
    toggleLauncher(false);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-24 pb-12 px-4 bg-black/85 backdrop-blur-md select-none"
        onClick={() => toggleLauncher(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-charcoal-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Search Header */}
          <div className="p-4 border-b border-white/10 flex items-center space-x-3 bg-charcoal-850">
            <Search className="w-5 h-5 text-silver-300" />
            <input
              type="text"
              autoFocus
              placeholder="Type to search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm text-silver-100 placeholder-silver-500 focus:outline-none"
            />
            <kbd className="px-2 py-0.5 rounded bg-charcoal-950 border border-white/10 text-[10px] text-silver-400 font-mono">
              ESC
            </kbd>
          </div>

          {/* Application Grid */}
          <div className="p-4 grid grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto">
            {filtered.map((app) => (
              <div
                key={app.id}
                onClick={() => handleLaunch(app.id)}
                className="flex items-center space-x-3.5 p-3 rounded-xl bg-charcoal-850 border border-white/5 hover:border-white/20 hover:bg-charcoal-800 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-charcoal-750 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-silver-100 group-hover:text-white transition-colors">
                    {app.name}
                  </div>
                  <div className="text-[11px] text-silver-400 truncate mt-0.5">
                    {app.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
