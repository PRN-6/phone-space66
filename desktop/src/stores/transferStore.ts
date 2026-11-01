import { create } from 'zustand';

export interface FileTransferItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  direction: 'upload' | 'download';
  transferredBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  status: 'queued' | 'active' | 'completed' | 'cancelled' | 'failed';
  sha256?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

interface TransferState {
  transfers: FileTransferItem[];
  isTransferManagerOpen: boolean;

  addTransfer: (item: FileTransferItem) => void;
  updateTransfer: (id: string, updates: Partial<FileTransferItem>) => void;
  cancelTransfer: (id: string) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
  toggleTransferManager: (open?: boolean) => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  transfers: [],
  isTransferManagerOpen: false,

  addTransfer: (item) =>
    set((state) => ({
      transfers: [item, ...state.transfers],
      isTransferManagerOpen: true, // auto show transfer widget when transfer starts
    })),

  updateTransfer: (id, updates) =>
    set((state) => ({
      transfers: state.transfers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  cancelTransfer: (id) =>
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, status: 'cancelled' } : t
      ),
    })),

  removeTransfer: (id) =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      transfers: state.transfers.filter(
        (t) => t.status === 'active' || t.status === 'queued'
      ),
    })),

  toggleTransferManager: (open) =>
    set((state) => ({
      isTransferManagerOpen: open !== undefined ? open : !state.isTransferManagerOpen,
    })),
}));
