import { IStorageProvider, StorageDirectoryResult } from './StorageProvider';
import { FileItem } from '../../types/protocol';

export class MockStorageProvider implements IStorageProvider {
  readonly id = 'mock';
  readonly name = 'Simulated Storage (Demo / Test Only)';
  readonly transport = 'mock' as const;

  private virtualStorage = new Map<string, FileItem[]>();
  private isDemoEnabled = false;

  constructor(enableDemo = false) {
    this.isDemoEnabled = enableDemo;
    this.initDemoStorage();
  }

  setDemoMode(enabled: boolean) {
    this.isDemoEnabled = enabled;
  }

  isAvailable(): boolean {
    return this.isDemoEnabled;
  }

  private initDemoStorage() {
    const root = '/storage/emulated/0';
    const now = Date.now();

    this.virtualStorage.set(root, [
      { name: 'DCIM', path: `${root}/DCIM`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 3600000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Download', path: `${root}/Download`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 7200000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Pictures', path: `${root}/Pictures`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 18000000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'Documents', path: `${root}/Documents`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 86400000, mimeType: 'inode/directory', extension: '', isWritable: true },
    ]);

    this.virtualStorage.set(`${root}/DCIM`, [
      { name: 'Camera', path: `${root}/DCIM/Camera`, isDirectory: true, sizeBytes: 0, modifiedAt: now - 1800000, mimeType: 'inode/directory', extension: '', isWritable: true },
      { name: 'IMG_Demo_01.jpg', path: `${root}/DCIM/IMG_Demo_01.jpg`, isDirectory: false, sizeBytes: 2450000, modifiedAt: now - 1200000, mimeType: 'image/jpeg', extension: 'jpg', isWritable: true },
    ]);

    this.virtualStorage.set(`${root}/Download`, [
      { name: 'Demo_Manual.pdf', path: `${root}/Download/Demo_Manual.pdf`, isDirectory: false, sizeBytes: 1024000, modifiedAt: now - 5400000, mimeType: 'application/pdf', extension: 'pdf', isWritable: true },
    ]);
  }

  async fetchDirectory(path: string): Promise<StorageDirectoryResult> {
    if (!this.isDemoEnabled) {
      return {
        currentPath: path,
        parentPath: null,
        entries: [],
        storageState: 'DEVICE_NOT_FOUND',
        message: 'MockStorageProvider is disabled in production mode.',
      };
    }

    const normalized = path.replace(/\/+$/, '') || '/storage/emulated/0';
    let entries = this.virtualStorage.get(normalized);
    if (!entries) {
      entries = [];
      this.virtualStorage.set(normalized, entries);
    }

    const parts = normalized.split('/').filter(Boolean);
    const parentPath = parts.length > 3 ? `/${parts.slice(0, -1).join('/')}` : null;

    return {
      currentPath: normalized,
      parentPath,
      entries,
      storageState: 'READY',
      message: 'Demo Simulation Mode Active',
    };
  }

  async createDirectory(parentPath: string, folderName: string): Promise<boolean> {
    if (!this.isDemoEnabled) return false;
    const clean = folderName.trim();
    if (!clean) return false;

    const currentList = this.virtualStorage.get(parentPath) || [];
    const newPath = `${parentPath}/${clean}`;
    if (!currentList.some((i) => i.name === clean)) {
      currentList.push({
        name: clean,
        path: newPath,
        isDirectory: true,
        sizeBytes: 0,
        modifiedAt: Date.now(),
        mimeType: 'inode/directory',
        extension: '',
        isWritable: true,
      });
      this.virtualStorage.set(parentPath, currentList);
      this.virtualStorage.set(newPath, []);
    }
    return true;
  }

  async deleteItem(targetPath: string): Promise<boolean> {
    if (!this.isDemoEnabled) return false;
    const parent = targetPath.substring(0, targetPath.lastIndexOf('/')) || '/storage/emulated/0';
    const list = this.virtualStorage.get(parent) || [];
    this.virtualStorage.set(parent, list.filter((i) => i.path !== targetPath));
    return true;
  }

  async renameItem(targetPath: string, newName: string): Promise<boolean> {
    if (!this.isDemoEnabled) return false;
    const parent = targetPath.substring(0, targetPath.lastIndexOf('/')) || '/storage/emulated/0';
    const list = this.virtualStorage.get(parent) || [];
    const item = list.find((i) => i.path === targetPath);
    if (item) {
      item.name = newName.trim();
      item.path = `${parent}/${newName.trim()}`;
    }
    return true;
  }

  getDownloadUrl(filePath: string): string {
    return `data:text/plain;charset=utf-8,Demo%20content%20for%20${encodeURIComponent(filePath)}`;
  }

  async uploadFile(file: File, destinationDirectory: string): Promise<boolean> {
    if (!this.isDemoEnabled) return false;
    const list = this.virtualStorage.get(destinationDirectory) || [];
    list.push({
      name: file.name,
      path: `${destinationDirectory}/${file.name}`,
      isDirectory: false,
      sizeBytes: file.size,
      modifiedAt: Date.now(),
      mimeType: file.type || 'application/octet-stream',
      extension: file.name.split('.').pop() || '',
      isWritable: true,
    });
    this.virtualStorage.set(destinationDirectory, list);
    return true;
  }
}

