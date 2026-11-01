import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Folder,
  Activity,
  Palette,
  RefreshCw,
  Settings,
  Minimize2,
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { webSocketService } from '../../services/webSocketService';

export const DesktopContextMenu: React.FC = () => {
  const { contextMenu, setContextMenu, openWindow, toggleLauncher, minimizeAll } = useWindowStore();

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const menuItems = [
    {
      label: 'Application Launcher',
      icon: <LayoutGrid className="w-3.5 h-3.5 text-silver-200" />,
      shortcut: 'Super',
      action: () => toggleLauncher(true),
    },
    {
      label: 'Phone File Manager',
      icon: <Folder className="w-3.5 h-3.5 text-silver-300" />,
      shortcut: 'Super+E',
      action: () => openWindow('file-manager'),
    },
    {
      label: 'Device Diagnostics',
      icon: <Activity className="w-3.5 h-3.5 text-silver-200" />,
      shortcut: 'Super+D',
      action: () => openWindow('dashboard'),
    },
    {
      label: 'Change Wallpaper',
      icon: <Palette className="w-3.5 h-3.5 text-silver-300" />,
      action: () => openWindow('settings'),
    },
    {
      label: 'Refresh Phone Telemetry',
      icon: <RefreshCw className="w-3.5 h-3.5 text-silver-400" />,
      action: () => webSocketService.requestDeviceInfo(),
    },
    {
      label: 'Show Desktop',
      icon: <Minimize2 className="w-3.5 h-3.5 text-silver-400" />,
      action: () => minimizeAll(),
    },
    {
      label: 'Settings',
      icon: <Settings className="w-3.5 h-3.5 text-silver-400" />,
      action: () => openWindow('settings'),
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          left: `${Math.min(window.innerWidth - 220, contextMenu.x)}px`,
          top: `${Math.min(window.innerHeight - 260, contextMenu.y)}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-50 w-56 bg-charcoal-900 border border-white/10 rounded-xl shadow-2xl p-1.5 text-xs text-silver-200 select-none backdrop-blur-xl"
      >
        {menuItems.map((item, idx) => (
          <React.Fragment key={item.label}>
            <button
              onClick={() => {
                item.action();
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-charcoal-800 text-silver-300 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center space-x-2">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-[10px] text-silver-500 font-mono">{item.shortcut}</span>
              )}
            </button>
            {idx === 2 && <div className="h-px bg-white/5 my-1" />}
            {idx === 5 && <div className="h-px bg-white/5 my-1" />}
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
