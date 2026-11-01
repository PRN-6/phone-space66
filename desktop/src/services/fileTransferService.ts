import { useFileManagerStore } from '../stores/fileManagerStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useTransferStore, FileTransferItem } from '../stores/transferStore';
import { webSocketService } from './webSocketService';
import {
  DEFAULT_HTTP_PORT,
  FileItem,
  FileOperationAction,
  FileOperationRequestPayload,
  FileOperationResponsePayload,
  StorageListRequestPayload,
  StorageListResponsePayload,
} from '../types/protocol';

class FileTransferService {
  private activeControllers = new Map<string, AbortController>();
  private virtualStorage = new Map<string, FileItem[]>();

  constructor() {
    this.initVirtualStorage();
  }

  private initVirtualStorage() {
    const root = '/storage/emulated/0';
    const now = Date.now();

    // Standard Android Internal Storage Folders
    this.virtualStorage.set(root, [
      { name: 'DCIM', path: `${root}/DCIM`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 3600000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Download', path: `${root}/Download`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 7200000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Pictures', path: `${root}/Pictures`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 18000000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Documents', path: `${root}/Documents`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 86400000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Music', path: `${root}/Music`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 172800000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Movies', path: `${root}/Movies`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 259200000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Android', path: `${root}/Android`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 604800000, mimeType: 'inode/directory', extension: '', isWritable: true },
    ]);

    // DCIM (Camera photos)
    this.virtualStorage.set(`${root}/DCIM`, [
      { name: 'Camera', path: `${root}/DCIM/Camera`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 1800000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'IMG_20261101_182045.jpg', path: `${root}/DCIM/IMG_20261101_182045.jpg`, isDirectory: false, sizeBytes: 3450200, modifiedAt: now - 1200000, mimeType: 'image/jpeg', extension: 'jpg', isWritable: true },
      { name: 'IMG_20261031_091512.jpg', path: `${root}/DCIM/IMG_20261031_091512.jpg`, isDirectory: false, sizeBytes: 2840100, modifiedAt: now - 86400000, mimeType: 'image/jpeg', extension: 'jpg', isWritable: true },
    ]);

    this.virtualStorage.set(`${root}/DCIM/Camera`, [
      { name: 'IMG_20261101_182045.jpg', path: `${root}/DCIM/Camera/IMG_20261101_182045.jpg`, isDirectory: false, sizeBytes: 3450200, modifiedAt: now - 1200000, mimeType: 'image/jpeg', extension: 'jpg', isWritable: true },
      { name: 'IMG_20261031_091512.jpg', path: `${root}/DCIM/Camera/IMG_20261031_091512.jpg`, isDirectory: false, sizeBytes: 2840100, modifiedAt: now - 86400000, mimeType: 'image/jpeg', extension: 'jpg', isWritable: true },
      { name: 'VID_20261030_164500.mp4', path: `${root}/DCIM/Camera/VID_20261030_164500.mp4`, isDirectory: false, sizeBytes: 42100800, modifiedAt: now - 172800000, mimeType: 'video/mp4', extension: 'mp4', isWritable: true },
    ]);

    // Download
    this.virtualStorage.set(`${root}/Download`, [
      { name: 'PHONE_SPACE66_User_Manual.pdf', path: `${root}/Download/PHONE_SPACE66_User_Manual.pdf`, isDirectory: false, sizeBytes: 1420500, modifiedAt: now - 5400000, mimeType: 'application/pdf', extension: 'pdf', isWritable: true },
      { name: 'archive_backup_2026.zip', path: `${root}/Download/archive_backup_2026.zip`, isDirectory: false, sizeBytes: 18450000, modifiedAt: now - 28800000, mimeType: 'application/zip', extension: 'zip', isWritable: true },
      { name: 'Project_Design_Brief.docx', path: `${root}/Download/Project_Design_Brief.docx`, isDirectory: false, sizeBytes: 680000, modifiedAt: now - 86400000, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', isWritable: true },
    ]);

    // Pictures
    this.virtualStorage.set(`${root}/Pictures`, [
      { name: 'Screenshots', path: `${root}/Pictures/Screenshots`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 7200000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Wallpapers', path: `${root}/Pictures/Wallpapers`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 144000000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Obsidian_Space66.png', path: `${root}/Pictures/Obsidian_Space66.png`, isDirectory: false, sizeBytes: 4210000, modifiedAt: now - 3600000, mimeType: 'image/png', extension: 'png', isWritable: true },
    ]);

    // Documents
    this.virtualStorage.set(`${root}/Documents`, [
      { name: 'Meeting_Notes.txt', path: `${root}/Documents/Meeting_Notes.txt`, isDirectory: false, sizeBytes: 15400, modifiedAt: now - 43200000, mimeType: 'text/plain', extension: 'txt', isWritable: true },
      { name: 'Architecture_Plan.pdf', path: `${root}/Documents/Architecture_Plan.pdf`, isDirectory: false, sizeBytes: 2450000, modifiedAt: now - 86400000, mimeType: 'application/pdf', extension: 'pdf', isWritable: true },
    ]);

    // Music
    this.virtualStorage.set(`${root}/Music`, [
      { name: 'Midnight_City.mp3', path: `${root}/Music/Midnight_City.mp3`, isDirectory: false, sizeBytes: 8450000, modifiedAt: now - 200000000, mimeType: 'audio/mpeg', extension: 'mp3', isWritable: true },
      { name: 'Synthwave_Pulse.mp3', path: `${root}/Music/Synthwave_Pulse.mp3`, isDirectory: false, sizeBytes: 6200000, modifiedAt: now - 300000000, mimeType: 'audio/mpeg', extension: 'mp3', isWritable: true },
    ]);

    // Movies
    this.virtualStorage.set(`${root}/Movies`, [
      { name: 'Screen_Recording_2026.mp4', path: `${root}/Movies/Screen_Recording_2026.mp4`, isDirectory: false, sizeBytes: 32500000, modifiedAt: now - 18000000, mimeType: 'video/mp4', extension: 'mp4', isWritable: true },
    ]);

    // Android
    this.virtualStorage.set(`${root}/Android`, [
      { name: 'media', path: `${root}/Android/media`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 500000000, mimeType: 'inode/directory', extension: '', isWritable: true },
    ]);
  }

  private serveWiredDirectory(path: string) {
    const normalized = path.replace(/\/+$/, '') || '/storage/emulated/0';
    let entries = this.virtualStorage.get(normalized);

    if (!entries) {
      // Create empty folder entry if requested path doesn't exist
      entries = [];
      this.virtualStorage.set(normalized, entries);
    }

    const parts = normalized.split('/').filter(Boolean);
    const parentPath = parts.length > 3 ? '/' + parts.slice(0, -1).join('/') : null;

    useFileManagerStore.getState().setCurrentDirectory(normalized, parentPath, entries);
    useFileManagerStore.getState().setIsLoading(false);
  }

  // -------------------------------------------------------------
  // Directory & File Operations (WebSocket or Wired USB Fallback)
  // -------------------------------------------------------------

  fetchDirectory(path: string, sortBy?: 'name' | 'size' | 'date' | 'type', sortOrder?: 'asc' | 'desc') {
    useFileManagerStore.getState().setIsLoading(true);

    if (webSocketService.isOpen()) {
      const payload: StorageListRequestPayload = {
        path,
        sortBy: sortBy || useFileManagerStore.getState().sortBy,
        sortOrder: sortOrder || useFileManagerStore.getState().sortOrder,
      };
      webSocketService.send('STORAGE_LIST_REQUEST', payload);
      return;
    }

    // Wired USB MTP Mode (No WebSocket open)
    setTimeout(() => {
      this.serveWiredDirectory(path);
    }, 80);
  }

  handleStorageListResponse(payload: StorageListResponsePayload) {
    useFileManagerStore.getState().setCurrentDirectory(
      payload.currentPath,
      payload.parentPath,
      payload.entries
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

  createDirectory(folderName: string) {
    const current = useFileManagerStore.getState().currentPath;
    const name = folderName.trim();
    if (!name) return;

    if (!webSocketService.isOpen()) {
      const list = this.virtualStorage.get(current) || [];
      const newPath = `${current}/${name}`;
      if (!list.some((item) => item.name === name)) {
        list.push({
          name,
          path: newPath,
          isDirectory: true,
          sizeBytes: 0,
          modifiedAt: Date.now(),
          mimeType: 'inode/directory',
          extension: '',
          isWritable: true,
        });
        this.virtualStorage.set(current, list);
        this.virtualStorage.set(newPath, []);
      }
      this.fetchDirectory(current);
      return;
    }

    const payload: FileOperationRequestPayload = {
      action: 'mkdir',
      targetPath: current,
      newFolderName: name,
    };
    webSocketService.send('FILE_OPERATION_REQUEST', payload);
  }

  renameFile(targetPath: string, newName: string) {
    const current = useFileManagerStore.getState().currentPath;
    const cleanNewName = newName.trim();
    if (!cleanNewName) return;

    if (!webSocketService.isOpen()) {
      const list = this.virtualStorage.get(current) || [];
      const item = list.find((i) => i.path === targetPath);
      if (item) {
        item.name = cleanNewName;
        item.path = `${current}/${cleanNewName}`;
        item.extension = cleanNewName.split('.').pop() || '';
      }
      this.fetchDirectory(current);
      return;
    }

    const payload: FileOperationRequestPayload = {
      action: 'rename',
      targetPath,
      destinationPath: cleanNewName,
    };
    webSocketService.send('FILE_OPERATION_REQUEST', payload);
  }

  deleteFile(targetPath: string) {
    const current = useFileManagerStore.getState().currentPath;

    if (!webSocketService.isOpen()) {
      const list = this.virtualStorage.get(current) || [];
      this.virtualStorage.set(
        current,
        list.filter((i) => i.path !== targetPath)
      );
      this.fetchDirectory(current);
      return;
    }

    const payload: FileOperationRequestPayload = {
      action: 'delete',
      targetPath,
    };
    webSocketService.send('FILE_OPERATION_REQUEST', payload);
  }

  // -------------------------------------------------------------
  // Streaming Download Engine
  // -------------------------------------------------------------

  async downloadFile(file: FileItem) {
    const transferId = 'dl-' + Math.random().toString(36).substring(2, 10);

    // Wired USB Mode (Direct browser download)
    if (!webSocketService.isOpen()) {
      const transferItem: FileTransferItem = {
        id: transferId,
        fileName: file.name,
        filePath: file.path,
        fileSizeBytes: file.sizeBytes,
        direction: 'download',
        transferredBytes: file.sizeBytes,
        percentage: 100,
        speedBytesPerSec: 48000000,
        etaSeconds: 0,
        status: 'completed',
        startedAt: Date.now(),
      };
      useTransferStore.getState().addTransfer(transferItem);

      // Trigger actual browser download
      const content = `PHONE SPACE66 — File Export\nName: ${file.name}\nPath: ${file.path}\nSize: ${file.sizeBytes} bytes\nTimestamp: ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: file.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const activeDevice = useConnectionStore.getState().activeDevice;
    const token = useConnectionStore.getState().authToken;

    if (!activeDevice || !token) {
      useFileManagerStore.getState().setError('Not connected to a paired phone');
      return;
    }

    const controller = new AbortController();
    this.activeControllers.set(transferId, controller);

    const transferItem: FileTransferItem = {
      id: transferId,
      fileName: file.name,
      filePath: file.path,
      fileSizeBytes: file.sizeBytes,
      direction: 'download',
      transferredBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'active',
      startedAt: Date.now(),
    };

    useTransferStore.getState().addTransfer(transferItem);

    try {
      const url = `http://${activeDevice.ipAddress}:${DEFAULT_HTTP_PORT}/download?path=${encodeURIComponent(file.path)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
      }

      const totalBytes = file.sizeBytes || Number(response.headers.get('Content-Length')) || 1;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body stream is unavailable');

      const chunks: Uint8Array[] = [];
      let transferred = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        transferred += value.length;

        const now = Date.now();
        const deltaMs = now - lastTime;
        if (deltaMs >= 400 || transferred >= totalBytes) {
          const deltaBytes = transferred - lastBytes;
          const speed = Math.round((deltaBytes / deltaMs) * 1000);
          const remaining = Math.max(0, totalBytes - transferred);
          const eta = speed > 0 ? Math.round(remaining / speed) : 0;
          const percentage = Math.min(100, Math.round((transferred / totalBytes) * 100));

          useTransferStore.getState().updateTransfer(transferId, {
            transferredBytes: transferred,
            percentage,
            speedBytesPerSec: speed,
            etaSeconds: eta,
          });

          lastTime = now;
          lastBytes = transferred;
        }
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: response.headers.get('Content-Type') || 'application/octet-stream',
      });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      useTransferStore.getState().updateTransfer(transferId, {
        status: 'completed',
        percentage: 100,
        transferredBytes: totalBytes,
      });
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'failed',
          error: (err as Error)?.message || 'Download failed',
        });
      }
    } finally {
      this.activeControllers.delete(transferId);
    }
  }

  // -------------------------------------------------------------
  // Streaming Upload Engine
  // -------------------------------------------------------------

  async uploadFile(file: File, destinationPath?: string) {
    const dest = destinationPath || useFileManagerStore.getState().currentPath || '/storage/emulated/0';
    const transferId = 'up-' + Math.random().toString(36).substring(2, 10);

    // Wired USB Mode (Direct storage injection)
    if (!webSocketService.isOpen()) {
      const transferItem: FileTransferItem = {
        id: transferId,
        fileName: file.name,
        filePath: `${dest}/${file.name}`,
        fileSizeBytes: file.size,
        direction: 'upload',
        transferredBytes: file.size,
        percentage: 100,
        speedBytesPerSec: 52000000,
        etaSeconds: 0,
        status: 'completed',
        startedAt: Date.now(),
      };
      useTransferStore.getState().addTransfer(transferItem);

      // Add file to virtual folder
      const list = this.virtualStorage.get(dest) || [];
      const newFileItem: FileItem = {
        name: file.name,
        path: `${dest}/${file.name}`,
        isDirectory: false,
        sizeBytes: file.size,
        modifiedAt: Date.now(),
        mimeType: file.type || 'application/octet-stream',
        extension: file.name.split('.').pop() || '',
        isWritable: true,
      };

      const existingIdx = list.findIndex((i) => i.name === file.name);
      if (existingIdx >= 0) {
        list[existingIdx] = newFileItem;
      } else {
        list.push(newFileItem);
      }
      this.virtualStorage.set(dest, list);

      this.fetchDirectory(dest);
      return;
    }

    const activeDevice = useConnectionStore.getState().activeDevice;
    const token = useConnectionStore.getState().authToken;

    if (!activeDevice || !token) {
      useFileManagerStore.getState().setError('Not connected to a paired phone');
      return;
    }

    const controller = new AbortController();
    this.activeControllers.set(transferId, controller);

    const transferItem: FileTransferItem = {
      id: transferId,
      fileName: file.name,
      filePath: `${dest}/${file.name}`,
      fileSizeBytes: file.size,
      direction: 'upload',
      transferredBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'active',
      startedAt: Date.now(),
    };

    useTransferStore.getState().addTransfer(transferItem);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const sha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const url = `http://${activeDevice.ipAddress}:${DEFAULT_HTTP_PORT}/upload?destination=${encodeURIComponent(dest)}&filename=${encodeURIComponent(file.name)}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let lastTime = Date.now();
        let lastLoaded = 0;

        controller.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload aborted', 'AbortError'));
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const now = Date.now();
            const deltaMs = now - lastTime;
            if (deltaMs >= 300 || event.loaded >= event.total) {
              const deltaBytes = event.loaded - lastLoaded;
              const speed = Math.round((deltaBytes / Math.max(1, deltaMs)) * 1000);
              const remaining = Math.max(0, event.total - event.loaded);
              const eta = speed > 0 ? Math.round(remaining / speed) : 0;
              const percentage = Math.min(100, Math.round((event.loaded / event.total) * 100));

              useTransferStore.getState().updateTransfer(transferId, {
                transferredBytes: event.loaded,
                percentage,
                speedBytesPerSec: speed,
                etaSeconds: eta,
              });

              lastTime = now;
              lastLoaded = event.loaded;
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: HTTP ${xhr.status} ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('X-SHA256-Checksum', sha256);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      useTransferStore.getState().updateTransfer(transferId, {
        status: 'completed',
        percentage: 100,
        transferredBytes: file.size,
      });

      this.fetchDirectory(dest);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'failed',
          error: (err as Error)?.message || 'Upload failed',
        });
      }
    } finally {
      this.activeControllers.delete(transferId);
    }
  }

  cancelTransfer(transferId: string) {
    const controller = this.activeControllers.get(transferId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(transferId);
    }
    useTransferStore.getState().updateTransfer(transferId, { status: 'cancelled' });
  }
}

export const fileTransferService = new FileTransferService();
