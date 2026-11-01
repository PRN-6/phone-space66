import { create } from 'zustand';
import { WindowId, WindowInstance } from '../types/window';

interface WindowManagerState {
  windows: WindowInstance[];
  activeWindowId: WindowId | null;
  maxZIndex: number;
  isLauncherOpen: boolean;
  isQuickSettingsOpen: boolean;

  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  maximizeWindow: (id: WindowId) => void;
  bringToFront: (id: WindowId) => void;
  updatePosition: (id: WindowId, x: number, y: number) => void;
  updateSize: (id: WindowId, width: number, height: number) => void;
  toggleLauncher: (open?: boolean) => void;
  toggleQuickSettings: (open?: boolean) => void;
}

const DEFAULT_WINDOW_CONFIGS: Record<WindowId, Omit<WindowInstance, 'isMinimized' | 'isMaximized' | 'zIndex'>> = {
  dashboard: {
    id: 'dashboard',
    title: 'Phone Diagnostics',
    icon: 'Activity',
    x: 80,
    y: 70,
    width: 680,
    height: 520,
    minWidth: 500,
    minHeight: 400,
  },
  'file-manager': {
    id: 'file-manager',
    title: 'Phone Storage Explorer',
    icon: 'Folder',
    x: 160,
    y: 100,
    width: 840,
    height: 540,
    minWidth: 600,
    minHeight: 400,
  },
  'screen-mirror': {
    id: 'screen-mirror',
    title: 'Screen Mirror',
    icon: 'Smartphone',
    x: 320,
    y: 60,
    width: 440,
    height: 680,
    minWidth: 360,
    minHeight: 500,
  },
  gallery: {
    id: 'gallery',
    title: 'Media Gallery',
    icon: 'Image',
    x: 180,
    y: 110,
    width: 780,
    height: 520,
    minWidth: 550,
    minHeight: 380,
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: 'Settings',
    x: 220,
    y: 120,
    width: 620,
    height: 480,
    minWidth: 500,
    minHeight: 360,
  },
  launcher: {
    id: 'launcher',
    title: 'Application Launcher',
    icon: 'Grid',
    x: 0,
    y: 0,
    width: 600,
    height: 400,
    minWidth: 400,
    minHeight: 300,
  },
  'pairing-dialog': {
    id: 'pairing-dialog',
    title: 'Device Pairing',
    icon: 'Shield',
    x: 300,
    y: 150,
    width: 480,
    height: 420,
    minWidth: 400,
    minHeight: 350,
  },
};

export const useWindowStore = create<WindowManagerState>((set, get) => ({
  windows: [
    {
      ...DEFAULT_WINDOW_CONFIGS.dashboard,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
    },
  ],
  activeWindowId: 'dashboard',
  maxZIndex: 10,
  isLauncherOpen: false,
  isQuickSettingsOpen: false,

  openWindow: (id) => {
    const { windows, maxZIndex } = get();
    const existing = windows.find((w) => w.id === id);
    const newZIndex = maxZIndex + 1;

    if (existing) {
      set({
        windows: windows.map((w) =>
          w.id === id ? { ...w, isMinimized: false, zIndex: newZIndex } : w
        ),
        activeWindowId: id,
        maxZIndex: newZIndex,
      });
    } else {
      const config = DEFAULT_WINDOW_CONFIGS[id] || {
        id,
        title: id,
        icon: 'AppWindow',
        x: 120,
        y: 80,
        width: 640,
        height: 480,
        minWidth: 400,
        minHeight: 300,
      };

      const newWindow: WindowInstance = {
        ...config,
        isMinimized: false,
        isMaximized: false,
        zIndex: newZIndex,
      };

      set({
        windows: [...windows, newWindow],
        activeWindowId: id,
        maxZIndex: newZIndex,
      });
    }
  },

  closeWindow: (id) => {
    set((state) => {
      const remaining = state.windows.filter((w) => w.id !== id);
      const nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      return {
        windows: remaining,
        activeWindowId: nextActive,
      };
    });
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  maximizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id === id) {
          if (w.isMaximized) {
            return {
              ...w,
              isMaximized: false,
              x: w.prevPosition?.x ?? w.x,
              y: w.prevPosition?.y ?? w.y,
              width: w.prevPosition?.width ?? w.width,
              height: w.prevPosition?.height ?? w.height,
            };
          } else {
            return {
              ...w,
              isMaximized: true,
              prevPosition: { x: w.x, y: w.y, width: w.width, height: w.height },
              x: 0,
              y: 36, // Below top status bar
              width: window.innerWidth,
              height: window.innerHeight - 36 - 64, // Above dock
            };
          }
        }
        return w;
      }),
    }));
  },

  bringToFront: (id) => {
    const { windows, maxZIndex } = get();
    const newZIndex = maxZIndex + 1;
    set({
      windows: windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false, zIndex: newZIndex } : w
      ),
      activeWindowId: id,
      maxZIndex: newZIndex,
    });
  },

  updatePosition: (id, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  },

  updateSize: (id, width, height) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    }));
  },

  toggleLauncher: (open) => {
    set((state) => ({ isLauncherOpen: open !== undefined ? open : !state.isLauncherOpen }));
  },

  toggleQuickSettings: (open) => {
    set((state) => ({ isQuickSettingsOpen: open !== undefined ? open : !state.isQuickSettingsOpen }));
  },
}));

