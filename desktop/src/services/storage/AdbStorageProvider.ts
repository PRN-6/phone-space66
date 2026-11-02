import { IStorageProvider, StorageDirectoryResult } from './StorageProvider';
import { webSocketService } from '../webSocketService';
import { useConnectionStore } from '../../stores/connectionStore';

export class AdbStorageProvider implements IStorageProvider {
  readonly id = 'adb';
  readonly name = 'Android Debug Bridge (ADB)';
  readonly transport = 'adb' as const;

  isAvailable(): boolean {
    const isConn = useConnectionStore.getState().isConnected;
    const isAdb = useConnectionStore.getState().activeTransport === 'adb';
    return isConn && isAdb && webSocketService.isOpen();
  }

  async fetchDirectory(path: string): Promise<StorageDirectoryResult> {
    if (!this.isAvailable()) {
      return {
        currentPath: path,
        parentPath: null,
        entries: [],
        storageState: 'DEVICE_DISCONNECTED',
        message: 'ADB Transport not available or unauthorized.',
      };
    }

    // ADB Directory listing via bridge
    webSocketService.send('STORAGE_LIST_REQUEST', { path });

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'STORAGE_LIST_RESPONSE') {
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
            message: 'ADB query timed out.',
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
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(file);
    });
  }
}

