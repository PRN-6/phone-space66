import { webSocketService } from './webSocketService';
import { ClipboardPayload } from '../types/protocol';

class ClipboardService {
  private isSyncEnabled = true;
  private lastSyncedText = '';

  public setSyncEnabled(enabled: boolean) {
    this.isSyncEnabled = enabled;
  }

  public getSyncEnabled(): boolean {
    return this.isSyncEnabled;
  }

  /**
   * Called when phone sends copied text to desktop.
   */
  public handleClipboardSync(payload: ClipboardPayload) {
    if (!this.isSyncEnabled || !payload.text) return;
    if (payload.text === this.lastSyncedText) return;

    this.lastSyncedText = payload.text;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload.text).catch((err) => {
          console.warn('Could not write to desktop clipboard:', err);
        });
      }
    } catch (e) {
      console.warn('Clipboard write exception:', e);
    }
  }

  /**
   * Sends desktop copied text to phone.
   */
  public sendTextToPhone(text: string) {
    if (!this.isSyncEnabled || !text || text === this.lastSyncedText) return;
    this.lastSyncedText = text;

    const payload: ClipboardPayload = {
      text,
      timestamp: Date.now(),
      source: 'desktop',
    };
    webSocketService.sendMessage('CLIPBOARD_SYNC', payload);
  }
}

export const clipboardService = new ClipboardService();
