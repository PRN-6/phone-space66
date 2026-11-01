import React, { useState } from 'react';
import {
  Smartphone,
  Play,
  Square,
} from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';

export const ScreenMirrorWindow: React.FC = () => {
  const { status } = useConnectionStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [resolution] = useState('1080p');
  const [fps] = useState('60 FPS');

  const isConnected = status === 'connected';

  return (
    <div className="h-full flex flex-col select-none text-silver-200 bg-charcoal-950">
      {/* Top Stream Control Bar */}
      <div className="h-10 px-3 bg-charcoal-900 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            disabled={!isConnected}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold text-xs transition-colors ${
              isStreaming
                ? 'bg-charcoal-800 text-silver-300 border border-white/10 hover:bg-charcoal-750'
                : 'bg-silver-100 text-charcoal-950 hover:bg-white'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isStreaming ? (
              <>
                <Square className="w-3 h-3" />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Start Mirroring</span>
              </>
            )}
          </button>

          <span className="text-[11px] font-mono text-silver-400">
            {isStreaming ? 'Streaming @ 60fps' : 'Standby'}
          </span>
        </div>

        {/* Quality Controls */}
        <div className="flex items-center space-x-2 text-silver-400 text-xs">
          <span className="px-2 py-0.5 rounded bg-charcoal-850 border border-white/5 font-mono text-[10px] text-silver-300">
            {resolution} • {fps}
          </span>
        </div>
      </div>

      {/* Screen Canvas Area */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        {isStreaming ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-charcoal-950 border border-white/10 m-2 rounded-xl">
            <Smartphone className="w-16 h-16 text-silver-300 animate-pulse mb-3" />
            <div className="text-sm font-bold text-white">Live Android Display Stream</div>
            <div className="text-xs text-silver-500 font-mono mt-1">
              Low-latency H.264 / Scrcpy Bridge
            </div>
          </div>
        ) : (
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-charcoal-900 border border-white/10 flex items-center justify-center mx-auto mb-3 text-silver-400">
              <Smartphone className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-silver-200 text-sm">Screen Mirror Ready</h4>
            <p className="text-xs text-silver-400 mt-1">
              Click Start Mirroring to mirror your Android screen onto your desktop.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Phone Key Navigation Bar */}
      <div className="h-9 px-4 bg-charcoal-900 border-t border-white/10 flex items-center justify-center space-x-12 text-silver-400">
        <button className="hover:text-white transition-colors text-xs font-mono">◀ Back</button>
        <button className="hover:text-white transition-colors text-xs font-mono">● Home</button>
        <button className="hover:text-white transition-colors text-xs font-mono">■ Recents</button>
      </div>
    </div>
  );
};
