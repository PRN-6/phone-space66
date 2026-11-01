import React, { useRef, useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { WindowInstance } from '../../types/window';

interface WindowFrameProps {
  window: WindowInstance;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ window: win, children }) => {
  const {
    bringToFront,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    snapWindow,
    setSnapPreview,
    updatePosition,
    updateSize,
    activeWindowId,
  } = useWindowStore();

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const pendingSnapRef = useRef<'left' | 'right' | 'top' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, winW: 0, winH: 0 });

  const isActive = activeWindowId === win.id;

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    bringToFront(win.id);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      winX: win.x,
      winY: win.y,
    };
  };

  const handleDoubleClickHeader = () => {
    maximizeWindow(win.id);
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    e.stopPropagation();
    bringToFront(win.id);
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      winW: win.width,
      winH: win.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        const newX = Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.winX + deltaX));
        const newY = Math.max(36, Math.min(window.innerHeight - 100, dragStartRef.current.winY + deltaY));
        updatePosition(win.id, newX, newY);

        // Edge snapping preview detection
        const topBarHeight = 36;
        const usableHeight = window.innerHeight - topBarHeight - 64;
        const halfWidth = Math.floor(window.innerWidth / 2);

        if (e.clientX <= 25) {
          pendingSnapRef.current = 'left';
          setSnapPreview({ x: 0, y: topBarHeight, width: halfWidth, height: usableHeight });
        } else if (e.clientX >= window.innerWidth - 25) {
          pendingSnapRef.current = 'right';
          setSnapPreview({ x: halfWidth, y: topBarHeight, width: halfWidth, height: usableHeight });
        } else if (e.clientY <= 30) {
          pendingSnapRef.current = 'top';
          setSnapPreview({ x: 0, y: topBarHeight, width: window.innerWidth, height: usableHeight });
        } else {
          pendingSnapRef.current = null;
          setSnapPreview(null);
        }
      } else if (isResizingRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        const newW = Math.max(win.minWidth, resizeStartRef.current.winW + deltaX);
        const newH = Math.max(win.minHeight, resizeStartRef.current.winH + deltaY);
        updateSize(win.id, newW, newH);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        if (pendingSnapRef.current) {
          snapWindow(win.id, pendingSnapRef.current);
          pendingSnapRef.current = null;
        }
        setSnapPreview(null);
      }
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [win.id, win.minWidth, win.minHeight, updatePosition, updateSize, snapWindow, setSnapPreview]);

  if (win.isMinimized) return null;

  return (
    <div
      onMouseDown={() => bringToFront(win.id)}
      style={{
        transform: `translate3d(${win.x}px, ${win.y}px, 0)`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      }}
      className={`fixed top-0 left-0 flex flex-col rounded-xl overflow-hidden shadow-window transition-shadow ${
        isActive
          ? 'ring-1 ring-white/20 bg-charcoal-900/95'
          : 'ring-1 ring-white/5 bg-charcoal-900/90'
      } backdrop-blur-2xl`}
    >
      {/* Window Title Bar */}
      <div
        onMouseDown={handleMouseDownHeader}
        onDoubleClick={handleDoubleClickHeader}
        className={`h-9 px-3 flex items-center justify-between select-none border-b ${
          isActive
            ? 'bg-charcoal-850 border-white/10 text-silver-100'
            : 'bg-charcoal-900 border-white/5 text-silver-500'
        } cursor-grab active:cursor-grabbing`}
      >
        {/* Title & Icon */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isActive ? 'bg-white shadow-[0_0_8px_#FFFFFF]' : 'bg-charcoal-600'
            }`}
          />
          <span className="font-semibold text-xs tracking-wide text-silver-200">{win.title}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => minimizeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => maximizeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-silver-400 hover:text-white hover:bg-charcoal-800 transition-colors"
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            {win.isMaximized ? <Copy className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-silver-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-auto bg-charcoal-950/80">{children}</div>

      {/* Resize Handle (Bottom-Right) */}
      {!win.isMaximized && (
        <div
          onMouseDown={handleMouseDownResize}
          className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize opacity-40 hover:opacity-100"
        >
          <div className="w-full h-full flex items-end justify-end p-0.5">
            <div className="w-1.5 h-1.5 border-r border-b border-silver-400" />
          </div>
        </div>
      )}
    </div>
  );
};
