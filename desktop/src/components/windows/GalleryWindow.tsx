import React, { useEffect, useState } from 'react';
import {
  Image,
  Video,
  Camera,
  Smartphone,
  RotateCw,
  Download,
  X,
  Play,
  Film,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useGalleryStore, GalleryCategory } from '../../stores/galleryStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { galleryService } from '../../services/galleryService';
import { fileTransferService } from '../../services/fileTransferService';
import { GalleryItem } from '../../types/protocol';

export const GalleryWindow: React.FC = () => {
  const { isConnected, targetIp, targetHttpPort, authToken } = useConnectionStore();
  const { items, category, selectedItem, isLoading, setSelectedItem } = useGalleryStore();
  const [activeTab, setActiveTab] = useState<GalleryCategory>(category);

  useEffect(() => {
    if (isConnected && items.length === 0) {
      galleryService.fetchGallery(activeTab);
    }
  }, [isConnected, activeTab, items.length]);

  const handleTabChange = (cat: GalleryCategory) => {
    setActiveTab(cat);
    galleryService.fetchGallery(cat);
  };

  const getMediaUrl = (urlPath: string) => {
    const ip = targetIp || '127.0.0.1';
    const port = targetHttpPort || 6656;
    const token = authToken || '';
    return `http://${ip}:${port}${urlPath}${urlPath.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  };

  const handleDownload = (item: GalleryItem) => {
    fileTransferService.downloadFile(item.path, item.name, item.sizeBytes);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-full flex flex-col select-none text-silver-200 bg-charcoal-950">
      {/* Top Gallery Toolbar */}
      <div className="h-11 px-3 bg-charcoal-900 border-b border-white/10 flex items-center justify-between text-xs gap-3">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleTabChange('all')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Media</span>
          </button>
          <button
            onClick={() => handleTabChange('camera')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'camera'
                ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>
          <button
            onClick={() => handleTabChange('screenshots')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'screenshots'
                ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Screenshots</span>
          </button>
          <button
            onClick={() => handleTabChange('videos')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'videos'
                ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Videos</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-silver-500">
            {items.length} items
          </span>
          <button
            onClick={() => galleryService.fetchGallery(activeTab)}
            disabled={isLoading || !isConnected}
            title="Refresh gallery from phone"
            className="p-1.5 rounded-lg bg-charcoal-850 border border-white/10 text-silver-400 hover:text-white hover:bg-charcoal-800 disabled:opacity-40 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Media Grid Viewport */}
      <div className="flex-1 overflow-y-auto p-4">
        {!isConnected ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
            <Image className="w-12 h-12 text-silver-600 animate-pulse" />
            <h4 className="text-sm font-semibold text-silver-200">Phone Disconnected</h4>
            <p className="text-xs text-silver-400 max-w-sm">
              Connect PHONE SPACE66 Companion to browse and stream your phone's photo and video gallery.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
            <Image className="w-12 h-12 text-silver-600" />
            <h4 className="text-sm font-semibold text-silver-300">No Media Found</h4>
            <p className="text-xs text-silver-500">
              {activeTab === 'videos'
                ? 'No video recordings found in phone storage.'
                : activeTab === 'screenshots'
                ? 'No screenshots found in Pictures/Screenshots.'
                : 'No photos or videos found in the selected folder.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => {
              const isVideo = item.mimeType.startsWith('video');
              const thumbUrl = getMediaUrl(item.thumbnailUrl);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-charcoal-900 border border-white/5 hover:border-white/25 hover:shadow-xl cursor-pointer transition-all"
                >
                  <img
                    src={thumbUrl}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23262626"><rect width="100" height="100"/></svg>';
                    }}
                  />

                  {/* Video Badge Overlay */}
                  {isVideo && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[10px] font-mono text-white flex items-center space-x-1">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      <span>Video</span>
                    </div>
                  )}

                  {/* Bottom Hover Details Strip */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-medium text-white truncate">
                      {item.name}
                    </span>
                    <span className="text-[9px] font-mono text-silver-400">
                      {formatFileSize(item.sizeBytes)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="h-8 px-4 bg-charcoal-900 border-t border-white/10 flex items-center justify-between text-[11px] text-silver-400 font-mono">
        <span>{items.length} media items loaded</span>
        <span>Storage: /storage/emulated/0</span>
      </div>

      {/* Full Preview Modal / Lightbox */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col"
          onClick={() => setSelectedItem(null)}
        >
          {/* Top Preview Bar */}
          <div
            className="h-12 px-5 bg-charcoal-950/80 border-b border-white/10 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">{selectedItem.name}</span>
              <span className="text-xs text-silver-400 font-mono">
                ({formatFileSize(selectedItem.sizeBytes)})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDownload(selectedItem)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-charcoal-800 border border-white/10 text-xs text-silver-200 hover:text-white hover:bg-charcoal-700 transition-colors"
                title="Download to Laptop"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg bg-charcoal-800 border border-white/10 text-silver-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Centered Preview Canvas */}
          <div
            className="flex-1 flex items-center justify-center p-6 overflow-hidden"
            onClick={() => setSelectedItem(null)}
          >
            {selectedItem.mimeType.startsWith('video') ? (
              <video
                src={getMediaUrl(selectedItem.downloadUrl)}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-xl shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={getMediaUrl(selectedItem.downloadUrl)}
                alt={selectedItem.name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
