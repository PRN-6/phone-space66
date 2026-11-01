export const PROTOCOL_VERSION = 1;
export const DEFAULT_WS_PORT = 6655;
export const DEFAULT_HTTP_PORT = 6656;

export type MessageType =
  | 'DISCOVER_PING'
  | 'DISCOVER_PONG'
  | 'PAIR_REQUEST'
  | 'PAIR_CHALLENGE'
  | 'PAIR_VERIFY'
  | 'PAIR_SUCCESS'
  | 'PAIR_REJECT'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'DEVICE_DISCONNECTED'
  | 'ERROR_RESPONSE'
  | 'DEVICE_INFO_REQUEST'
  | 'DEVICE_INFO_RESPONSE'
  | 'BATTERY_STATUS_UPDATE'
  | 'STORAGE_LIST_REQUEST'
  | 'STORAGE_LIST_RESPONSE'
  | 'APP_LIST_REQUEST'
  | 'APP_LIST_RESPONSE'
  | 'APP_LAUNCH_REQUEST'
  | 'APP_LAUNCH_RESPONSE'
  | 'SCREEN_MIRROR_START'
  | 'SCREEN_MIRROR_STOP'
  | 'SCREEN_MIRROR_STATUS';

export interface ProtocolMessage<T = unknown> {
  protocolVersion: number;
  messageId: string;
  requestId?: string;
  type: MessageType;
  timestamp: string;
  authToken?: string;
  payload: T;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  ipAddress: string;
  port: number;
  protocolVersion: number;
  lastSeen: number;
}

export interface DeviceHardwareInfo {
  manufacturer: string;
  model: string;
  marketName: string;
  androidVersion: string;
  sdkInt: number;
  uptimeMs: number;
  totalRamBytes?: number;
  availableRamBytes?: number;
}

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
  chargingSource: 'AC' | 'USB' | 'WIRELESS' | 'USB_PD' | 'NONE';
  temperatureCelsius: number;
  health: 'GOOD' | 'OVERHEAT' | 'DEAD' | 'OVER_VOLTAGE' | 'UNSPECIFIED_FAILURE' | 'COLD' | 'UNKNOWN';
}

export interface StorageMetrics {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
}

export interface NetworkInfo {
  ipAddress: string;
  ssid?: string;
  linkSpeedMbps?: number;
  isWifi: boolean;
  isHotspot: boolean;
}

export interface DeviceInfoResponsePayload {
  device: DeviceHardwareInfo;
  battery: BatteryInfo;
  storage: StorageMetrics;
  network: NetworkInfo;
}

export interface PairRequestPayload {
  desktopName: string;
  desktopId: string;
  publicKeyFingerprint?: string;
}

export interface PairChallengePayload {
  phoneName: string;
  phoneModel: string;
  challenge: string;
  pinRequired: boolean;
  pin?: string;
}

export interface PairVerifyPayload {
  pin: string;
  challengeResponse?: string;
}

export interface PairSuccessPayload {
  authToken: string;
  expiresAt: number;
  phoneId: string;
  phoneName: string;
}

export interface PairRejectPayload {
  reason: string;
}

export interface HeartbeatPayload {
  clientTimestamp: number;
}

export interface HeartbeatAckPayload {
  clientTimestamp: number;
  serverTimestamp: number;
}

export interface ErrorResponsePayload {
  code: string;
  message: string;
  details?: unknown;
}

