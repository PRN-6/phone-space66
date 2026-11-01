import React, { useEffect } from 'react';
import { Wallpaper } from './Wallpaper';
import { TopStatusBar } from './TopStatusBar';
import { Dock } from './Dock';
import { QuickSettings } from './QuickSettings';
import { PairingModal } from './PairingModal';
import { LauncherModal } from '../windows/LauncherModal';
import { TransferManagerWindow } from '../windows/TransferManagerWindow';
import { NotificationCenter } from './NotificationCenter';
import { DesktopContextMenu } from './DesktopContextMenu';
import { WindowSwitcherModal } from './WindowSwitcherModal';
import { WindowFrame } from '../windows/WindowFrame';
import { DeviceDashboardWindow } from '../windows/DeviceDashboardWindow';
import { FileManagerWindow } from '../windows/FileManagerWindow';
import { ScreenMirrorWindow } from '../windows/ScreenMirrorWindow';
import { SettingsWindow } from '../windows/SettingsWindow';
import { GalleryWindow } from '../windows/GalleryWindow';
import { useWindowStore } from '../../stores/windowStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { discoveryService } from '../../services/discoveryService';

export const DesktopEnvironment: React.FC = () => {
  const {
    windows,
    snapPreview,
    toggleLauncher,
    openWindow,
    toggleQuickSettings,
    toggleNotificationCenter,
    toggleWindowSwitcher,
    cycleWindow,
    isWindowSwitcherOpen,
    setContextMenu,
  } = useWindowStore();
  const { setShowPairingModal } = useConnectionStore();

  useEffect(() => {
    // Start background mDNS LAN device discovery
    discoveryService.startDiscovery();

    // Global Desktop Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close active overlays
      if (e.key === 'Escape') {
        toggleLauncher(false);
        toggleQuickSettings(false);
        toggleNotificationCenter(false);
        setShowPairingModal(false);
        setContextMenu(null);
        toggleWindowSwitcher(false);
        return;
      }

      // Alt + Tab or Super + Tab: Window Task Switcher
      if ((e.altKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        if (!isWindowSwitcherOpen) {
          toggleWindowSwitcher(true);
        } else {
          cycleWindow(!e.shiftKey);
        }
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

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.key === 'Meta') {
        if (isWindowSwitcherOpen) {
          toggleWindowSwitcher(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      discoveryService.stopDiscovery();
    };
  }, [
    toggleLauncher,
    openWindow,
    toggleQuickSettings,
    toggleNotificationCenter,
    setShowPairingModal,
    setContextMenu,
    isWindowSwitcherOpen,
    toggleWindowSwitcher,
    cycleWindow,
  ]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

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
        return <GalleryWindow />;
      default:
        return <DeviceDashboardWindow />;
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className="relative w-screen h-screen overflow-hidden bg-charcoal-950 font-sans select-none"
    >
      {/* Dynamic Wallpaper */}
      <Wallpaper />

      {/* Top Status Bar */}
      <TopStatusBar />

      {/* Snap Ghost Preview Outline */}
      {snapPreview && (
        <div
          style={{
            transform: `translate3d(${snapPreview.x}px, ${snapPreview.y}px, 0)`,
            width: `${snapPreview.width}px`,
            height: `${snapPreview.height}px`,
          }}
          className="fixed top-0 left-0 bg-charcoal-800/40 border-2 border-white/30 rounded-2xl pointer-events-none transition-all duration-150 z-30 shadow-glow-subtle backdrop-blur-[2px]"
        />
      )}

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

      {/* Overlays, Drawers & Modals */}
      <QuickSettings />
      <NotificationCenter />
      <PairingModal />
      <LauncherModal />
      <TransferManagerWindow />
      <DesktopContextMenu />
      <WindowSwitcherModal />
    </div>
  );
};
