import React, { useEffect } from 'react';
import { Wallpaper } from './Wallpaper';
import { TopStatusBar } from './TopStatusBar';
import { Dock } from './Dock';
import { QuickSettings } from './QuickSettings';
import { PairingModal } from './PairingModal';
import { LauncherModal } from '../windows/LauncherModal';
import { WindowFrame } from '../windows/WindowFrame';
import { DeviceDashboardWindow } from '../windows/DeviceDashboardWindow';
import { FileManagerWindow } from '../windows/FileManagerWindow';
import { ScreenMirrorWindow } from '../windows/ScreenMirrorWindow';
import { SettingsWindow } from '../windows/SettingsWindow';
import { useWindowStore } from '../../stores/windowStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { discoveryService } from '../../services/discoveryService';

export const DesktopEnvironment: React.FC = () => {
  const { windows, toggleLauncher, openWindow, toggleQuickSettings } = useWindowStore();
  const { setShowPairingModal } = useConnectionStore();

  useEffect(() => {
    // Start background mDNS LAN device discovery on boot
    discoveryService.startDiscovery();

    // Global Desktop Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close modals
      if (e.key === 'Escape') {
        toggleLauncher(false);
        toggleQuickSettings(false);
        setShowPairingModal(false);
        return;
      }

      // Super / Meta key or Alt+Space -> App Launcher
      if (e.key === 'Meta' || (e.altKey && e.code === 'Space')) {
        e.preventDefault();
        toggleLauncher();
        return;
      }

      // Meta + E -> File Manager
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        openWindow('file-manager');
        return;
      }

      // Meta + D -> Diagnostics
      if ((e.metaKey || e.altKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        openWindow('dashboard');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      discoveryService.stopDiscovery();
    };
  }, [toggleLauncher, openWindow, toggleQuickSettings, setShowPairingModal]);

  const renderWindowContent = (id: string) => {
    switch (id) {
      case 'dashboard':
        return <DeviceDashboardWindow />;
      case 'file-manager':
        return <FileManagerWindow />;
      case 'screen-mirror':
        return <ScreenMirrorWindow />;
      case 'settings':
        return <SettingsWindow />;
      case 'gallery':
        return <FileManagerWindow />;
      default:
        return <DeviceDashboardWindow />;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-charcoal-950 font-sans select-none">
      {/* Dynamic Wallpaper */}
      <Wallpaper />

      {/* Top Status Bar */}
      <TopStatusBar />

      {/* Window Manager Workspace Canvas */}
      <main className="absolute inset-0 pt-9 pb-16 overflow-hidden pointer-events-none">
        {windows.map((win) => (
          <div key={win.id} className="pointer-events-auto">
            <WindowFrame window={win}>{renderWindowContent(win.id)}</WindowFrame>
          </div>
        ))}
      </main>

      {/* Bottom Dock */}
      <Dock />

      {/* Flyouts & Overlays */}
      <QuickSettings />
      <PairingModal />
      <LauncherModal />
    </div>
  );
};

