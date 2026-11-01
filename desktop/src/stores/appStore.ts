import { create } from 'zustand';
import { AppInfo } from '../types/protocol';

export type AppCategory = 'all' | 'favorites' | 'recent' | 'system';

export interface LaunchStatus {
  packageName: string;
  appName: string;
  status: 'launching' | 'success' | 'error';
  message?: string;
  timestamp: number;
}

interface AppStoreState {
  apps: AppInfo[];
  isLoading: boolean;
  error: string | null;
  favorites: string[];
  recentApps: { packageName: string; launchedAt: number }[];
  activeCategory: AppCategory;
  searchQuery: string;
  launchStatus: LaunchStatus | null;
  selectedAppForDetails: AppInfo | null;
  includeSystemApps: boolean;

  setApps: (apps: AppInfo[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  toggleFavorite: (packageName: string) => void;
  addRecentApp: (packageName: string) => void;
  setActiveCategory: (cat: AppCategory) => void;
  setSearchQuery: (query: string) => void;
  setIncludeSystemApps: (include: boolean) => void;
  setLaunchStatus: (status: LaunchStatus | null) => void;
  setSelectedAppForDetails: (app: AppInfo | null) => void;
}

const FAVORITES_STORAGE_KEY = 'phonespace66_fav_apps';
const RECENTS_STORAGE_KEY = 'phonespace66_recent_apps';

function loadFavoritesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadRecentsFromStorage(): { packageName: string; launchedAt: number }[] {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useAppStore = create<AppStoreState>((set) => ({
  apps: [],
  isLoading: false,
  error: null,
  favorites: loadFavoritesFromStorage(),
  recentApps: loadRecentsFromStorage(),
  activeCategory: 'all',
  searchQuery: '',
  launchStatus: null,
  selectedAppForDetails: null,
  includeSystemApps: false,

  setApps: (apps) => set({ apps, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  toggleFavorite: (packageName) =>
    set((state) => {
      const exists = state.favorites.includes(packageName);
      const nextFavorites = exists
        ? state.favorites.filter((p) => p !== packageName)
        : [...state.favorites, packageName];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
      } catch (err) {
        console.warn('Failed to persist favorite apps:', err);
      }
      return { favorites: nextFavorites };
    }),

  addRecentApp: (packageName) =>
    set((state) => {
      const filtered = state.recentApps.filter((r) => r.packageName !== packageName);
      const nextRecents = [{ packageName, launchedAt: Date.now() }, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(nextRecents));
      } catch (err) {
        console.warn('Failed to persist recent apps:', err);
      }
      return { recentApps: nextRecents };
    }),

  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIncludeSystemApps: (includeSystemApps) => set({ includeSystemApps }),
  setLaunchStatus: (launchStatus) => set({ launchStatus }),
  setSelectedAppForDetails: (selectedAppForDetails) => set({ selectedAppForDetails }),
}));
