import { FileItem, StorageState } from '../../types/protocol';

export interface StorageDirectoryResult {
  currentPath: string;
  parentPath: string | null;
  entries: FileItem[];
  storageState: StorageState;
  message?: string;
}

export interface IStorageProvider {
  readonly id: string;
  readonly name: string;
  readonly transport: 'mtp' | 'adb' | 'companion' | 'mock';

  fetchDirectory(
    path: string,
    options?: { sortBy?: 'name' | 'size' | 'date' | 'type'; sortOrder?: 'asc' | 'desc' }
  ): Promise<StorageDirectoryResult>;

  createDirectory(parentPath: string, folderName: string): Promise<boolean>;
  deleteItem(targetPath: string): Promise<boolean>;
  renameItem(targetPath: string, newName: string): Promise<boolean>;
  getDownloadUrl(filePath: string): string;
  uploadFile(
    file: File,
    destinationDirectory: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<boolean>;

  isAvailable(): boolean;
}

