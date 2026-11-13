import { IStorageProvider, StorageDirectoryResult } from './StorageProvider';
import { webSocketService } from '../webSocketService';
import { useConnectionStore } from '../../stores/connectionStore';
import { useFileManagerStore } from '../../stores/fileManagerStore';
import { StorageListRequestPayload } from '../../types/protocol';

export class MtpStorageProvider implements IStorageProvider {
  readonly id = 'mtp';
  readonly name = 'Windows Portable Devices (MTP)';
  readonly transport = 'mtp' as const;

  isAvailable(): boolean {
    return webSocketService.isOpen();
  }

  async fetchDirectory(
    path: string,
    options?: { sortBy?: 'name' | 'size' | 'date' | 'type'; sortOrder?: 'asc' | 'desc' }
  ): Promise<StorageDirectoryResult> {
    if (!this.isAvailable()) {
      return {
        currentPath: path,
        parentPath: null,
        entries: [],
        storageState: 'DEVICE_DISCONNECTED',
        message: 'USB Hardware Bridge not connected.',
      };
    }

    const payload: StorageListRequestPayload = {
      path,
      sortBy: options?.sortBy || useFileManagerStore.getState().sortBy,
      sortOrder: options?.sortOrder || useFileManagerStore.getState().sortOrder,
    };

    webSocketService.send('STORAGE_LIST_REQUEST', payload);

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout | number;
      const socket = (webSocketService as unknown as { ws?: WebSocket }).ws;

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'STORAGE_LIST_RESPONSE') {
            clearTimeout(timeoutId);
            socket?.removeEventListener('message', handler);
            resolve({
              currentPath: msg.payload.currentPath,
              parentPath: msg.payload.parentPath,
              entries: msg.payload.entries || [],
              storageState: msg.payload.storageState || 'READY',
              message: msg.payload.message,
            });
          }
        } catch {}
      };

      if (socket) {
        socket.addEventListener('message', handler);
        timeoutId = setTimeout(() => {
          socket.removeEventListener('message', handler);
          resolve({
            currentPath: path,
            parentPath: null,
            entries: [],
            storageState: 'MTP_DEVICE_BUSY',
            message: 'MTP directory query timed out.',
          });
        }, 12000);
      } else {
        resolve({
          currentPath: path,
          parentPath: null,
          entries: [],
          storageState: 'DEVICE_DISCONNECTED',
          message: 'WebSocket offline.',
        });
      }
    });
  }

  async createDirectory(parentPath: string, folderName: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    webSocketService.send('FILE_OPERATION_REQUEST', {
      action: 'mkdir',
      targetPath: parentPath,
      newFolderName: folderName.trim(),
    });
    return true;
  }

  async deleteItem(targetPath: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    webSocketService.send('FILE_OPERATION_REQUEST', {
      action: 'delete',
      targetPath,
    });
    return true;
  }

  async renameItem(targetPath: string, newName: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    webSocketService.send('FILE_OPERATION_REQUEST', {
      action: 'rename',
      targetPath,
      destinationPath: newName.trim(),
    });
    return true;
  }

  getDownloadUrl(filePath: string): string {
    const targetIp = useConnectionStore.getState().targetIp || '127.0.0.1';
    const port = useConnectionStore.getState().targetHttpPort || 6656;
    return `http://${targetIp}:${port}/download?path=${encodeURIComponent(filePath)}`;
  }

  async uploadFile(
    file: File,
    destinationDirectory: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<boolean> {
    const targetIp = useConnectionStore.getState().targetIp || '127.0.0.1';
    const port = useConnectionStore.getState().targetHttpPort || 6656;
    const url = `http://${targetIp}:${port}/upload?dest=${encodeURIComponent(destinationDirectory)}&filename=${encodeURIComponent(file.name)}`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        resolve(xhr.status >= 200 && xhr.status < 300);
      };

      xhr.onerror = () => {
        resolve(false);
      };

      xhr.send(file);
    });
  }
}

