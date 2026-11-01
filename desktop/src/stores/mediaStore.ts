import { create } from 'zustand';
import { MediaPlaybackStatePayload } from '../types/protocol';

interface MediaState {
  playback: MediaPlaybackStatePayload;
  isWidgetVisible: boolean;

  setPlayback: (playback: MediaPlaybackStatePayload) => void;
  toggleWidget: (visible?: boolean) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  playback: {
    hasActiveSession: false,
    title: 'No media playing',
    artist: 'Standby',
    album: '',
    isPlaying: false,
    durationMs: 0,
    positionMs: 0,
    canSkipNext: true,
    canSkipPrev: true,
  },
  isWidgetVisible: false,

  setPlayback: (playback) => set({ playback }),
  toggleWidget: (visible) =>
    set((state) => ({
      isWidgetVisible: visible !== undefined ? visible : !state.isWidgetVisible,
    })),
}));
