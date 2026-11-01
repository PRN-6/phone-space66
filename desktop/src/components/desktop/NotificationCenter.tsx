import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Trash2,
  Smartphone,
  MessageSquare,
  Mail,
  Calendar,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { notificationService } from '../../services/notificationService';

export const NotificationCenter: React.FC = () => {
  const { isNotificationCenterOpen, toggleNotificationCenter } = useWindowStore();
  const { isConnected } = useConnectionStore();
  const { notifications, clearAll } = useNotificationStore();

  useEffect(() => {
    if (isNotificationCenterOpen && isConnected) {
      notificationService.refreshNotifications();
    }
  }, [isNotificationCenterOpen, isConnected]);

  if (!isNotificationCenterOpen) return null;

  const handleClearAll = () => {
    clearAll();
  };

  const handleDismiss = (id: string) => {
    notificationService.dismissNotification(id);
  };

  const getAppIcon = (appName: string, iconBase64?: string) => {
    if (iconBase64) {
      return (
        <img
          src={`data:image/png;base64,${iconBase64}`}
          alt={appName}
          className="w-4 h-4 object-contain rounded"
        />
      );
    }
    switch (appName.toLowerCase()) {
      case 'messages':
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-silver-200" />;
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5 text-silver-300" />;
      case 'gmail':
      case 'mail':
        return <Mail className="w-3.5 h-3.5 text-silver-300" />;
      default:
        return <Smartphone className="w-3.5 h-3.5 text-silver-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-40"
        onClick={() => toggleNotificationCenter(false)}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-11 right-4 w-88 bg-charcoal-900 border border-white/10 rounded-2xl p-4 shadow-2xl text-silver-200 select-none backdrop-blur-2xl max-h-[520px] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-silver-200" />
              <span className="font-semibold text-xs text-silver-100">Phone Notifications</span>
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-charcoal-800 text-silver-300 text-[10px] font-mono border border-white/10">
                  {notifications.length}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => notificationService.refreshNotifications()}
                className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
                title="Refresh notifications from phone"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
                  title="Clear All Notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => toggleNotificationCenter(false)}
                className="p-1 rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto py-2.5 space-y-2">
            {!isConnected ? (
              <div className="text-center py-10 text-xs text-silver-500 space-y-1">
                <AlertCircle className="w-8 h-8 text-silver-600 mx-auto mb-2" />
                <p>Phone not connected</p>
                <p className="text-[10px] text-silver-600">Connect to sync notifications</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-xs text-silver-500">
                <Bell className="w-8 h-8 text-charcoal-700 mx-auto mb-2" />
                <span>No new notifications</span>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-charcoal-850 border border-white/5 rounded-xl space-y-1 text-xs relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-[11px] text-silver-400 font-medium">
                      {getAppIcon(item.appName, item.iconBase64)}
                      <span>{item.appName}</span>
                    </div>

                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-silver-500 hover:text-white transition-opacity"
                      title="Dismiss notification"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {item.title && (
                    <div className="font-semibold text-silver-100">{item.title}</div>
                  )}
                  {item.text && (
                    <div className="text-silver-400 text-[11px] leading-relaxed line-clamp-3">
                      {item.text}
                    </div>
                  )}

                  <div className="text-[10px] text-silver-600 font-mono pt-0.5">
                    {Math.max(1, Math.round((Date.now() - item.postTime) / 60000))}m ago
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
