import { create } from 'zustand';

export type WallpaperThemeId =
  | 'obsidian-void'
  | 'orbital-hypr'
  | 'geometric-mesh'
  | 'carbon-matrix';

export interface WallpaperTheme {
  id: WallpaperThemeId;
  name: string;
  description: string;
}

export const WALLPAPER_THEMES: WallpaperTheme[] = [
  {
    id: 'obsidian-void',
    name: 'Obsidian Void',
    description: 'Deep matte black with subtle radial graphite and fine matrix grid',
  },
  {
    id: 'orbital-hypr',
    name: 'Orbital Hypr',
    description: 'Concentric silver and titanium orbital rings with monochrome branding',
  },
  {
    id: 'geometric-mesh',
    name: 'Geometric Mesh',
    description: 'Isometric architectural wireframe with subtle graphite facets',
  },
  {
    id: 'carbon-matrix',
    name: 'Carbon Matrix',
    description: 'Dark carbon weave pattern with soft overhead illumination',
  },
];

interface WallpaperState {
  currentTheme: WallpaperThemeId;
  customWallpaperUrl: string | null;
  setTheme: (theme: WallpaperThemeId) => void;
  setCustomWallpaper: (url: string | null) => void;
}

export const useWallpaperStore = create<WallpaperState>((set) => ({
  currentTheme: (localStorage.getItem('phonespace66_wallpaper') as WallpaperThemeId) || 'obsidian-void',
  customWallpaperUrl: localStorage.getItem('phonespace66_custom_wallpaper') || null,

  setTheme: (currentTheme) => {
    localStorage.setItem('phonespace66_wallpaper', currentTheme);
    set({ currentTheme, customWallpaperUrl: null });
  },

  setCustomWallpaper: (customWallpaperUrl) => {
    if (customWallpaperUrl) {
      localStorage.setItem('phonespace66_custom_wallpaper', customWallpaperUrl);
    } else {
      localStorage.removeItem('phonespace66_custom_wallpaper');
    }
    set({ customWallpaperUrl });
  },
}));
