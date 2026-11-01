package com.phonespace66.companion.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class ProtocolEnvelope(
    val protocolVersion: Int = 1,
    val messageId: String,
    val requestId: String? = null,
    val type: String,
    val timestamp: String,
    val authToken: String? = null,
    val payload: JsonElement
)

@Serializable
data class PairRequestPayload(
    val desktopName: String,
    val desktopId: String,
    val publicKeyFingerprint: String? = null
)

@Serializable
data class PairChallengePayload(
    val phoneName: String,
    val phoneModel: String,
    val challenge: String,
    val pinRequired: Boolean = true,
    val pin: String? = null
)

@Serializable
data class PairVerifyPayload(
    val pin: String,
    val challengeResponse: String? = null
)

@Serializable
data class PairSuccessPayload(
    val authToken: String,
    val expiresAt: Long,
    val phoneId: String,
    val phoneName: String
)

@Serializable
data class PairRejectPayload(
    val reason: String
)

@Serializable
data class DeviceHardwareInfo(
    val manufacturer: String,
    val model: String,
    val marketName: String,
    val androidVersion: String,
    val sdkInt: Int,
    val uptimeMs: Long,
    val totalRamBytes: Long? = null,
    val availableRamBytes: Long? = null
)

@Serializable
data class BatteryInfo(
    val level: Int,
    val isCharging: Boolean,
    val chargingSource: String,
    val temperatureCelsius: Float,
    val health: String
)

@Serializable
data class StorageMetrics(
    val totalBytes: Long,
    val availableBytes: Long,
    val usedBytes: Long
)

@Serializable
data class NetworkInfo(
    val ipAddress: String,
    val ssid: String? = null,
    val linkSpeedMbps: Int? = null,
    val isWifi: Boolean = true,
    val isHotspot: Boolean = false
)

@Serializable
data class DeviceInfoResponsePayload(
    val device: DeviceHardwareInfo,
    val battery: BatteryInfo,
    val storage: StorageMetrics,
    val network: NetworkInfo
)

// -------------------------------------------------------------
// Phase 2: Storage & File Transfer Models
// -------------------------------------------------------------

@Serializable
data class FileItem(
    val name: String,
    val path: String,
    val isDirectory: Boolean,
    val sizeBytes: Long,
    val modifiedAt: Long,
    val mimeType: String,
    val extension: String,
    val isWritable: Boolean = true,
    val thumbnailUrl: String? = null
)

@Serializable
data class StorageListRequestPayload(
    val path: String,
    val sortBy: String? = "name",
    val sortOrder: String? = "asc"
)

@Serializable
data class StorageListResponsePayload(
    val currentPath: String,
    val parentPath: String? = null,
    val entries: List<FileItem>,
    val totalEntries: Int
)

@Serializable
data class FileOperationRequestPayload(
    val action: String, // mkdir, rename, delete, copy, move
    val targetPath: String,
    val destinationPath: String? = null,
    val newFolderName: String? = null
)

@Serializable
data class FileOperationResponsePayload(
    val action: String,
    val success: Boolean,
    val targetPath: String,
    val destinationPath: String? = null,
    val error: String? = null
)

// -------------------------------------------------------------
// Phase 4: Application Integration Models
// -------------------------------------------------------------

@Serializable
data class AppInfo(
    val packageName: String,
    val appName: String,
    val versionName: String,
    val versionCode: Long,
    val isSystemApp: Boolean,
    val iconBase64: String? = null,
    val installedAt: Long? = null,
    val lastUpdatedAt: Long? = null
)

@Serializable
data class AppListRequestPayload(
    val includeSystemApps: Boolean = false,
    val filter: String? = null
)

@Serializable
data class AppListResponsePayload(
    val apps: List<AppInfo>,
    val totalCount: Int
)

@Serializable
data class AppLaunchRequestPayload(
    val packageName: String,
    val activityName: String? = null
)

@Serializable
data class AppLaunchResponsePayload(
    val packageName: String,
    val appName: String,
    val success: Boolean,
    val errorMessage: String? = null,
    val launchedAt: Long = System.currentTimeMillis()
)

// -------------------------------------------------------------
// Phase 5: Screen Mirroring & Remote Input Models
// -------------------------------------------------------------

@Serializable
data class ScreenMirrorConfig(
    val maxFps: Int = 60,
    val bitrateBps: Int = 4000000,
    val scaleFactor: Float = 1.0f,
    val quality: String = "high",
    val codec: String = "mjpeg"
)

@Serializable
data class ScreenMirrorStartPayload(
    val config: ScreenMirrorConfig? = null
)

@Serializable
data class ScreenMirrorStopPayload(
    val reason: String? = null
)

@Serializable
data class ScreenMirrorStatusPayload(
    val isStreaming: Boolean,
    val width: Int,
    val height: Int,
    val fps: Int,
    val bitrateBps: Int,
    val rotation: Int = 0,
    val streamUrl: String? = null,
    val codec: String = "mjpeg"
)

@Serializable
data class RemoteInputMetaKeys(
    val ctrlKey: Boolean = false,
    val shiftKey: Boolean = false,
    val altKey: Boolean = false,
    val metaKey: Boolean = false
)

@Serializable
data class RemoteInputEventPayload(
    val eventType: String,
    val x: Float? = null,
    val y: Float? = null,
    val navButton: String? = null,
    val volumeAdjust: String? = null,
    val text: String? = null,
    val keyCode: Int? = null,
    val metaKeys: RemoteInputMetaKeys? = null
)

@Serializable
data class RemoteInputResponsePayload(
    val success: Boolean,
    val eventType: String,
    val error: String? = null
)

// -------------------------------------------------------------
// Phase 6: Notifications, Clipboard, Media & Gallery Models
// -------------------------------------------------------------

@Serializable
data class PhoneNotification(
    val id: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val text: String,
    val postTime: Long,
    val isClearable: Boolean = true,
    val iconBase64: String? = null
)

@Serializable
data class NotificationDismissPayload(
    val notificationId: String
)

@Serializable
data class NotificationListResponsePayload(
    val notifications: List<PhoneNotification>,
    val totalCount: Int
)

@Serializable
data class ClipboardPayload(
    val text: String,
    val timestamp: Long,
    val source: String = "phone"
)

@Serializable
data class MediaPlaybackStatePayload(
    val hasActiveSession: Boolean,
    val packageName: String? = null,
    val appName: String? = null,
    val title: String? = null,
    val artist: String? = null,
    val album: String? = null,
    val isPlaying: Boolean = false,
    val durationMs: Long = 0L,
    val positionMs: Long = 0L,
    val albumArtUrl: String? = null,
    val canSkipNext: Boolean = true,
    val canSkipPrev: Boolean = true
)

@Serializable
data class MediaControlActionPayload(
    val action: String,
    val positionMs: Long? = null
)

@Serializable
data class GalleryItem(
    val id: String,
    val path: String,
    val name: String,
    val mimeType: String,
    val sizeBytes: Long,
    val modifiedAt: Long,
    val width: Int? = null,
    val height: Int? = null,
    val durationMs: Long? = null,
    val thumbnailUrl: String,
    val downloadUrl: String
)

@Serializable
data class GalleryListRequestPayload(
    val category: String? = "all",
    val limit: Int? = 50,
    val offset: Int? = 0
)

@Serializable
data class GalleryListResponsePayload(
    val items: List<GalleryItem>,
    val totalCount: Int,
    val category: String
)

@Serializable
data class HeartbeatPayload(
    val clientTimestamp: Long
)

@Serializable
data class HeartbeatAckPayload(
    val clientTimestamp: Long,
    val serverTimestamp: Long
)

@Serializable
data class ErrorResponsePayload(
    val code: String,
    val message: String,
    val details: String? = null
)
