import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  Volume1,
  Power,
  ChevronLeft,
  Circle,
  Square as SquareIcon,
  Smartphone,
  Loader2,
  Sliders,
  Keyboard,
  Radio,
} from 'lucide-react';
import { useScreenMirrorStore } from '../../stores/screenMirrorStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { screenMirrorService } from '../../services/screenMirrorService';

export const ScreenMirrorWindow: React.FC = () => {
  const { isConnected } = useConnectionStore();
  const {
    isStreaming,
    isConnecting,
    error,
    width,
    height,
    fps,
    rotation,
    quality,
    latencyMs,
    isFullscreen,
    setQuality,
    setRotation,
    setFullscreen,
  } = useScreenMirrorStore();

  const [touchIndicator, setTouchIndicator] = useState<{ x: number; y: number; active: boolean } | null>(null);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');
  const [activeFps, setActiveFps] = useState(60);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isMouseDownRef = useRef(false);
  const frameRequestRef = useRef<number | null>(null);

  // Poll frames when streaming
  useEffect(() => {
    if (!isStreaming) {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }
      return;
    }

    let isMounted = true;
    let lastTime = performance.now();
    let frameCount = 0;

    const streamUrl = screenMirrorService.getStreamUrl();
    if (!streamUrl || !imgRef.current) return;

    imgRef.current.src = streamUrl;

    const updateFrameLoop = () => {
      if (!isMounted) return;
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setActiveFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      frameRequestRef.current = requestAnimationFrame(updateFrameLoop);
    };

    frameRequestRef.current = requestAnimationFrame(updateFrameLoop);

    return () => {
      isMounted = false;
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [isStreaming]);

  // Translate client mouse coordinates to normalized (0.0 to 1.0) screen coordinates
  const getNormalizedCoordinates = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
      if (!imgRef.current) return null;
      const rect = imgRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }

      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;

      return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isStreaming) return;
    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    isMouseDownRef.current = true;
    setTouchIndicator({ x: e.clientX, y: e.clientY, active: true });
    screenMirrorService.sendPointerDown(coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isStreaming || !isMouseDownRef.current) return;
    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    setTouchIndicator({ x: e.clientX, y: e.clientY, active: true });
    screenMirrorService.sendPointerMove(coords.x, coords.y);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isStreaming || !isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setTouchIndicator(null);

    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    screenMirrorService.sendPointerUp(coords.x, coords.y);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current) {
      handleMouseUp(e);
    }
  };

  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyboardText.trim()) return;
    screenMirrorService.sendTextInput(keyboardText);
    setKeyboardText('');
  };

  // Keyboard forwarding when window is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isStreaming) return;
    if (e.key === 'Backspace') {
      screenMirrorService.sendNavButton('back');
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      screenMirrorService.sendTextInput(e.key);
    }
  };

  // Display aspect ratio (e.g. 1080 / 2400 = 0.45, or inverted if rotated)
  const isLandscape = rotation === 90 || rotation === 270;
  const targetAspect = isLandscape ? (height / width) : (width / height);

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`h-full flex flex-col select-none text-silver-200 bg-charcoal-950 focus:outline-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Top Stream Control Bar */}
      <div className="h-11 px-3 bg-charcoal-900 border-b border-white/10 flex items-center justify-between text-xs gap-3">
        {/* Left: Stream Toggle & Live Status */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              if (isStreaming) {
                screenMirrorService.stopMirror();
              } else {
                screenMirrorService.startMirror();
              }
            }}
            disabled={!isConnected || isConnecting}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
              isStreaming
                ? 'bg-charcoal-800 text-silver-300 border border-white/15 hover:bg-charcoal-700'
                : 'bg-silver-100 text-charcoal-950 hover:bg-white font-semibold'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : isStreaming ? (
              <>
                <Square className="w-3.5 h-3.5 fill-silver-300" />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-charcoal-950" />
                <span>Start Mirror</span>
              </>
            )}
          </button>

          {isStreaming && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-charcoal-850 border border-white/10 font-mono text-[10px] text-silver-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
              <span className="text-silver-500">•</span>
              <span>{activeFps || fps} FPS</span>
              <span className="text-silver-500">•</span>
              <span>{latencyMs}ms</span>
            </div>
          )}
        </div>

        {/* Right: Stream Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Quality Preset */}
          <div className="flex items-center space-x-1 bg-charcoal-850 border border-white/10 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setQuality('high')}
              className={`px-2 py-0.5 rounded ${
                quality === 'high' ? 'bg-charcoal-700 text-white font-medium' : 'text-silver-400 hover:text-white'
              }`}
            >
              1080p
            </button>
            <button
              onClick={() => setQuality('medium')}
              className={`px-2 py-0.5 rounded ${
                quality === 'medium' ? 'bg-charcoal-700 text-white font-medium' : 'text-silver-400 hover:text-white'
              }`}
            >
              720p
            </button>
            <button
              onClick={() => setQuality('low')}
              className={`px-2 py-0.5 rounded ${
                quality === 'low' ? 'bg-charcoal-700 text-white font-medium' : 'text-silver-400 hover:text-white'
              }`}
            >
              540p
            </button>
          </div>

          {/* Quick Keyboard Toggle */}
          <button
            onClick={() => setShowKeyboardInput(!showKeyboardInput)}
            title="Toggle remote keyboard input box"
            className={`p-1.5 rounded-lg border transition-colors ${
              showKeyboardInput
                ? 'bg-charcoal-700 border-white/20 text-white'
                : 'bg-charcoal-850 border-white/10 text-silver-400 hover:text-white hover:bg-charcoal-800'
            }`}
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Rotate Screen */}
          <button
            onClick={handleRotate}
            title="Rotate display 90 degrees"
            className="p-1.5 rounded-lg bg-charcoal-850 border border-white/10 text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1.5 rounded-lg bg-charcoal-850 border border-white/10 text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Keyboard Input Bar (Collapsible) */}
      {showKeyboardInput && (
        <form
          onSubmit={handleSendText}
          className="px-3 py-2 bg-charcoal-900 border-b border-white/10 flex items-center space-x-2"
        >
          <Keyboard className="w-4 h-4 text-silver-400" />
          <input
            type="text"
            placeholder="Type text and press Enter to send to phone..."
            value={keyboardText}
            onChange={(e) => setKeyboardText(e.target.value)}
            className="flex-1 bg-charcoal-950 border border-white/10 rounded-lg px-3 py-1 text-xs text-silver-100 placeholder-silver-500 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-charcoal-800 border border-white/10 text-xs text-silver-200 hover:text-white"
          >
            Send
          </button>
        </form>
      )}

      {/* Screen Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="flex-1 bg-black flex items-center justify-center relative overflow-hidden cursor-crosshair"
      >
        {isStreaming ? (
          <div
            className="relative flex items-center justify-center max-w-full max-h-full"
            style={{
              aspectRatio: `${targetAspect}`,
            }}
          >
            <img
              ref={imgRef}
              alt="Android Screen Stream"
              className="w-full h-full object-contain pointer-events-auto rounded-lg shadow-2xl transition-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />

            {/* Ripple Pointer Dot */}
            {touchIndicator && (
              <div
                className="pointer-events-none fixed w-6 h-6 rounded-full border-2 border-white bg-white/20 -translate-x-1/2 -translate-y-1/2 z-50 animate-ping"
                style={{
                  left: `${touchIndicator.x}px`,
                  top: `${touchIndicator.y}px`,
                }}
              />
            )}
          </div>
        ) : (
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-charcoal-900 border border-white/10 flex items-center justify-center mx-auto mb-4 text-silver-400 shadow-inner">
              <Smartphone className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-silver-100 text-sm mb-1.5">
              Screen Mirroring Ready
            </h4>
            <p className="text-xs text-silver-400 mb-5 leading-relaxed">
              Stream your Android display in real time with hardware acceleration, responsive mouse clicks, touch swipes, and keyboard typing.
            </p>
            <button
              onClick={() => screenMirrorService.startMirror()}
              disabled={!isConnected}
              className="px-5 py-2 rounded-xl bg-silver-100 text-charcoal-950 font-semibold text-xs hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              Start Screen Stream
            </button>
          </div>
        )}
      </div>

      {/* Bottom Phone Key Navigation Bar */}
      <div className="h-10 px-4 bg-charcoal-900 border-t border-white/10 flex items-center justify-between text-silver-300">
        {/* Hardware shortcuts left: Volume & Power */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => screenMirrorService.sendVolumeAdjust('down')}
            title="Volume Down"
            className="p-1.5 rounded-lg hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
          >
            <Volume1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => screenMirrorService.sendVolumeAdjust('up')}
            title="Volume Up"
            className="p-1.5 rounded-lg hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => screenMirrorService.sendNavButton('power')}
            title="Power / Lock Device"
            className="p-1.5 rounded-lg hover:bg-charcoal-800 text-silver-400 hover:text-white transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Standard Android Navigation Keys */}
        <div className="flex items-center space-x-10">
          {/* Back Button */}
          <button
            onClick={() => screenMirrorService.sendNavButton('back')}
            title="Back (ESC / Backspace)"
            className="p-2 rounded-lg hover:bg-charcoal-800 text-silver-300 hover:text-white transition-colors flex items-center justify-center group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Home Button */}
          <button
            onClick={() => screenMirrorService.sendNavButton('home')}
            title="Home"
            className="p-2 rounded-lg hover:bg-charcoal-800 text-silver-300 hover:text-white transition-colors flex items-center justify-center group"
          >
            <Circle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </button>

          {/* Recents Button */}
          <button
            onClick={() => screenMirrorService.sendNavButton('recents')}
            title="Recent Apps"
            className="p-2 rounded-lg hover:bg-charcoal-800 text-silver-300 hover:text-white transition-colors flex items-center justify-center group"
          >
            <SquareIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Right Info */}
        <div className="text-[10px] font-mono text-silver-500">
          {isStreaming ? `${width}×${height} px` : 'Disconnected'}
        </div>
      </div>
    </div>
  );
};
