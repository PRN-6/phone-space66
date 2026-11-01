import { create } from 'zustand';
import { GalleryItem } from '../types/protocol';

export type GalleryCategory = 'all' | 'camera' | 'screenshots' | 'videos';

interface GalleryState {
  items: GalleryItem[];
  category: GalleryCategory;
  selectedItem: GalleryItem | null;
  isLoading: boolean;
  error: string | null;

  setItems: (items: GalleryItem[]) => void;
  setCategory: (category: GalleryCategory) => void;
  setSelectedItem: (item: GalleryItem | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  items: [],
  category: 'all',
  selectedItem: null,
  isLoading: false,
  error: null,

  setItems: (items) => set({ items, isLoading: false, error: null }),
  setCategory: (category) => set({ category }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

