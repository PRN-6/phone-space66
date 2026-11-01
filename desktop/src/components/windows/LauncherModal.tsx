import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Star,
  Clock,
  RotateCw,
  Info,
  ExternalLink,
  Smartphone,
  Folder,
  Activity,
  Image,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { useAppStore, AppCategory } from '../../stores/appStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { appService } from '../../services/appService';
import { AppInfo } from '../../types/protocol';
import { WindowId } from '../../types/window';

export const LauncherModal: React.FC = () => {
  const { isLauncherOpen, toggleLauncher, openWindow } = useWindowStore();
  const { isConnected } = useConnectionStore();
  const {
    apps,
    isLoading,
    error,
    favorites,
    recentApps,
    activeCategory,
    searchQuery,
    launchStatus,
    selectedAppForDetails,
    includeSystemApps,
    toggleFavorite,
    setActiveCategory,
    setSearchQuery,
    setIncludeSystemApps,
    setSelectedAppForDetails,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<AppCategory>(activeCategory);

  useEffect(() => {
    if (isLauncherOpen && isConnected && apps.length === 0) {
      appService.refreshApps();
    }
  }, [isLauncherOpen, isConnected, apps.length]);

  // Built-in desktop system windows
  const systemWindows = [
    {
      id: 'dashboard' as WindowId,
      name: 'Phone Diagnostics',
      desc: 'Real-time telemetry and battery',
      icon: <Activity className="w-5 h-5 text-silver-200" />,
    },
    {
      id: 'file-manager' as WindowId,
      name: 'Storage Explorer',
      desc: 'KDE Dolphin-inspired file manager',
      icon: <Folder className="w-5 h-5 text-silver-200" />,
    },
    {
      id: 'screen-mirror' as WindowId,
      name: 'Screen Mirror',
      desc: 'Live Android screen stream',
      icon: <Smartphone className="w-5 h-5 text-silver-200" />,
    },
    {
      id: 'gallery' as WindowId,
      name: 'Media Gallery',
      desc: 'Phone photos and video library',
      icon: <Image className="w-5 h-5 text-silver-200" />,
    },
    {
      id: 'settings' as WindowId,
      name: 'System Settings',
      desc: 'Desktop configuration and theme',
      icon: <Settings className="w-5 h-5 text-silver-200" />,
    },
  ];

  const handleLaunchSystemWindow = (id: WindowId) => {
    openWindow(id);
    toggleLauncher(false);
  };

  const handleLaunchAndroidApp = (app: AppInfo) => {
    appService.launchApp(app.packageName, app.appName);
  };

  // Filtered and categorized apps
  const displayApps = useMemo(() => {
    let list = [...apps];

    if (!includeSystemApps) {
      list = list.filter((a) => !a.isSystemApp);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.appName.toLowerCase().includes(q) ||
          a.packageName.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'favorites') {
      list = list.filter((a) => favorites.includes(a.packageName));
    } else if (activeTab === 'recent') {
      const recentPackageMap = new Map(recentApps.map((r) => [r.packageName, r.launchedAt]));
      list = list
        .filter((a) => recentPackageMap.has(a.packageName))
        .sort((a, b) => (recentPackageMap.get(b.packageName) || 0) - (recentPackageMap.get(a.packageName) || 0));
    }

    return list;
  }, [apps, includeSystemApps, searchQuery, activeTab, favorites, recentApps]);

  if (!isLauncherOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md select-none"
        onClick={() => toggleLauncher(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl h-[620px] bg-charcoal-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* Header Bar */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-charcoal-850 gap-4">
            {/* Search Input */}
            <div className="flex-1 flex items-center space-x-3 bg-charcoal-950 border border-white/10 rounded-xl px-3.5 py-2 focus-within:border-silver-400/50 transition-colors">
              <Search className="w-4 h-4 text-silver-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search phone apps, package names, or tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-sm text-silver-100 placeholder-silver-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded text-silver-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => appService.refreshApps()}
                disabled={isLoading || !isConnected}
                title="Refresh applications list from phone"
                className="p-2 rounded-xl bg-charcoal-800 border border-white/10 text-silver-300 hover:text-silver-100 hover:bg-charcoal-700 disabled:opacity-40 transition-colors"
              >
                <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => toggleLauncher(false)}
                className="p-2 rounded-xl bg-charcoal-800 border border-white/10 text-silver-300 hover:text-silver-100 hover:bg-charcoal-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick System Tools Strip */}
          {!searchQuery && (
            <div className="px-5 py-3 border-b border-white/5 bg-charcoal-950/70 flex items-center justify-between overflow-x-auto">
              <div className="flex items-center space-x-1.5 text-xs text-silver-400 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-silver-300" />
                <span>DESKTOP SUITE</span>
              </div>
              <div className="flex items-center space-x-2">
                {systemWindows.map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => handleLaunchSystemWindow(sys.id)}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-charcoal-850 border border-white/5 hover:border-white/20 hover:bg-charcoal-800 text-xs text-silver-200 transition-colors"
                  >
                    {sys.icon}
                    <span>{sys.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs & Filter Toolbar */}
          <div className="px-5 py-2.5 border-b border-white/5 flex items-center justify-between text-xs bg-charcoal-900">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                    : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
                }`}
              >
                All Apps ({apps.filter((a) => includeSystemApps || !a.isSystemApp).length})
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                    : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-silver-300 text-silver-300" />
                <span>Favorites ({favorites.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-charcoal-700 text-silver-100 border border-white/15'
                    : 'text-silver-400 hover:text-silver-200 hover:bg-charcoal-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent ({recentApps.length})</span>
              </button>
            </div>

            <div className="flex items-center space-x-3 text-silver-400">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSystemApps}
                  onChange={(e) => setIncludeSystemApps(e.target.checked)}
                  className="rounded bg-charcoal-800 border-white/10 text-silver-300 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[11px]">Include System Packages</span>
              </label>
            </div>
          </div>

          {/* Launch Status Banner / Feedback */}
          {launchStatus && (
            <div
              className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
                launchStatus.status === 'launching'
                  ? 'bg-charcoal-800 text-silver-200 border-white/10'
                  : launchStatus.status === 'success'
                  ? 'bg-charcoal-850 text-silver-100 border-white/20'
                  : 'bg-charcoal-900 text-red-300 border-red-500/20'
              }`}
            >
              <div className="flex items-center space-x-2">
                {launchStatus.status === 'launching' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-silver-300" />
                )}
                {launchStatus.status === 'success' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-silver-200" />
                )}
                {launchStatus.status === 'error' && (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className="font-mono">{launchStatus.message}</span>
              </div>
              <button
                onClick={() => useAppStore.getState().setLaunchStatus(null)}
                className="text-silver-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Main Apps View */}
          <div className="flex-1 overflow-y-auto p-5">
            {!isConnected ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <Smartphone className="w-12 h-12 text-silver-600 animate-pulse" />
                <h3 className="text-sm font-semibold text-silver-200">Phone Disconnected</h3>
                <p className="text-xs text-silver-400 max-w-sm">
                  Pair and connect PHONE SPACE66 Companion on your Android device over Wi-Fi to explore and launch installed applications.
                </p>
              </div>
            ) : isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <Loader2 className="w-8 h-8 text-silver-300 animate-spin" />
                <p className="text-xs text-silver-400 font-mono">Querying Android PackageManager over local WebSocket...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-xs text-silver-300 font-mono">{error}</p>
                <button
                  onClick={() => appService.refreshApps()}
                  className="px-3 py-1.5 rounded-lg bg-charcoal-800 border border-white/10 text-xs text-silver-200 hover:bg-charcoal-700"
                >
                  Retry Connection
                </button>
              </div>
            ) : displayApps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                <Layers className="w-10 h-10 text-silver-600" />
                <h3 className="text-sm font-semibold text-silver-300">No Applications Found</h3>
                <p className="text-xs text-silver-500">
                  {searchQuery
                    ? `No applications matched "${searchQuery}".`
                    : activeTab === 'favorites'
                    ? 'No favorite apps yet. Click the star icon on any app card to bookmark it.'
                    : activeTab === 'recent'
                    ? 'No recently launched applications recorded yet.'
                    : 'No launchable applications returned from phone.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayApps.map((app) => {
                  const isFav = favorites.includes(app.packageName);
                  return (
                    <div
                      key={app.packageName}
                      className="group relative flex flex-col p-3 rounded-xl bg-charcoal-850 border border-white/5 hover:border-white/20 hover:bg-charcoal-800 transition-all select-none"
                    >
                      {/* Top Action Icons */}
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(app.packageName);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isFav
                              ? 'text-silver-200 hover:text-white'
                              : 'text-silver-600 hover:text-silver-300'
                          }`}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${isFav ? 'fill-silver-200 text-silver-200' : ''}`}
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppForDetails(app);
                          }}
                          className="p-1 rounded-md text-silver-600 hover:text-silver-300 transition-colors"
                          title="View app package info"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Icon & Label */}
                      <div
                        onClick={() => handleLaunchAndroidApp(app)}
                        className="flex-1 flex flex-col items-center text-center cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-charcoal-900 border border-white/10 flex items-center justify-center overflow-hidden mb-2 shadow-inner group-hover:scale-105 transition-transform">
                          {app.iconBase64 ? (
                            <img
                              src={`data:image/png;base64,${app.iconBase64}`}
                              alt={app.appName}
                              className="w-10 h-10 object-contain rounded-lg"
                              loading="lazy"
                            />
                          ) : (
                            <Smartphone className="w-7 h-7 text-silver-300" />
                          )}
                        </div>

                        <span className="text-xs font-medium text-silver-100 truncate w-full group-hover:text-white transition-colors">
                          {app.appName}
                        </span>

                        <span className="text-[10px] text-silver-500 truncate w-full font-mono mt-0.5">
                          {app.packageName}
                        </span>
                      </div>

                      {/* Launch Hover Button */}
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-center">
                        <button
                          onClick={() => handleLaunchAndroidApp(app)}
                          className="w-full flex items-center justify-center space-x-1.5 py-1 rounded-lg bg-charcoal-900 border border-white/10 text-[11px] text-silver-300 group-hover:border-white/25 group-hover:text-silver-100 group-hover:bg-charcoal-700 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Launch</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 border-t border-white/10 bg-charcoal-850 flex items-center justify-between text-xs text-silver-400">
            <span className="font-mono text-[11px]">
              {displayApps.length} applications displayed
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-silver-500">Press</span>
              <kbd className="px-2 py-0.5 rounded bg-charcoal-950 border border-white/10 text-[10px] text-silver-400 font-mono">
                ESC
              </kbd>
              <span className="text-[11px] text-silver-500">to dismiss</span>
            </div>
          </div>

          {/* Application Details Modal */}
          {selectedAppForDetails && (
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setSelectedAppForDetails(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-charcoal-900 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-charcoal-850 border border-white/10 flex items-center justify-center overflow-hidden">
                      {selectedAppForDetails.iconBase64 ? (
                        <img
                          src={`data:image/png;base64,${selectedAppForDetails.iconBase64}`}
                          alt={selectedAppForDetails.appName}
                          className="w-9 h-9 object-contain"
                        />
                      ) : (
                        <Smartphone className="w-6 h-6 text-silver-300" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-silver-100">
                        {selectedAppForDetails.appName}
                      </h4>
                      <p className="text-xs text-silver-400 font-mono break-all">
                        {selectedAppForDetails.packageName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAppForDetails(null)}
                    className="p-1 rounded text-silver-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs border-t border-b border-white/10 py-3">
                  <div className="flex justify-between">
                    <span className="text-silver-400">Version:</span>
                    <span className="font-mono text-silver-200">
                      {selectedAppForDetails.versionName} ({selectedAppForDetails.versionCode})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-silver-400">System Package:</span>
                    <span className="font-mono text-silver-200">
                      {selectedAppForDetails.isSystemApp ? 'Yes (Android System)' : 'No (User Installed)'}
                    </span>
                  </div>
                  {selectedAppForDetails.installedAt && (
                    <div className="flex justify-between">
                      <span className="text-silver-400">First Installed:</span>
                      <span className="font-mono text-silver-200">
                        {new Date(selectedAppForDetails.installedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedAppForDetails.lastUpdatedAt && (
                    <div className="flex justify-between">
                      <span className="text-silver-400">Last Updated:</span>
                      <span className="font-mono text-silver-200">
                        {new Date(selectedAppForDetails.lastUpdatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => setSelectedAppForDetails(null)}
                    className="px-3 py-1.5 rounded-lg bg-charcoal-800 border border-white/10 text-xs text-silver-300 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleLaunchAndroidApp(selectedAppForDetails);
                      setSelectedAppForDetails(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-charcoal-100 text-charcoal-950 font-medium text-xs hover:bg-white flex items-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch on Phone</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
