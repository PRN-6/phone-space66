package com.phonespace66.companion.networking

import android.content.Context
import android.os.Build
import android.util.Log
import com.phonespace66.companion.applications.AppManager
import com.phonespace66.companion.core.Constants
import com.phonespace66.companion.device.DeviceTelemetryManager
import com.phonespace66.companion.pairing.PairingManager
import com.phonespace66.companion.protocol.*
import com.phonespace66.companion.storage.AndroidStorageManager
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.consumeEach
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.time.Duration
import java.time.Instant
import java.util.UUID

class CompanionWebSocketServer(
    private val context: Context,
    private val pairingManager: PairingManager,
    private val telemetryManager: DeviceTelemetryManager,
    private val storageManager: AndroidStorageManager,
    private val appManager: AppManager
) {
    private val TAG = "CompanionServer"
    private var serverEngine: CIOApplicationEngine? = null
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serverScope = CoroutineScope(Dispatchers.IO + Job())

    private val _isConnected = MutableStateFlow(false)
    val isConnected = _isConnected.asStateFlow()

    private val _connectedDesktopName = MutableStateFlow<String?>(null)
    val connectedDesktopName = _connectedDesktopName.asStateFlow()

    fun start(port: Int = Constants.DEFAULT_WS_PORT) {
        if (serverEngine != null) return

        try {
            serverEngine = embeddedServer(CIO, port = port, host = "0.0.0.0") {
                install(WebSockets) {
                    pingPeriod = Duration.ofSeconds(15)
                    timeout = Duration.ofSeconds(30)
                    maxFrameSize = Long.MAX_VALUE
                    masking = false
                }

                routing {
                    webSocket("/ws") {
                        Log.i(TAG, "Client connected via WebSocket")
                        _isConnected.value = true

                        try {
                            incoming.consumeEach { frame ->
                                if (frame is Frame.Text) {
                                    val text = frame.readText()
                                    handleIncomingMessage(text, this)
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "WebSocket session error", e)
                        } finally {
                            Log.i(TAG, "Client disconnected")
                            _isConnected.value = false
                            _connectedDesktopName.value = null
                        }
                    }
                }
            }.start(wait = false)
            Log.i(TAG, "Companion WebSocket server started on port $port")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start server on port $port", e)
        }
    }

    fun stop() {
        try {
            serverEngine?.stop(1000, 2000)
            serverEngine = null
            _isConnected.value = false
            _connectedDesktopName.value = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server", e)
        }
    }

    private suspend fun handleIncomingMessage(rawJson: String, session: DefaultWebSocketSession) {
        try {
            val element = json.parseToJsonElement(rawJson).jsonObject
            val version = element["protocolVersion"]?.jsonPrimitive?.int ?: 0
            val messageId = element["messageId"]?.jsonPrimitive?.content ?: UUID.randomUUID().toString()
            val requestId = element["requestId"]?.jsonPrimitive?.contentOrNull
            val type = element["type"]?.jsonPrimitive?.content ?: return
            val authToken = element["authToken"]?.jsonPrimitive?.contentOrNull
            val payload = element["payload"] ?: JsonObject(emptyMap())

            Log.d(TAG, "Received message: $type [msgId=$messageId]")

            when (type) {
                Constants.TYPE_PAIR_REQUEST -> {
                    val pairReq = json.decodeFromJsonElement<PairRequestPayload>(payload)
                    _connectedDesktopName.value = pairReq.desktopName
                    val pending = pairingManager.createChallenge(pairReq.desktopName, pairReq.desktopId)

                    val challengePayload = PairChallengePayload(
                        phoneName = "${Build.MANUFACTURER} ${Build.MODEL}",
                        phoneModel = Build.MODEL,
                        challenge = pending.challenge,
                        pinRequired = true,
                        pin = pending.pin
                    )

                    sendEnvelope(session, Constants.TYPE_PAIR_CHALLENGE, json.encodeToJsonElement(challengePayload), requestId)
                }

                Constants.TYPE_PAIR_VERIFY -> {
                    val verifyReq = json.decodeFromJsonElement<PairVerifyPayload>(payload)
                    val isValid = pairingManager.verifyPin(verifyReq.pin)
                    if (isValid) {
                        val successData = pairingManager.approvePairing()
                        if (successData != null) {
                            val successPayload = PairSuccessPayload(
                                authToken = successData.authToken,
                                expiresAt = successData.expiresAt,
                                phoneId = Build.FINGERPRINT,
                                phoneName = "${Build.MANUFACTURER} ${Build.MODEL}"
                            )
                            sendEnvelope(session, Constants.TYPE_PAIR_SUCCESS, json.encodeToJsonElement(successPayload), requestId)
                        } else {
                            sendError(session, "PAIRING_FAILED", "Unable to complete pairing session", requestId)
                        }
                    } else {
                        val rejectPayload = PairRejectPayload(reason = "Invalid 6-digit PIN entered")
                        sendEnvelope(session, Constants.TYPE_PAIR_REJECT, json.encodeToJsonElement(rejectPayload), requestId)
                    }
                }

                Constants.TYPE_HEARTBEAT -> {
                    val hb = json.decodeFromJsonElement<HeartbeatPayload>(payload)
                    val ack = HeartbeatAckPayload(
                        clientTimestamp = hb.clientTimestamp,
                        serverTimestamp = System.currentTimeMillis()
                    )
                    sendEnvelope(session, Constants.TYPE_HEARTBEAT_ACK, json.encodeToJsonElement(ack), requestId)
                }

                Constants.TYPE_DEVICE_INFO_REQUEST -> {
                    if (!pairingManager.validateToken(authToken)) {
                        sendError(session, "AUTH_REQUIRED", "Valid pairing token required", requestId)
                        return
                    }
                    val telemetry = telemetryManager.getFullTelemetry()
                    sendEnvelope(session, Constants.TYPE_DEVICE_INFO_RESPONSE, json.encodeToJsonElement(telemetry), requestId)
                }

                // Phase 2: Storage List Request
                "STORAGE_LIST_REQUEST" -> {
                    if (!pairingManager.validateToken(authToken)) {
                        sendError(session, "AUTH_REQUIRED", "Valid pairing token required", requestId)
                        return
                    }
                    val req = json.decodeFromJsonElement<StorageListRequestPayload>(payload)
                    try {
                        val listing = storageManager.listDirectory(
                            rawPath = req.path,
                            sortBy = req.sortBy ?: "name",
                            sortOrder = req.sortOrder ?: "asc"
                        )
                        sendEnvelope(session, "STORAGE_LIST_RESPONSE", json.encodeToJsonElement(listing), requestId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Storage listing failed for path: ${req.path}", e)
                        sendError(session, "STORAGE_ERROR", e.message ?: "Failed to list directory", requestId)
                    }
                }

                // Phase 2: File Operation Request (mkdir, rename, delete, etc.)
                "FILE_OPERATION_REQUEST" -> {
                    if (!pairingManager.validateToken(authToken)) {
                        sendError(session, "AUTH_REQUIRED", "Valid pairing token required", requestId)
                        return
                    }
                    val req = json.decodeFromJsonElement<FileOperationRequestPayload>(payload)
                    try {
                        when (req.action) {
                            "mkdir" -> {
                                val folderName = req.newFolderName ?: "New Folder"
                                val created = storageManager.createDirectory(req.targetPath, folderName)
                                val res = FileOperationResponsePayload(
                                    action = "mkdir",
                                    success = true,
                                    targetPath = req.targetPath,
                                    destinationPath = created
                                )
                                sendEnvelope(session, "FILE_OPERATION_RESPONSE", json.encodeToJsonElement(res), requestId)
                            }
                            "rename" -> {
                                val newName = req.destinationPath ?: req.newFolderName ?: ""
                                val renamed = storageManager.renameFile(req.targetPath, newName)
                                val res = FileOperationResponsePayload(
                                    action = "rename",
                                    success = true,
                                    targetPath = req.targetPath,
                                    destinationPath = renamed
                                )
                                sendEnvelope(session, "FILE_OPERATION_RESPONSE", json.encodeToJsonElement(res), requestId)
                            }
                            "delete" -> {
                                val deleted = storageManager.deleteFile(req.targetPath)
                                val res = FileOperationResponsePayload(
                                    action = "delete",
                                    success = deleted,
                                    targetPath = req.targetPath
                                )
                                sendEnvelope(session, "FILE_OPERATION_RESPONSE", json.encodeToJsonElement(res), requestId)
                            }
                            else -> {
                                sendError(session, "UNSUPPORTED_ACTION", "Action not supported: ${req.action}", requestId)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "File operation failed: ${req.action} on ${req.targetPath}", e)
                        sendError(session, "OPERATION_FAILED", e.message ?: "File operation failed", requestId)
                    }
                }

                // Phase 4: Installed Applications Listing
                "APP_LIST_REQUEST" -> {
                    if (!pairingManager.validateToken(authToken)) {
                        sendError(session, "AUTH_REQUIRED", "Valid pairing token required", requestId)
                        return
                    }
                    val req = try {
                        json.decodeFromJsonElement<AppListRequestPayload>(payload)
                    } catch (_: Exception) {
                        AppListRequestPayload()
                    }
                    try {
                        val appList = appManager.getInstalledApps(
                            includeSystemApps = req.includeSystemApps,
                            filter = req.filter
                        )
                        sendEnvelope(session, "APP_LIST_RESPONSE", json.encodeToJsonElement(appList), requestId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to get installed apps", e)
                        sendError(session, "APP_LIST_ERROR", e.message ?: "Failed to query applications", requestId)
                    }
                }

                // Phase 4: Application Launch Request
                "APP_LAUNCH_REQUEST" -> {
                    if (!pairingManager.validateToken(authToken)) {
                        sendError(session, "AUTH_REQUIRED", "Valid pairing token required", requestId)
                        return
                    }
                    val req = json.decodeFromJsonElement<AppLaunchRequestPayload>(payload)
                    try {
                        val result = appManager.launchApp(
                            packageName = req.packageName,
                            activityName = req.activityName
                        )
                        sendEnvelope(session, "APP_LAUNCH_RESPONSE", json.encodeToJsonElement(result), requestId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to launch app: ${req.packageName}", e)
                        sendError(session, "LAUNCH_ERROR", e.message ?: "Failed to launch app", requestId)
                    }
                }

                else -> {
                    Log.w(TAG, "Unhandled message type: $type")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse incoming message", e)
            sendError(session, "PARSE_ERROR", e.message ?: "Invalid JSON envelope", null)
        }
    }

    private suspend fun sendEnvelope(
        session: DefaultWebSocketSession,
        type: String,
        payloadElement: JsonElement,
        requestId: String? = null
    ) {
        val envelope = buildJsonObject {
            put("protocolVersion", Constants.PROTOCOL_VERSION)
            put("messageId", UUID.randomUUID().toString())
            if (requestId != null) put("requestId", requestId)
            put("type", type)
            put("timestamp", Instant.now().toString())
            put("payload", payloadElement)
        }
        val outString = json.encodeToString(JsonObject.serializer(), envelope)
        session.send(Frame.Text(outString))
    }

    private suspend fun sendError(
        session: DefaultWebSocketSession,
        code: String,
        message: String,
        requestId: String?
    ) {
        val err = ErrorResponsePayload(code = code, message = message)
        sendEnvelope(session, Constants.TYPE_ERROR_RESPONSE, json.encodeToJsonElement(err), requestId)
    }
}
