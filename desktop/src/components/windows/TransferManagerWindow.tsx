import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Minimize2,
} from 'lucide-react';
import { useTransferStore, FileTransferItem } from '../../stores/transferStore';
import { fileTransferService } from '../../services/fileTransferService';

export const TransferManagerWindow: React.FC = () => {
  const { transfers, isTransferManagerOpen, toggleTransferManager, clearCompleted } = useTransferStore();

  if (!isTransferManagerOpen || transfers.length === 0) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1048576) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / 1048576).toFixed(2)} MB/s`;
  };

  const activeCount = transfers.filter((t) => t.status === 'active' || t.status === 'queued').length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-16 right-5 w-96 max-h-[460px] bg-charcoal-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40 flex flex-col text-silver-200 select-none backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="h-10 px-4 bg-charcoal-850 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-silver-100">File Transfers</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-charcoal-750 text-white font-mono text-[10px] border border-white/10">
                {activeCount} active
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={clearCompleted}
              className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
              title="Clear Completed Transfers"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleTransferManager(false)}
              className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
              title="Close"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Transfers List */}
        <div className="p-3 space-y-2.5 overflow-y-auto max-h-[380px]">
          {transfers.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-charcoal-850 border border-white/5 rounded-xl space-y-2 text-xs"
            >
              {/* Item Top: Icon + Name + Action */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  {item.direction === 'upload' ? (
                    <ArrowUpCircle className="w-4 h-4 text-silver-300 shrink-0" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4 text-silver-200 shrink-0" />
                  )}
                  <span className="font-medium text-silver-100 truncate" title={item.fileName}>
                    {item.fileName}
                  </span>
                </div>

                {item.status === 'active' && (
                  <button
                    onClick={() => fileTransferService.cancelTransfer(item.id)}
                    className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors shrink-0"
                    title="Cancel Transfer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {item.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-silver-100 shrink-0" />
                )}

                {item.status === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-silver-400 shrink-0" />
                )}

                {item.status === 'cancelled' && (
                  <span className="text-[10px] text-silver-500 font-mono">Cancelled</span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-charcoal-750 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.status === 'failed'
                      ? 'bg-neutral-600'
                      : item.status === 'cancelled'
                      ? 'bg-charcoal-600'
                      : 'bg-silver-200'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              {/* Stats Footer */}
              <div className="flex items-center justify-between text-[11px] text-silver-400 font-mono">
                <span>
                  {formatBytes(item.transferredBytes)} / {formatBytes(item.fileSizeBytes)} ({item.percentage}%)
                </span>

                {item.status === 'active' ? (
                  <span>
                    {formatSpeed(item.speedBytesPerSec)} • {item.etaSeconds}s left
                  </span>
                ) : item.status === 'completed' ? (
                  <span className="flex items-center space-x-1 text-silver-300">
                    <ShieldCheck className="w-3 h-3 text-silver-200" />
                    <span>SHA-256 Verified</span>
                  </span>
                ) : (
                  <span>{item.error || item.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

