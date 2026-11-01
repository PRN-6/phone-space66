import React, { useState } from 'react';
import {
  Folder,
  ChevronRight,
  Search,
  Grid,
  List as ListIcon,
  Smartphone,
} from 'lucide-react';
import { useDeviceStore } from '../../stores/deviceStore';
import { useConnectionStore } from '../../stores/connectionStore';

export const FileManagerWindow: React.FC = () => {
  const { storage } = useDeviceStore();
  const { status } = useConnectionStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const isConnected = status === 'connected';

  const defaultDirectories = [
    { name: 'Internal Storage', path: '/storage/emulated/0', icon: 'HardDrive' },
    { name: 'DCIM', path: '/storage/emulated/0/DCIM', icon: 'Folder' },
    { name: 'Download', path: '/storage/emulated/0/Download', icon: 'Folder' },
    { name: 'Pictures', path: '/storage/emulated/0/Pictures', icon: 'Folder' },
    { name: 'Documents', path: '/storage/emulated/0/Documents', icon: 'Folder' },
    { name: 'Music', path: '/storage/emulated/0/Music', icon: 'Folder' },
    { name: 'Movies', path: '/storage/emulated/0/Movies', icon: 'Folder' },
  ];

  return (
    <div className="h-full flex flex-col select-none text-silver-200 bg-charcoal-950">
      {/* Dolphin-style Toolbar */}
      <div className="h-10 px-3 bg-charcoal-900 border-b border-white/10 flex items-center justify-between text-xs">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center space-x-1.5 text-silver-300">
          <span className="font-semibold text-silver-100">Phone</span>
          <ChevronRight className="w-3.5 h-3.5 text-silver-500" />
          <span>Internal Storage</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-silver-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-charcoal-950 border border-white/10 rounded-lg text-xs text-silver-100 placeholder-silver-500 focus:outline-none focus:border-white/30 w-44"
            />
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* View Toggles */}
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-charcoal-800 text-white' : 'text-silver-500 hover:text-white'}`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-charcoal-800 text-white' : 'text-silver-500 hover:text-white'}`}
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-charcoal-900/70 border-r border-white/10 p-2.5 space-y-1 text-xs">
          <div className="text-[10px] uppercase font-mono tracking-wider text-silver-500 px-2 py-1">
            Places
          </div>
          {defaultDirectories.map((dir) => (
            <button
              key={dir.name}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-silver-300 hover:bg-charcoal-800 hover:text-white text-left transition-colors"
            >
              <Folder className="w-3.5 h-3.5 text-silver-400" />
              <span className="truncate">{dir.name}</span>
            </button>
          ))}
        </div>

        {/* Directory Contents */}
        <div className="flex-1 p-4 overflow-y-auto">
          {!isConnected ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-silver-500 text-xs">
              <Smartphone className="w-8 h-8 text-charcoal-600 mb-2" />
              <span>Connect phone to explore files over local LAN.</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {defaultDirectories.slice(1).map((folder) => (
                <div
                  key={folder.name}
                  className="p-3 bg-charcoal-900 border border-white/5 hover:border-white/20 hover:bg-charcoal-850 rounded-xl flex flex-col items-center text-center cursor-pointer transition-all group"
                >
                  <Folder className="w-10 h-10 text-silver-300 group-hover:scale-110 group-hover:text-white transition-all mb-2" />
                  <span className="text-xs font-medium text-silver-200 truncate w-full group-hover:text-white">
                    {folder.name}
                  </span>
                  <span className="text-[10px] text-silver-500 font-mono mt-0.5">Directory</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
