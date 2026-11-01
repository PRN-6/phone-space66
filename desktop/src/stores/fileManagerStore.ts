import { create } from 'zustand';
import { FileItem } from '../types/protocol';

interface FileManagerState {
  currentPath: string;
  parentPath: string | null;
  entries: FileItem[];
  history: string[];
  historyIndex: number;
  sortBy: 'name' | 'size' | 'date' | 'type';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  selectedPaths: string[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  previewFile: FileItem | null;
  isNewFolderModalOpen: boolean;
  isDeleteConfirmOpen: boolean;

  setCurrentDirectory: (path: string, parent: string | null, entries: FileItem[]) => void;
  navigateTo: (path: string) => void;
  navigateBack: () => string | null;
  navigateForward: () => string | null;
  setSort: (sortBy: 'name' | 'size' | 'date' | 'type', sortOrder?: 'asc' | 'desc') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSelect: (path: string, isMulti?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPreviewFile: (file: FileItem | null) => void;
  setIsNewFolderModalOpen: (open: boolean) => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
}

const DEFAULT_ROOT = '/storage/emulated/0';

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
  currentPath: DEFAULT_ROOT,
  parentPath: null,
  entries: [],
  history: [DEFAULT_ROOT],
  historyIndex: 0,
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'grid',
  selectedPaths: [],
  searchQuery: '',
  isLoading: false,
  error: null,
  previewFile: null,
  isNewFolderModalOpen: false,
  isDeleteConfirmOpen: false,

  setCurrentDirectory: (path, parent, entries) =>
    set({
      currentPath: path,
      parentPath: parent,
      entries,
      isLoading: false,
      error: null,
      selectedPaths: [],
    }),

  navigateTo: (path) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    set({
      currentPath: path,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isLoading: true,
      error: null,
      selectedPaths: [],
    });
  },

  navigateBack: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        currentPath: prev,
        historyIndex: historyIndex - 1,
        isLoading: true,
        selectedPaths: [],
      });
      return prev;
    }
    return null;
  },

  navigateForward: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      set({
        currentPath: next,
        historyIndex: historyIndex + 1,
        isLoading: true,
        selectedPaths: [],
      });
      return next;
    }
    return null;
  },

  setSort: (sortBy, sortOrder) => {
    set((state) => ({
      sortBy,
      sortOrder: sortOrder || (state.sortBy === sortBy && state.sortOrder === 'asc' ? 'desc' : 'asc'),
    }));
  },

  setViewMode: (viewMode) => set({ viewMode }),

  toggleSelect: (path, isMulti = false) => {
    set((state) => {
      if (!isMulti) {
        return { selectedPaths: state.selectedPaths.includes(path) ? [] : [path] };
      }
      if (state.selectedPaths.includes(path)) {
        return { selectedPaths: state.selectedPaths.filter((p) => p !== path) };
      } else {
        return { selectedPaths: [...state.selectedPaths, path] };
      }
    });
  },

  selectAll: () => {
    const { entries } = get();
    set({ selectedPaths: entries.map((e) => e.path) });
  },

  clearSelection: () => set({ selectedPaths: [] }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setPreviewFile: (previewFile) => set({ previewFile }),
  setIsNewFolderModalOpen: (isNewFolderModalOpen) => set({ isNewFolderModalOpen }),
  setIsDeleteConfirmOpen: (isDeleteConfirmOpen) => set({ isDeleteConfirmOpen }),
}));
