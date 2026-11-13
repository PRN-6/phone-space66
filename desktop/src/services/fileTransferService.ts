import { useFileManagerStore } from '../stores/fileManagerStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useTransferStore, FileTransferItem } from '../stores/transferStore';
import { IStorageProvider } from './storage/StorageProvider';
import { MtpStorageProvider } from './storage/MtpStorageProvider';
import { CompanionStorageProvider } from './storage/CompanionStorageProvider';
import { AdbStorageProvider } from './storage/AdbStorageProvider';
import { MockStorageProvider } from './storage/MockStorageProvider';
import {
  FileItem,
  FileOperationResponsePayload,
  StorageListResponsePayload,
} from '../types/protocol';

class FileTransferService {
  private mtpProvider = new MtpStorageProvider();
  private companionProvider = new CompanionStorageProvider();
  private adbProvider = new AdbStorageProvider();
  private mockProvider = new MockStorageProvider(false);
  private activeControllers = new Map<string, AbortController>();

  getActiveProvider(): IStorageProvider {
    const connMode = useConnectionStore.getState().connectionMode;
    const activeTransport = useConnectionStore.getState().activeTransport;

    if (this.mockProvider.isAvailable()) {
      return this.mockProvider;
    }

    if (activeTransport === 'mtp' || connMode === 'usb') {
      return this.mtpProvider;
    }

    if (activeTransport === 'companion') {
      if (this.companionProvider.isAvailable()) {
        return this.companionProvider;
      }
    }

    if (activeTransport === 'adb' && this.adbProvider.isAvailable()) {
      return this.adbProvider;
    }

    // Default to MTP provider for USB wire mode
    return this.mtpProvider;
  }

  setDemoMode(enabled: boolean) {
    this.mockProvider.setDemoMode(enabled);
  }

  // -------------------------------------------------------------
  // Directory & File Browsing
  // -------------------------------------------------------------

  async fetchDirectory(
    path: string,
    sortBy?: 'name' | 'size' | 'date' | 'type',
    sortOrder?: 'asc' | 'desc'
  ) {
    useFileManagerStore.getState().setIsLoading(true);

    const provider = this.getActiveProvider();
    const result = await provider.fetchDirectory(path, { sortBy, sortOrder });

    useFileManagerStore.getState().setCurrentDirectory(
      result.currentPath,
      result.parentPath,
      result.entries,
      result.storageState,
      result.message
    );
  }

  handleStorageListResponse(payload: StorageListResponsePayload) {
    useFileManagerStore.getState().setCurrentDirectory(
      payload.currentPath,
      payload.parentPath,
      payload.entries,
      payload.storageState || 'READY',
      payload.message
    );
  }

  handleFileOperationResponse(payload: FileOperationResponsePayload) {
    if (payload.success) {
      const current = useFileManagerStore.getState().currentPath;
      this.fetchDirectory(current);
    } else {
      useFileManagerStore.getState().setError(payload.error || 'Operation failed');
    }
  }

  async createDirectory(folderName: string) {
    const current = useFileManagerStore.getState().currentPath;
    const name = folderName.trim();
    if (!name) return;

    const provider = this.getActiveProvider();
    const ok = await provider.createDirectory(current, name);
    if (ok) {
      this.fetchDirectory(current);
    }
  }

  async renameFile(targetPath: string, newName: string) {
    const clean = newName.trim();
    if (!clean) return;

    const provider = this.getActiveProvider();
    const ok = await provider.renameItem(targetPath, clean);
    if (ok) {
      const current = useFileManagerStore.getState().currentPath;
      this.fetchDirectory(current);
    }
  }

  async deleteFile(targetPath: string) {
    const provider = this.getActiveProvider();
    const ok = await provider.deleteItem(targetPath);
    if (ok) {
      const current = useFileManagerStore.getState().currentPath;
      this.fetchDirectory(current);
    }
  }

  getDownloadUrl(filePath: string): string {
    const provider = this.getActiveProvider();
    return provider.getDownloadUrl(filePath);
  }

  // -------------------------------------------------------------
  // Bidirectional File Transfers
  // -------------------------------------------------------------

  async downloadFile(item: FileItem) {
    const transferId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const transferItem: FileTransferItem = {
      id: transferId,
      fileName: item.name,
      filePath: item.path,
      fileSizeBytes: item.sizeBytes,
      direction: 'download',
      percentage: 0,
      transferredBytes: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'active',
      startedAt: Date.now(),
    };

    useTransferStore.getState().addTransfer(transferItem);

    const controller = new AbortController();
    this.activeControllers.set(transferId, controller);

    try {
      const downloadUrl = this.getDownloadUrl(item.path);
      const startTime = Date.now();

      const response = await fetch(downloadUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Download HTTP error: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : item.sizeBytes;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body reader unavailable.');
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          const elapsedSecs = Math.max(0.1, (Date.now() - startTime) / 1000);
          const speedBytesPerSec = Math.round(receivedBytes / elapsedSecs);
          const percentage = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 50;
          const remainingBytes = Math.max(0, totalBytes - receivedBytes);
          const etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;

          useTransferStore.getState().updateTransfer(transferId, {
            percentage,
            transferredBytes: receivedBytes,
            speedBytesPerSec,
            etaSeconds,
          });
        }
      }

      // Concatenate chunks and trigger browser download
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const blob = new Blob([merged], { type: item.mimeType || 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      useTransferStore.getState().updateTransfer(transferId, {
        status: 'completed',
        percentage: 100,
        transferredBytes: receivedBytes,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        completedAt: Date.now(),
      });
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        useTransferStore.getState().updateTransfer(transferId, { status: 'cancelled' });
      } else {
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'failed',
          error: (err as Error)?.message || 'Download failed',
        });
      }
    } finally {
      this.activeControllers.delete(transferId);
    }
  }

  async uploadFile(file: File, destinationDirectory?: string) {
    const dest = destinationDirectory || useFileManagerStore.getState().currentPath;
    const transferId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const transferItem: FileTransferItem = {
      id: transferId,
      fileName: file.name,
      filePath: `${dest}/${file.name}`,
      fileSizeBytes: file.size,
      direction: 'upload',
      percentage: 0,
      transferredBytes: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'active',
      startedAt: Date.now(),
    };

    useTransferStore.getState().addTransfer(transferItem);

    try {
      const provider = this.getActiveProvider();
      const startTime = Date.now();

      const ok = await provider.uploadFile(file, dest, (progressPercent) => {
        const transferredBytes = Math.round((progressPercent / 100) * file.size);
        const elapsedSecs = Math.max(0.1, (Date.now() - startTime) / 1000);
        const speedBytesPerSec = Math.round(transferredBytes / elapsedSecs);
        const remainingBytes = Math.max(0, file.size - transferredBytes);
        const etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;

        useTransferStore.getState().updateTransfer(transferId, {
          percentage: progressPercent,
          transferredBytes,
          speedBytesPerSec,
          etaSeconds,
        });
      });

      if (ok) {
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'completed',
          percentage: 100,
          transferredBytes: file.size,
          speedBytesPerSec: 0,
          etaSeconds: 0,
          completedAt: Date.now(),
        });
        this.fetchDirectory(dest);
      } else {
        throw new Error('Upload rejected by storage provider');
      }
    } catch (err: unknown) {
      useTransferStore.getState().updateTransfer(transferId, {
        status: 'failed',
        error: (err as Error)?.message || 'Upload failed',
      });
    }
  }

  cancelTransfer(transferId: string) {
    const controller = this.activeControllers.get(transferId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(transferId);
    }
    useTransferStore.getState().cancelTransfer(transferId);
  }
}

export const fileTransferService = new FileTransferService();
