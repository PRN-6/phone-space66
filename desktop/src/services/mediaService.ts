import { webSocketService } from './webSocketService';
import { useMediaStore } from '../stores/mediaStore';
import {
  MediaPlaybackStatePayload,
  MediaControlActionPayload,
} from '../types/protocol';

class MediaService {
  public refreshPlaybackState() {
    webSocketService.sendMessage('MEDIA_PLAYBACK_STATE', {});
  }

  public sendAction(action: 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek', positionMs?: number) {
    const payload: MediaControlActionPayload = { action, positionMs };
    webSocketService.sendMessage('MEDIA_CONTROL_ACTION', payload);
  }

  public handlePlaybackState(payload: MediaPlaybackStatePayload) {
    useMediaStore.getState().setPlayback(payload);
  }
}

export const mediaService = new MediaService();
