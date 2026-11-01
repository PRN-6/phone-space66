import { webSocketService } from './webSocketService';
import { useScreenMirrorStore } from '../stores/screenMirrorStore';
import { useConnectionStore } from '../stores/connectionStore';
import {
  ScreenMirrorStartPayload,
  ScreenMirrorStopPayload,
  ScreenMirrorStatusPayload,
  RemoteInputEventPayload,
  RemoteInputResponsePayload,
  NavButtonType,
  VolumeAdjustType,
} from '../types/protocol';

class ScreenMirrorService {
  private throttledMoveTimeout: number | null = null;
  private lastMoveX = -1;
  private lastMoveY = -1;

  public startMirror() {
    const store = useScreenMirrorStore.getState();
    store.setConnecting(true);
    store.setError(null);

    const quality = store.quality;
    const bitrate = quality === 'high' ? 6000000 : quality === 'medium' ? 3500000 : 1800000;
    const scale = quality === 'high' ? 1.0 : quality === 'medium' ? 0.75 : 0.5;

    const payload: ScreenMirrorStartPayload = {
      config: {
        maxFps: quality === 'high' ? 60 : 30,
        bitrateBps: bitrate,
        scaleFactor: scale,
        quality: store.quality,
        codec: 'mjpeg',
      },
    };

    webSocketService.sendMessage('SCREEN_MIRROR_START', payload);
  }

  public stopMirror(reason = 'Desktop user closed screen mirror') {
    const store = useScreenMirrorStore.getState();
    store.reset();

    const payload: ScreenMirrorStopPayload = { reason };
    webSocketService.sendMessage('SCREEN_MIRROR_STOP', payload);
  }

  public queryStatus() {
    webSocketService.sendMessage('SCREEN_MIRROR_STATUS', {});
  }

  public sendPointerDown(normalizedX: number, normalizedY: number) {
    const payload: RemoteInputEventPayload = {
      eventType: 'pointer_down',
      x: normalizedX,
      y: normalizedY,
    };
    webSocketService.sendMessage('REMOTE_INPUT_EVENT', payload);
  }

  public sendPointerMove(normalizedX: number, normalizedY: number) {
    this.lastMoveX = normalizedX;
    this.lastMoveY = normalizedY;

    if (this.throttledMoveTimeout) return;

    this.throttledMoveTimeout = window.setTimeout(() => {
      this.throttledMoveTimeout = null;
      const payload: RemoteInputEventPayload = {
        eventType: 'pointer_move',
        x: this.lastMoveX,
        y: this.lastMoveY,
      };
      webSocketService.sendMessage('REMOTE_INPUT_EVENT', payload);
    }, 20); // 50Hz pointer move throttling
  }

  public sendPointerUp(normalizedX: number, normalizedY: number) {
    if (this.throttledMoveTimeout) {
      window.clearTimeout(this.throttledMoveTimeout);
      this.throttledMoveTimeout = null;
    }

    const payload: RemoteInputEventPayload = {
      eventType: 'pointer_up',
      x: normalizedX,
      y: normalizedY,
    };
    webSocketService.sendMessage('REMOTE_INPUT_EVENT', payload);
  }

  public sendNavButton(navButton: NavButtonType) {
    const payload: RemoteInputEventPayload = {
      eventType: 'nav_button',
      navButton,
    };
    webSocketService.sendMessage('REMOTE_INPUT_EVENT', payload);
  }

  public sendVolumeAdjust(volumeAdjust: VolumeAdjustType) {
    const payload: RemoteInputEventPayload = {
      eventType: 'volume_adjust',
      volumeAdjust,
    };
    webSocketService.sendMessage('REMOTE_INPUT_EVENT', payload);
  }

  public sendTextInput(text: string) {
    if (!text) return;
    const payload: RemoteInputEventPayload = {
      eventType: 'text',
      text,
    };
    webSocketService.sendMessage('REMOTE_INPUT_EVENT', payload);
  }

  public handleScreenMirrorStatus(payload: ScreenMirrorStatusPayload) {
    const store = useScreenMirrorStore.getState();
    store.setStatus(payload);
  }

  public handleRemoteInputResponse(payload: RemoteInputResponsePayload) {
    if (!payload.success && payload.error) {
      console.warn(`Remote input action [${payload.eventType}] failed: ${payload.error}`);
    }
  }

  public getStreamUrl(): string | null {
    const conn = useConnectionStore.getState();
    const token = conn.authToken;
    const ip = conn.targetIp || '127.0.0.1';
    const port = conn.targetHttpPort || 6656;

    if (!token) return null;
    return `http://${ip}:${port}/screen/stream?token=${encodeURIComponent(token)}&t=${Date.now()}`;
  }
}

export const screenMirrorService = new ScreenMirrorService();

