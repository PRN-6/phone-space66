import React, { useEffect, useState, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  File,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Search,
  Grid,
  List as ListIcon,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  FileArchive,
  FileCode,
  Smartphone,
  HardDrive,
  Camera,
  Layers,
  ArrowUpDown,
  CheckSquare,
  Square as SquareIcon,
  X,
} from 'lucide-react';
import { useFileManagerStore } from '../../stores/fileManagerStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { fileTransferService } from '../../services/fileTransferService';
import { FileItem } from '../../types/protocol';
import { FilePreviewModal } from './FilePreviewModal';

export const FileManagerWindow: React.FC = () => {
  const {
    currentPath,
    parentPath,
    entries,
    sortBy,
    sortOrder,
    viewMode,
    selectedPaths,
    searchQuery,
    isLoading,
    error,
    previewFile,
    isNewFolderModalOpen,
    isDeleteConfirmOpen,
    navigateTo,
    navigateBack,
    navigateForward,
    setSort,
    setViewMode,
    toggleSelect,
    selectAll,
    clearSelection,
    setSearchQuery,
    setPreviewFile,
    setIsNewFolderModalOpen,
    setIsDeleteConfirmOpen,
  } = useFileManagerStore();

  const { status, activeDevice } = useConnectionStore();
  const { storage } = useDeviceStore();

  const [newFolderName, setNewFolderName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConnected = status === 'connected';

  useEffect(() => {
    if (isConnected) {
      fileTransferService.fetchDirectory(currentPath);
    }
  }, [isConnected, currentPath]);

  const places = [
    { name: 'Internal Storage', path: '/storage/emulated/0', icon: HardDrive },
    { name: 'DCIM (Camera)', path: '/storage/emulated/0/DCIM', icon: Camera },
    { name: 'Downloads', path: '/storage/emulated/0/Download', icon: Download },
    { name: 'Pictures', path: '/storage/emulated/0/Pictures', icon: ImageIcon },
    { name: 'Documents', path: '/storage/emulated/0/Documents', icon: FileText },
    { name: 'Music', path: '/storage/emulated/0/Music', icon: Music },
    { name: 'Movies', path: '/storage/emulated/0/Movies', icon: Film },
  ];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) return <Folder className="w-8 h-8 text-silver-300" />;
    if (file.mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-silver-200" />;
    if (file.mimeType.startsWith('video/')) return <Film className="w-8 h-8 text-silver-300" />;
    if (file.mimeType.startsWith('audio/')) return <Music className="w-8 h-8 text-silver-200" />;
    if (file.mimeType === 'application/pdf') return <FileText className="w-8 h-8 text-silver-100" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(file.extension))
      return <FileArchive className="w-8 h-8 text-silver-400" />;
    if (['apk'].includes(file.extension)) return <Smartphone className="w-8 h-8 text-silver-100" />;
    return <FileCode className="w-8 h-8 text-silver-400" />;
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const handleBreadcrumbClick = (idx: number) => {
    const target = '/' + breadcrumbs.slice(0, idx + 1).join('/');
    navigateTo(target);
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else {
      setPreviewFile(item);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      fileTransferService.createDirectory(newFolderName.trim());
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
    }
  };

  const handleDeleteSelected = () => {
    selectedPaths.forEach((path) => {
      fileTransferService.deleteFile(path);
    });
    setIsDeleteConfirmOpen(false);
  };

  const handleDownloadSelected = () => {
    const selectedFiles = entries.filter((e) => selectedPaths.includes(e.path) && !e.isDirectory);
    selectedFiles.forEach((file) => {
      fileTransferService.downloadFile(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((f) => {
        fileTransferService.uploadFile(f, currentPath);
      });
    }
  };

  // Drag and Drop Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((f) => {
        fileTransferService.uploadFile(f, currentPath);
      });
    }
  };

  return (
    <div className="h-full flex flex-col select-none text-silver-200 bg-charcoal-950 relative">
      {/* Hidden File Picker Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Dolphin Toolbar */}
      <div className="h-11 px-3 bg-charcoal-900 border-b border-white/10 flex items-center justify-between text-xs gap-2">
        {/* Navigation Arrows */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => {
              const prev = navigateBack();
              if (prev) fileTransferService.fetchDirectory(prev);
            }}
            className="p-1.5 rounded hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const next = navigateForward();
              if (next) fileTransferService.fetchDirectory(next);
            }}
            className="p-1.5 rounded hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!parentPath}
            onClick={() => {
              if (parentPath) navigateTo(parentPath);
            }}
            className="p-1.5 rounded hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors disabled:opacity-30"
            title="Up Folder"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Breadcrumb Path Segment Bar */}
        <div className="flex-1 flex items-center space-x-1 px-2.5 py-1 bg-charcoal-950 border border-white/10 rounded-lg overflow-x-auto min-w-0">
          <button
            onClick={() => navigateTo('/storage/emulated/0')}
            className="text-silver-300 hover:text-white font-medium shrink-0"
          >
            Phone
          </button>
          {breadcrumbs.map((seg, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-silver-600 shrink-0" />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`truncate max-w-[120px] transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? 'font-semibold text-white'
                    : 'text-silver-400 hover:text-silver-200'
                }`}
              >
                {seg === 'storage' || seg === 'emulated' || seg === '0' ? 'Internal Storage' : seg}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-silver-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-charcoal-950 border border-white/10 rounded-lg text-xs text-silver-100 placeholder-silver-600 focus:outline-none focus:border-white/30 w-36"
            />
          </div>

          <button
            onClick={() => fileTransferService.fetchDirectory(currentPath)}
            className="p-1.5 rounded hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className="p-1.5 rounded hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-white/10 text-silver-200 font-medium flex items-center space-x-1 transition-colors"
            title="Upload Files to Phone"
          >
            <Upload className="w-3.5 h-3.5 text-silver-300" />
            <span>Upload</span>
          </button>

          {selectedPaths.length > 0 && (
            <>
              <button
                onClick={handleDownloadSelected}
                className="px-2.5 py-1 rounded-lg bg-silver-100 hover:bg-white text-charcoal-950 font-bold flex items-center space-x-1 transition-colors"
                title="Download Selected Files"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({selectedPaths.length})</span>
              </button>

              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="p-1.5 rounded bg-charcoal-800 hover:bg-neutral-800 text-silver-400 hover:text-white border border-white/10 transition-colors"
                title="Delete Selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-charcoal-800 text-white border border-white/10' : 'text-silver-500 hover:text-white'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list' ? 'bg-charcoal-800 text-white border border-white/10' : 'text-silver-500 hover:text-white'
            }`}
            title="List View"
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Places Sidebar */}
        <div className="w-52 bg-charcoal-900/80 border-r border-white/10 p-2.5 space-y-1 text-xs shrink-0 select-none">
          <div className="text-[10px] uppercase font-mono tracking-wider text-silver-500 px-2 py-1">
            Storage Locations
          </div>
          {places.map((place) => {
            const Icon = place.icon;
            const isCurrent = currentPath === place.path;
            return (
              <button
                key={place.name}
                onClick={() => navigateTo(place.path)}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isCurrent
                    ? 'bg-charcoal-800 text-white font-semibold border border-white/10'
                    : 'text-silver-400 hover:bg-charcoal-850 hover:text-silver-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-silver-400'}`} />
                <span className="truncate">{place.name}</span>
              </button>
            );
          })}
        </div>

        {/* Central Directory Browsing Canvas (With Drag-and-Drop) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 p-4 overflow-y-auto relative transition-colors ${
            isDragOver ? 'bg-charcoal-850/80 ring-2 ring-white/30' : 'bg-charcoal-950'
          }`}
        >
          {/* Drag Overlay Notice */}
          {isDragOver && (
            <div className="absolute inset-0 bg-charcoal-900/90 backdrop-blur-sm border-2 border-dashed border-white/30 flex flex-col items-center justify-center pointer-events-none z-30">
              <Upload className="w-12 h-12 text-silver-200 animate-bounce mb-2" />
              <div className="text-sm font-bold text-white">Drop files to upload to phone</div>
              <div className="text-xs text-silver-400 font-mono mt-1">{currentPath}</div>
            </div>
          )}

          {!isConnected ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-silver-500 text-xs">
              <Smartphone className="w-10 h-10 text-charcoal-600 mb-2" />
              <span className="font-medium text-silver-300">Phone not connected</span>
              <span className="mt-1">Connect your phone to browse actual internal storage.</span>
            </div>
          ) : isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-silver-400 font-mono space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-silver-300" />
              <span>Reading phone storage...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-silver-500 text-xs">
              <Folder className="w-10 h-10 text-charcoal-700 mb-2" />
              <span>Folder is empty</span>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {filteredEntries.map((item) => {
                const isSelected = selectedPaths.includes(item.path);
                return (
                  <div
                    key={item.path}
                    onClick={(e) => toggleSelect(item.path, e.ctrlKey || e.metaKey)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all group relative ${
                      isSelected
                        ? 'bg-charcoal-800 border-white/30 shadow-glow-subtle'
                        : 'bg-charcoal-900 border-white/5 hover:border-white/15 hover:bg-charcoal-850'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`absolute top-2 left-2 p-0.5 rounded transition-opacity ${
                        isSelected ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-100 text-silver-500'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <SquareIcon className="w-3.5 h-3.5" />}
                    </div>

                    <div className="my-2 group-hover:scale-105 transition-transform">{getFileIcon(item)}</div>

                    <span className="text-xs font-medium text-silver-200 truncate w-full group-hover:text-white" title={item.name}>
                      {item.name}
                    </span>

                    <span className="text-[10px] text-silver-500 font-mono mt-0.5">
                      {item.isDirectory ? 'Folder' : formatBytes(item.sizeBytes)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-charcoal-900 text-xs">
              <div className="grid grid-cols-12 px-3 py-2 bg-charcoal-850 text-[10px] font-mono uppercase tracking-wider text-silver-400 font-semibold">
                <div className="col-span-6 flex items-center space-x-2">
                  <button onClick={selectAll} className="hover:text-white">
                    <SquareIcon className="w-3 h-3" />
                  </button>
                  <span>Name</span>
                </div>
                <div className="col-span-2">Size</div>
                <div className="col-span-3">Modified</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {filteredEntries.map((item) => {
                const isSelected = selectedPaths.includes(item.path);
                return (
                  <div
                    key={item.path}
                    onClick={(e) => toggleSelect(item.path, e.ctrlKey || e.metaKey)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`grid grid-cols-12 px-3 py-2 items-center cursor-pointer transition-colors ${
                      isSelected ? 'bg-charcoal-800 text-white' : 'hover:bg-charcoal-850/60 text-silver-300'
                    }`}
                  >
                    <div className="col-span-6 flex items-center space-x-2.5 truncate pr-2">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {item.isDirectory ? (
                          <Folder className="w-4 h-4 text-silver-400" />
                        ) : (
                          <File className="w-4 h-4 text-silver-500" />
                        )}
                      </div>
                      <span className="truncate font-medium">{item.name}</span>
                    </div>

                    <div className="col-span-2 font-mono text-[11px] text-silver-400">
                      {item.isDirectory ? '--' : formatBytes(item.sizeBytes)}
                    </div>

                    <div className="col-span-3 font-mono text-[11px] text-silver-500">
                      {new Date(item.modifiedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    <div className="col-span-1 flex items-center justify-end space-x-1">
                      {!item.isDirectory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileTransferService.downloadFile(item);
                          }}
                          className="p-1 rounded text-silver-500 hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dolphin Footer Status Bar */}
      <div className="h-7 px-3 bg-charcoal-900 border-t border-white/10 flex items-center justify-between text-[11px] text-silver-500 font-mono">
        <div>
          <span>{filteredEntries.length} items</span>
          {selectedPaths.length > 0 && <span className="text-silver-300"> • {selectedPaths.length} selected</span>}
        </div>

        {storage && (
          <div>
            <span>
              {(storage.availableBytes / 1e9).toFixed(1)} GB free of {(storage.totalBytes / 1e9).toFixed(1)} GB
            </span>
          </div>
        )}
      </div>

      {/* New Folder Modal Prompt */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateFolder}
            className="w-full max-w-sm bg-charcoal-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-semibold text-xs text-white">Create New Folder</span>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-silver-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 bg-charcoal-950 border border-white/10 rounded-xl text-xs text-white placeholder-silver-600 focus:outline-none focus:border-white/30"
            />

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-xs text-silver-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="flex-1 py-2 rounded-xl bg-silver-100 hover:bg-white text-xs font-bold text-charcoal-950 disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-charcoal-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-semibold text-xs text-white">Confirm Deletion</span>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="text-silver-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-silver-400">
              Are you sure you want to delete {selectedPaths.length} selected item(s) from your phone? This action cannot be undone.
            </p>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-xs text-silver-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex-1 py-2 rounded-xl bg-charcoal-800 hover:bg-neutral-800 border border-white/15 text-xs font-bold text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
};
