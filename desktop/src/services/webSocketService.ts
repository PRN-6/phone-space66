import { useConnectionStore } from '../stores/connectionStore';
import { useDeviceStore } from '../stores/deviceStore';
import {
  createMessage,
  DEFAULT_WS_PORT,
  DeviceInfoResponsePayload,
  DiscoveredDevice,
  HeartbeatAckPayload,
  MessageType,
  PairChallengePayload,
  PairRejectPayload,
  PairRequestPayload,
  PairSuccessPayload,
  PairVerifyPayload,
  ProtocolMessage,
  PROTOCOL_VERSION,
} from '../types/protocol';

class WebSocketService {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private telemetryInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private targetDevice: DiscoveredDevice | null = null;
  private lastPingSentAt: number = 0;

  connect(device: DiscoveredDevice) {
    this.targetDevice = device;
    useConnectionStore.getState().setActiveDevice(device);
    useConnectionStore.getState().setStatus('connecting');
    useConnectionStore.getState().setError(null);

    const wsUrl = `ws://${device.ipAddress}:${device.port || DEFAULT_WS_PORT}/ws`;
    console.log(`Connecting to PHONE SPACE66 Companion at ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established with phone.');
        const token = useConnectionStore.getState().authToken;

        if (token) {
          // If we already have a saved pairing token, test authentication with DEVICE_INFO_REQUEST
          useConnectionStore.getState().setStatus('connected');
          this.startHeartbeat();
          this.requestDeviceInfo();
          import('./fileTransferService').then(({ fileTransferService }) => {
            fileTransferService.fetchDirectory('/storage/emulated/0');
          });
          import('./galleryService').then(({ galleryService }) => {
            galleryService.fetchGallery('all');
          });
        } else {
          // Need pairing: initiate PAIR_REQUEST
          this.initiatePairing();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          this.handleIncomingMessage(raw);
        } catch (err) {
          console.error('Failed to parse WebSocket JSON frame:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        useConnectionStore.getState().setError('Connection failed. Make sure phone companion is running.');
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed.');
        this.cleanup();
        useConnectionStore.getState().disconnect();
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
      useConnectionStore.getState().setError(String(err));
      useConnectionStore.getState().setStatus('error');
    }
  }

  private handleIncomingMessage(msg: ProtocolMessage<any>) {
    if (msg.protocolVersion !== PROTOCOL_VERSION) {
      console.warn(`Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${msg.protocolVersion}`);
      return;
    }

    switch (msg.type) {
      case 'PAIR_CHALLENGE': {
        const challengePayload = msg.payload as PairChallengePayload;
        useConnectionStore.getState().setStatus('pairing');
        useConnectionStore.getState().setPendingChallenge(challengePayload);
        useConnectionStore.getState().setShowPairingModal(true);
        break;
      }

      case 'PAIR_SUCCESS': {
        const successPayload = msg.payload as PairSuccessPayload;
        useConnectionStore.getState().setAuthToken(successPayload.authToken);
        useConnectionStore.getState().setStatus('connected');
        useConnectionStore.getState().setShowPairingModal(false);
        useConnectionStore.getState().setPendingChallenge(null);
        this.startHeartbeat();
        this.requestDeviceInfo();
        import('./fileTransferService').then(({ fileTransferService }) => {
          fileTransferService.fetchDirectory('/storage/emulated/0');
        });
        import('./galleryService').then(({ galleryService }) => {
          galleryService.fetchGallery('all');
        });
        import('./appService').then(({ appService }) => {
          appService.refreshApps();
        });
        import('./notificationService').then(({ notificationService }) => {
          notificationService.refreshNotifications();
        });
        import('./mediaService').then(({ mediaService }) => {
          mediaService.refreshPlaybackState();
        });
        break;
      }

      case 'PAIR_REJECT': {
        const rejectPayload = msg.payload as PairRejectPayload;
        useConnectionStore.getState().setError(`Pairing rejected: ${rejectPayload.reason}`);
        useConnectionStore.getState().setStatus('error');
        break;
      }

      case 'DEVICE_INFO_RESPONSE': {
        const telemetry = msg.payload as DeviceInfoResponsePayload;
        useDeviceStore.getState().setTelemetry(telemetry);

        // Update connectionStore hardware metadata
        useConnectionStore.getState().setDeviceMetadata({
          deviceModel: telemetry.device.model,
          manufacturer: telemetry.device.manufacturer,
          androidVersion: telemetry.device.androidVersion,
        });

        const transports = (telemetry as unknown as { transports?: { mtp?: string; adb?: string } }).transports;
        if (transports) {
          if (transports.mtp === 'LOCKED_OR_CHARGING_ONLY') {
            useConnectionStore.getState().setStatus(
              'awaiting_usb_mode',
              'Phone screen is locked. Please unlock screen and select "File Transfer" in phone notifications.'
            );
          } else if (transports.adb === 'UNAUTHORIZED') {
            useConnectionStore.getState().setStatus(
              'awaiting_adb_authorization',
              'Please approve USB debugging authorization prompt on your phone.'
            );
          } else if (transports.mtp === 'READY') {
            useConnectionStore.getState().setStatus(
              'connected',
              `${telemetry.device.model} connected and ready.`
            );
          }
        }
        break;
      }

      case 'DEVICE_ATTACHED': {
        console.log('[WS] Physical Android device attached:', msg.payload?.device);
        useConnectionStore.getState().setStatus('device_detected', 'Phone detected via USB. Initializing...');
        this.requestDeviceInfo();
        break;
      }

      case 'STORAGE_UNLOCKED': {
        console.log('[WS] MTP storage unlocked by user on phone.');
        useConnectionStore.getState().setStatus('connected', 'Phone storage unlocked and active.');
        this.requestDeviceInfo();
        import('./fileTransferService').then(({ fileTransferService }) => {
          fileTransferService.fetchDirectory('/storage/emulated/0');
        });
        break;
      }

      case 'DEVICE_DISCONNECTED': {
        console.log('[WS] Phone physically disconnected.');
        useConnectionStore.getState().setStatus('disconnected', 'Phone disconnected from USB.');
        import('../stores/fileManagerStore').then(({ useFileManagerStore }) => {
          useFileManagerStore.getState().setCurrentDirectory(
            '/storage/emulated/0',
            null,
            [],
            'DEVICE_DISCONNECTED',
            'Phone disconnected from USB.'
          );
        });
        break;
      }

      case 'HARDWARE_STATUS_RESPONSE': {
        console.log('[WS] Received hardware status response:', msg.payload);
        break;
      }

      case 'STORAGE_LIST_RESPONSE': {
        import('./fileTransferService').then(({ fileTransferService }) => {
          fileTransferService.handleStorageListResponse(msg.payload);
        });
        break;
      }

      case 'FILE_OPERATION_RESPONSE': {
        import('./fileTransferService').then(({ fileTransferService }) => {
          fileTransferService.handleFileOperationResponse(msg.payload);
        });
        break;
      }

      case 'APP_LIST_RESPONSE': {
        import('./appService').then(({ appService }) => {
          appService.handleAppListResponse(msg.payload);
        });
        break;
      }

      case 'APP_LAUNCH_RESPONSE': {
        import('./appService').then(({ appService }) => {
          appService.handleAppLaunchResponse(msg.payload);
        });
        break;
      }

      case 'SCREEN_MIRROR_STATUS': {
        import('./screenMirrorService').then(({ screenMirrorService }) => {
          screenMirrorService.handleScreenMirrorStatus(msg.payload);
        });
        break;
      }

      case 'REMOTE_INPUT_RESPONSE': {
        import('./screenMirrorService').then(({ screenMirrorService }) => {
          screenMirrorService.handleRemoteInputResponse(msg.payload);
        });
        break;
      }

      // Phase 6
      case 'NOTIFICATION_LIST_RESPONSE': {
        import('./notificationService').then(({ notificationService }) => {
          notificationService.handleNotificationListResponse(msg.payload);
        });
        break;
      }

      case 'NOTIFICATION_POSTED': {
        import('./notificationService').then(({ notificationService }) => {
          notificationService.handleNotificationPosted(msg.payload);
        });
        break;
      }

      case 'NOTIFICATION_REMOVED': {
        import('./notificationService').then(({ notificationService }) => {
          notificationService.handleNotificationRemoved(msg.payload?.notificationId);
        });
        break;
      }

      case 'CLIPBOARD_SYNC': {
        import('./clipboardService').then(({ clipboardService }) => {
          clipboardService.handleClipboardSync(msg.payload);
        });
        break;
      }

      case 'MEDIA_PLAYBACK_STATE': {
        import('./mediaService').then(({ mediaService }) => {
          mediaService.handlePlaybackState(msg.payload);
        });
        break;
      }

      case 'GALLERY_LIST_RESPONSE': {
        import('./galleryService').then(({ galleryService }) => {
          galleryService.handleGalleryListResponse(msg.payload);
        });
        break;
      }

      case 'HEARTBEAT_ACK': {
        const ack = msg.payload as HeartbeatAckPayload;
        const now = Date.now();
        const latency = Math.max(1, Math.round(now - ack.clientTimestamp));
        useConnectionStore.getState().setLatencyMs(latency);
        break;
      }

      case 'ERROR_RESPONSE': {
        console.warn('Companion returned error:', msg.payload);
        if (msg.payload?.code === 'AUTH_REQUIRED') {
          useConnectionStore.getState().setAuthToken(null);
          this.initiatePairing();
        }
        break;
      }

      default:
        console.log('Unhandled message type:', msg.type);
    }
  }

  initiatePairing() {
    useConnectionStore.getState().setStatus('pairing');
    const payload: PairRequestPayload = {
      desktopName: 'PHONE SPACE66 Desktop',
      desktopId: 'desktop-' + Math.random().toString(36).substring(2, 9),
    };
    this.send('PAIR_REQUEST', payload);
  }

  submitPairingPin(pin: string) {
    const payload: PairVerifyPayload = { pin: pin.trim() };
    this.send('PAIR_VERIFY', payload);
  }

  requestDeviceInfo() {
    const token = useConnectionStore.getState().authToken;
    this.send('DEVICE_INFO_REQUEST', {}, token || undefined);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    // Heartbeat every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      this.lastPingSentAt = Date.now();
      this.send('HEARTBEAT', { clientTimestamp: this.lastPingSentAt });
    }, 5000);

    // Refresh telemetry every 10 seconds
    this.telemetryInterval = setInterval(() => {
      this.requestDeviceInfo();
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    this.heartbeatInterval = null;
    this.telemetryInterval = null;
  }

  isOpen(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  sendMessage<T>(type: MessageType, payload: T, authToken?: string) {
    this.send(type, payload, authToken);
  }

  send<T>(type: MessageType, payload: T, authToken?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, WebSocket not open');
      return;
    }

    const token = authToken || useConnectionStore.getState().authToken || undefined;
    const msg: ProtocolMessage<T> = {
      protocolVersion: PROTOCOL_VERSION,
      messageId: 'msg-' + Math.random().toString(36).substring(2, 10),
      type,
      timestamp: new Date().toISOString(),
      authToken: token,
      payload,
    };

    this.ws.send(JSON.stringify(msg));
  }

  disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useConnectionStore.getState().disconnect();
    useDeviceStore.getState().clearTelemetry();
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }
}

export const webSocketService = new WebSocketService();

