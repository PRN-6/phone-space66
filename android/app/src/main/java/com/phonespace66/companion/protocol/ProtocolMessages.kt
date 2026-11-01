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

