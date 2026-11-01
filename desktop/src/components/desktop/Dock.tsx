import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Activity,
  Folder,
  Smartphone,
  Image,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { WindowId } from '../../types/window';

interface DockItem {
  id: WindowId | 'launcher';
  label: string;
  icon: React.ReactNode;
  action: () => void;
  isOpen: boolean;
  isActive: boolean;
}

export const Dock: React.FC = () => {
  const { windows, activeWindowId, openWindow, toggleLauncher, isLauncherOpen } = useWindowStore();
  const { setShowPairingModal, status } = useConnectionStore();

  const isWindowOpen = (id: WindowId) => windows.some((w) => w.id === id && !w.isMinimized);

  const dockItems: DockItem[] = [
    {
      id: 'launcher',
      label: 'Applications',
      icon: <LayoutGrid className="w-5 h-5 text-silver-100" />,
      action: () => toggleLauncher(),
      isOpen: isLauncherOpen,
      isActive: isLauncherOpen,
    },
    {
      id: 'dashboard',
      label: 'Phone Diagnostics',
      icon: <Activity className="w-5 h-5 text-silver-200" />,
      action: () => openWindow('dashboard'),
      isOpen: isWindowOpen('dashboard'),
      isActive: activeWindowId === 'dashboard',
    },
    {
      id: 'file-manager',
      label: 'File Manager',
      icon: <Folder className="w-5 h-5 text-silver-300" />,
      action: () => openWindow('file-manager'),
      isOpen: isWindowOpen('file-manager'),
      isActive: activeWindowId === 'file-manager',
    },
    {
      id: 'screen-mirror',
      label: 'Screen Mirror',
      icon: <Smartphone className="w-5 h-5 text-silver-200" />,
      action: () => openWindow('screen-mirror'),
      isOpen: isWindowOpen('screen-mirror'),
      isActive: activeWindowId === 'screen-mirror',
    },
    {
      id: 'gallery',
      label: 'Media Gallery',
      icon: <Image className="w-5 h-5 text-silver-300" />,
      action: () => openWindow('gallery'),
      isOpen: isWindowOpen('gallery'),
      isActive: activeWindowId === 'gallery',
    },
    {
      id: 'pairing-dialog',
      label: 'Pair Phone',
      icon: <ShieldCheck className="w-5 h-5 text-silver-100" />,
      action: () => setShowPairingModal(true),
      isOpen: status === 'pairing',
      isActive: status === 'pairing',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 text-silver-400" />,
      action: () => openWindow('settings'),
      isOpen: isWindowOpen('settings'),
      isActive: activeWindowId === 'settings',
    },
  ];

  return (
    <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 select-none">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center space-x-1.5 px-3 py-2 bg-charcoal-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-dock"
      >
        {dockItems.map((item) => (
          <div key={item.id} className="relative group flex flex-col items-center">
            {/* Tooltip */}
            <div className="absolute -top-9 px-2.5 py-1 bg-charcoal-800/95 border border-white/10 rounded-md text-[11px] font-medium text-silver-200 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
              {item.label}
            </div>

            {/* Icon Button */}
            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={item.action}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                item.isActive
                  ? 'bg-charcoal-750 border border-white/20 shadow-glow-subtle'
                  : 'bg-charcoal-850 border border-white/5 hover:bg-charcoal-800 hover:border-white/15'
              }`}
            >
              {item.icon}
            </motion.button>

            {/* Active Indicator Dot */}
            <div
              className={`w-1 h-1 rounded-full mt-1 transition-all ${
                item.isOpen ? 'bg-silver-100 shadow-[0_0_6px_#FFFFFF]' : 'bg-transparent'
              }`}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
};
