import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Folder,
  Smartphone,
  Image,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { WindowId } from '../../types/window';

export const WindowSwitcherModal: React.FC = () => {
  const { windows, isWindowSwitcherOpen, switcherIndex, bringToFront, toggleWindowSwitcher } = useWindowStore();

  const openWindows = windows.filter((w) => !w.isMinimized);

  if (!isWindowSwitcherOpen || openWindows.length === 0) return null;

  const getIcon = (id: WindowId) => {
    switch (id) {
      case 'dashboard':
        return <Activity className="w-8 h-8 text-silver-100" />;
      case 'file-manager':
        return <Folder className="w-8 h-8 text-silver-200" />;
      case 'screen-mirror':
        return <Smartphone className="w-8 h-8 text-silver-100" />;
      case 'gallery':
        return <Image className="w-8 h-8 text-silver-300" />;
      case 'settings':
        return <Settings className="w-8 h-8 text-silver-400" />;
      default:
        return <Layers className="w-8 h-8 text-silver-300" />;
    }
  };

  const handleSelect = (idx: number) => {
    const win = openWindows[idx];
    if (win) {
      bringToFront(win.id);
      toggleWindowSwitcher(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md select-none"
        onClick={() => toggleWindowSwitcher(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-charcoal-900 border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center space-x-3 text-silver-200"
          onClick={(e) => e.stopPropagation()}
        >
          {openWindows.map((win, idx) => {
            const isSelected = idx === switcherIndex;
            return (
              <div
                key={win.id}
                onClick={() => handleSelect(idx)}
                className={`w-36 h-28 p-3 rounded-xl flex flex-col items-center justify-between text-center cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-charcoal-800 border-2 border-white text-white shadow-glow-subtle'
                    : 'bg-charcoal-850 border border-white/5 text-silver-400 hover:bg-charcoal-800 hover:text-silver-200'
                }`}
              >
                <div className="my-auto">{getIcon(win.id)}</div>
                <span className="text-[11px] font-semibold truncate w-full">{win.title}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
