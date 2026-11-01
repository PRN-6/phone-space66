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

  // -------------------------------------------------------------
  // Directory & File Operations (WebSocket)
  // -------------------------------------------------------------

  fetchDirectory(path: string, sortBy?: 'name' | 'size' | 'date' | 'type', sortOrder?: 'asc' | 'desc') {
    useFileManagerStore.getState().setIsLoading(true);
    const payload: StorageListRequestPayload = {
      path,
      sortBy: sortBy || useFileManagerStore.getState().sortBy,
      sortOrder: sortOrder || useFileManagerStore.getState().sortOrder,
    };
    webSocketService.send('STORAGE_LIST_REQUEST', payload);
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
      // Refresh current directory
      const current = useFileManagerStore.getState().currentPath;
      this.fetchDirectory(current);
    } else {
      useFileManagerStore.getState().setError(payload.error || 'Operation failed');
    }
  }

  createDirectory(folderName: string) {
    const current = useFileManagerStore.getState().currentPath;
    const payload: FileOperationRequestPayload = {
      action: 'mkdir',
      targetPath: current,
      newFolderName: folderName.trim(),
    };
    webSocketService.send('FILE_OPERATION_REQUEST', payload);
  }

  renameFile(targetPath: string, newName: string) {
    const payload: FileOperationRequestPayload = {
      action: 'rename',
      targetPath,
      destinationPath: newName.trim(),
    };
    webSocketService.send('FILE_OPERATION_REQUEST', payload);
  }

  deleteFile(targetPath: string) {
    const payload: FileOperationRequestPayload = {
      action: 'delete',
      targetPath,
    };
    webSocketService.send('FILE_OPERATION_REQUEST', payload);
  }

  // -------------------------------------------------------------
  // Streaming Download Engine (HTTP Port 6656)
  // -------------------------------------------------------------

  async downloadFile(file: FileItem) {
    const activeDevice = useConnectionStore.getState().activeDevice;
    const token = useConnectionStore.getState().authToken;

    if (!activeDevice || !token) {
      useFileManagerStore.getState().setError('Not connected to a paired phone');
      return;
    }

    const transferId = 'dl-' + Math.random().toString(36).substring(2, 10);
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
      const expectedSha256 = response.headers.get('X-SHA256-Checksum')?.toLowerCase();

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

      // Concatenate and verify checksum
      const totalBuffer = new Uint8Array(transferred);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Compute SHA-256 client-side
      const hashBuffer = await crypto.subtle.digest('SHA-256', totalBuffer);
      const computedSha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (expectedSha256 && expectedSha256 !== computedSha256) {
        throw new Error(`SHA-256 verification failed! Expected: ${expectedSha256}, Got: ${computedSha256}`);
      }

      // Create download blob & trigger local save
      const blob = new Blob([totalBuffer], { type: file.mimeType || 'application/octet-stream' });
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
        sha256: computedSha256,
        completedAt: Date.now(),
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        useTransferStore.getState().updateTransfer(transferId, { status: 'cancelled' });
      } else {
        console.error('File download error:', err);
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'failed',
          error: err.message || 'Download failed',
        });
      }
    } finally {
      this.activeControllers.delete(transferId);
    }
  }

  // -------------------------------------------------------------
  // Streaming Upload Engine (HTTP Port 6656)
  // -------------------------------------------------------------

  async uploadFile(file: File, destinationDir?: string) {
    const activeDevice = useConnectionStore.getState().activeDevice;
    const token = useConnectionStore.getState().authToken;
    const dest = destinationDir || useFileManagerStore.getState().currentPath;

    if (!activeDevice || !token) {
      useFileManagerStore.getState().setError('Not connected to a paired phone');
      return;
    }

    const transferId = 'up-' + Math.random().toString(36).substring(2, 10);
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
      // Pre-calculate SHA-256 for verification
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const sha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const url = `http://${activeDevice.ipAddress}:${DEFAULT_HTTP_PORT}/upload?destination=${encodeURIComponent(dest)}&filename=${encodeURIComponent(file.name)}`;

      // Upload using XMLHttpRequest to get accurate real-time progress callbacks
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
        sha256,
        completedAt: Date.now(),
      });

      // Refresh directory view
      this.fetchDirectory(dest);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        useTransferStore.getState().updateTransfer(transferId, { status: 'cancelled' });
      } else {
        console.error('File upload error:', err);
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'failed',
          error: err.message || 'Upload failed',
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
    useTransferStore.getState().cancelTransfer(transferId);
  }
}

export const fileTransferService = new FileTransferService();

