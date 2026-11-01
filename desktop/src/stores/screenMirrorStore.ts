import { create } from 'zustand';
import { ScreenMirrorStatusPayload } from '../types/protocol';

export type MirrorQuality = 'low' | 'medium' | 'high';

interface ScreenMirrorState {
  isStreaming: boolean;
  isConnecting: boolean;
  error: string | null;
  width: number;
  height: number;
  fps: number;
  bitrateBps: number;
  rotation: number;
  quality: MirrorQuality;
  scaleFactor: number;
  streamUrl: string | null;
  lastFrameTimestamp: number;
  latencyMs: number;
  isFullscreen: boolean;
  isInputActive: boolean;

  setStatus: (status: ScreenMirrorStatusPayload) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  setQuality: (quality: MirrorQuality) => void;
  setRotation: (rotation: number) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  updateMetrics: (fps: number, latencyMs: number) => void;
  reset: () => void;
}

export const useScreenMirrorStore = create<ScreenMirrorState>((set) => ({
  isStreaming: false,
  isConnecting: false,
  error: null,
  width: 1080,
  height: 2400,
  fps: 0,
  bitrateBps: 0,
  rotation: 0,
  quality: 'high',
  scaleFactor: 1.0,
  streamUrl: null,
  lastFrameTimestamp: 0,
  latencyMs: 16,
  isFullscreen: false,
  isInputActive: true,

  setStatus: (status) =>
    set({
      isStreaming: status.isStreaming,
      isConnecting: false,
      error: null,
      width: status.width,
      height: status.height,
      fps: status.fps,
      bitrateBps: status.bitrateBps,
      rotation: status.rotation,
      streamUrl: status.streamUrl,
      lastFrameTimestamp: Date.now(),
    }),

  setConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error, isConnecting: false }),
  setQuality: (quality) => set({ quality }),
  setRotation: (rotation) => set({ rotation }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  updateMetrics: (fps, latencyMs) => set({ fps, latencyMs }),
  reset: () =>
    set({
      isStreaming: false,
      isConnecting: false,
      error: null,
      fps: 0,
      bitrateBps: 0,
      streamUrl: null,
    }),
}));
