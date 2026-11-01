/**
 * PHONE SPACE66 — Shared Protocol Definitions
 * Version: 1.0.0
 * Wire format: JSON over WebSocket (Control) / HTTP (Data)
 */

export const PROTOCOL_VERSION = 1;
export const DEFAULT_WS_PORT = 6655;
export const DEFAULT_HTTP_PORT = 6656;
export const SERVICE_TYPE = "_phonespace66._tcp";

export type MessageType =
  // Discovery & Pairing
  | "DISCOVER_PING"
  | "DISCOVER_PONG"
  | "PAIR_REQUEST"
  | "PAIR_CHALLENGE"
  | "PAIR_VERIFY"
  | "PAIR_SUCCESS"
  | "PAIR_REJECT"
  // Connection Lifecycle
  | "HEARTBEAT"
  | "HEARTBEAT_ACK"
  | "DEVICE_DISCONNECTED"
  | "ERROR_RESPONSE"
  // Device Diagnostics & Telemetry
  | "DEVICE_INFO_REQUEST"
  | "DEVICE_INFO_RESPONSE"
  | "BATTERY_STATUS_UPDATE"
  // Storage & Files (Phase 2)
  | "STORAGE_LIST_REQUEST"
  | "STORAGE_LIST_RESPONSE"
  | "FILE_UPLOAD_REQUEST"
  | "FILE_DOWNLOAD_REQUEST"
  | "FILE_TRANSFER_PROGRESS"
  | "FILE_TRANSFER_COMPLETE"
  | "FILE_TRANSFER_ERROR"
  | "FILE_OPERATION_REQUEST"
  | "FILE_OPERATION_RESPONSE"
  // Applications (Phase 4)
  | "APP_LIST_REQUEST"
  | "APP_LIST_RESPONSE"
  | "APP_LAUNCH_REQUEST"
  | "APP_LAUNCH_RESPONSE"
  // Screen Mirroring (Phase 5)
  | "SCREEN_MIRROR_START"
  | "SCREEN_MIRROR_STOP"
  | "SCREEN_MIRROR_STATUS"
  | "REMOTE_INPUT_EVENT"
  // Notifications & Clipboard (Phase 6)
  | "NOTIFICATION_EVENT"
  | "NOTIFICATION_ACTION"
  | "CLIPBOARD_UPDATE";

export interface ProtocolMessage<T = unknown> {
  protocolVersion: number;
  messageId: string;
  requestId?: string;
  type: MessageType;
  timestamp: string;
  authToken?: string;
  payload: T;
}

// -------------------------------------------------------------
// Discovery & Pairing Payloads
// -------------------------------------------------------------

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
  pin?: string; // Only presented on phone screen or for debug pairing
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

// -------------------------------------------------------------
// Device Diagnostics & Telemetry Payloads
// -------------------------------------------------------------

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
  level: number; // 0 - 100
  isCharging: boolean;
  chargingSource: "AC" | "USB" | "WIRELESS" | "USB_PD" | "NONE";
  temperatureCelsius: number;
  health: "GOOD" | "OVERHEAT" | "DEAD" | "OVER_VOLTAGE" | "UNSPECIFIED_FAILURE" | "COLD" | "UNKNOWN";
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

// -------------------------------------------------------------
// Heartbeat & Errors
// -------------------------------------------------------------

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

// -------------------------------------------------------------
// Helper Factory Functions
// -------------------------------------------------------------

export function createMessage<T>(
  type: MessageType,
  payload: T,
  authToken?: string,
  requestId?: string
): ProtocolMessage<T> {
  const randomUUID =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "msg-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();

  return {
    protocolVersion: PROTOCOL_VERSION,
    messageId: randomUUID,
    requestId,
    type,
    timestamp: new Date().toISOString(),
    authToken,
    payload,
  };
}

export function validateMessage(raw: unknown): ProtocolMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const msg = raw as Record<string, unknown>;

  if (typeof msg.protocolVersion !== "number" || msg.protocolVersion !== PROTOCOL_VERSION) {
    return null;
  }
  if (typeof msg.messageId !== "string" || !msg.messageId) return null;
  if (typeof msg.type !== "string" || !msg.type) return null;
  if (typeof msg.timestamp !== "string") return null;

  return raw as ProtocolMessage;
}

