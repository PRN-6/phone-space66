import { IStorageProvider, StorageDirectoryResult } from './StorageProvider';
import { webSocketService } from '../webSocketService';
import { useConnectionStore } from '../../stores/connectionStore';
import { useFileManagerStore } from '../../stores/fileManagerStore';
import { StorageListRequestPayload } from '../../types/protocol';

export class CompanionStorageProvider implements IStorageProvider {
  readonly id = 'companion';
  readonly name = 'PHONE SPACE66 Companion (SAF)';
  readonly transport = 'companion' as const;

  isAvailable(): boolean {
    const isConn = useConnectionStore.getState().isConnected;
    const isCompanion = useConnectionStore.getState().activeTransport === 'companion' || useConnectionStore.getState().connectionMode === 'lan';
    return isConn && isCompanion && webSocketService.isOpen();
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
        message: 'Companion application not connected.',
      };
    }

    const payload: StorageListRequestPayload = {
      path,
      sortBy: options?.sortBy || useFileManagerStore.getState().sortBy,
      sortOrder: options?.sortOrder || useFileManagerStore.getState().sortOrder,
    };

    webSocketService.send('STORAGE_LIST_REQUEST', payload);

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'STORAGE_LIST_RESPONSE') {
            resolve({
              currentPath: msg.payload.currentPath,
              parentPath: msg.payload.parentPath,
              entries: msg.payload.entries || [],
              storageState: 'READY',
            });
          }
        } catch {}
      };

      const socket = (webSocketService as unknown as { ws?: WebSocket }).ws;
      if (socket) {
        socket.addEventListener('message', handler, { once: true });
        setTimeout(() => {
          socket.removeEventListener('message', handler);
          resolve({
            currentPath: path,
            parentPath: null,
            entries: [],
            storageState: 'MTP_DEVICE_BUSY',
            message: 'Companion storage request timed out.',
          });
        }, 8000);
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
    const targetIp = useConnectionStore.getState().targetIp;
    const port = useConnectionStore.getState().targetHttpPort || 6656;
    const token = useConnectionStore.getState().authToken || '';
    return `http://${targetIp}:${port}/files/download?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
  }

  async uploadFile(
    file: File,
    destinationDirectory: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<boolean> {
    const targetIp = useConnectionStore.getState().targetIp;
    const port = useConnectionStore.getState().targetHttpPort || 6656;
    const token = useConnectionStore.getState().authToken || '';
    const url = `http://${targetIp}:${port}/files/upload`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-Destination-Path', destinationDirectory);
      xhr.setRequestHeader('X-File-Name', file.name);

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

