import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  HardDrive,
  Calendar,
  Shield,
} from 'lucide-react';
import { FileItem, DEFAULT_HTTP_PORT } from '../../types/protocol';
import { useFileManagerStore } from '../../stores/fileManagerStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { fileTransferService } from '../../services/fileTransferService';

interface FilePreviewModalProps {
  file: FileItem;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const { activeDevice, authToken } = useConnectionStore();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isText = file.mimeType.startsWith('text/') || ['txt', 'log', 'md', 'json', 'xml'].includes(file.extension);

  const downloadUrl = activeDevice && authToken
    ? `http://${activeDevice.ipAddress}:${DEFAULT_HTTP_PORT}/download?path=${encodeURIComponent(file.path)}`
    : '';

  useEffect(() => {
    if (isText && downloadUrl) {
      setIsLoadingContent(true);
      fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => res.text())
        .then((text) => setTextContent(text.substring(0, 50000))) // Limit preview to 50KB
        .catch(() => setTextContent('Failed to load text preview.'))
        .finally(() => setIsLoadingContent(false));
    }
  }, [file.path, isText, downloadUrl, authToken]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-charcoal-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-silver-200"
        >
          {/* Header */}
          <div className="h-11 px-4 bg-charcoal-850 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0 pr-3">
              {isImage ? (
                <ImageIcon className="w-4 h-4 text-silver-200 shrink-0" />
              ) : isVideo ? (
                <Film className="w-4 h-4 text-silver-300 shrink-0" />
              ) : isAudio ? (
                <Music className="w-4 h-4 text-silver-200 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-silver-400 shrink-0" />
              )}
              <span className="font-semibold text-xs text-white truncate">{file.name}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fileTransferService.downloadFile(file)}
                className="px-3 py-1 rounded-lg bg-silver-100 hover:bg-white text-charcoal-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="h-72 bg-charcoal-950 flex items-center justify-center overflow-auto p-4 border-b border-white/5">
            {isImage && downloadUrl ? (
              <img
                src={downloadUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-lg border border-white/10"
              />
            ) : isText ? (
              isLoadingContent ? (
                <div className="text-xs text-silver-500 font-mono">Loading preview...</div>
              ) : (
                <pre className="text-xs font-mono text-silver-300 whitespace-pre-wrap overflow-auto w-full h-full p-2">
                  {textContent || 'Empty file'}
                </pre>
              )
            ) : (
              <div className="text-center">
                <FileCode className="w-16 h-16 text-silver-500 mx-auto mb-2" />
                <div className="text-xs font-medium text-silver-300">{file.mimeType}</div>
                <div className="text-[11px] text-silver-500 mt-1">
                  Preview not directly renderable. Click Download to open locally.
                </div>
              </div>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="p-4 bg-charcoal-900 grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-charcoal-850 border border-white/5">
              <HardDrive className="w-4 h-4 text-silver-400" />
              <div>
                <div className="text-[10px] text-silver-500">File Size</div>
                <div className="font-mono font-medium text-silver-100">{formatBytes(file.sizeBytes)}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-2 rounded-lg bg-charcoal-850 border border-white/5">
              <Calendar className="w-4 h-4 text-silver-400" />
              <div>
                <div className="text-[10px] text-silver-500">Last Modified</div>
                <div className="font-mono font-medium text-silver-100">
                  {new Date(file.modifiedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-2 rounded-lg bg-charcoal-850 border border-white/5">
              <Shield className="w-4 h-4 text-silver-400" />
              <div>
                <div className="text-[10px] text-silver-500">Permissions</div>
                <div className="font-mono font-medium text-silver-200">
                  {file.isWritable ? 'Read / Write' : 'Read Only'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

