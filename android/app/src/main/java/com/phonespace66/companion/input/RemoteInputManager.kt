package com.phonespace66.companion.input

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import com.phonespace66.companion.protocol.RemoteInputEventPayload
import com.phonespace66.companion.protocol.RemoteInputResponsePayload
import kotlin.math.hypot

/**
 * Translates incoming desktop remote input events (touch coordinates, keys, nav buttons)
 * into native Android accessibility gestures and system actions.
 */
class RemoteInputManager(private val context: Context) {

    companion object {
        private const val TAG = "RemoteInputManager"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    // Pointer gesture tracking
    private var lastDownX = 0f
    private var lastDownY = 0f
    private var lastDownTime = 0L

    fun getScreenDimensions(): Pair<Int, Int> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val metrics = windowManager.currentWindowMetrics
            val bounds = metrics.bounds
            Pair(bounds.width(), bounds.height())
        } else {
            val dm = DisplayMetrics()
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getRealMetrics(dm)
            Pair(dm.widthPixels, dm.heightPixels)
        }
    }

    /**
     * Dispatches an incoming remote input event.
     */
    fun handleInputEvent(payload: RemoteInputEventPayload): RemoteInputResponsePayload {
        val service = PhoneSpaceAccessibilityService.instance
        val (screenWidth, screenHeight) = getScreenDimensions()

        return try {
            when (payload.eventType) {
                "pointer_down" -> {
                    val nx = payload.x ?: 0.5f
                    val ny = payload.y ?: 0.5f
                    lastDownX = (nx * screenWidth).coerceIn(0f, screenWidth.toFloat())
                    lastDownY = (ny * screenHeight).coerceIn(0f, screenHeight.toFloat())
                    lastDownTime = System.currentTimeMillis()

                    RemoteInputResponsePayload(success = true, eventType = payload.eventType)
                }

                "pointer_move" -> {
                    // Coordinates tracked for drag/swipe calculations
                    RemoteInputResponsePayload(success = true, eventType = payload.eventType)
                }

                "pointer_up" -> {
                    val nx = payload.x ?: (lastDownX / screenWidth)
                    val ny = payload.y ?: (lastDownY / screenHeight)
                    val upX = (nx * screenWidth).coerceIn(0f, screenWidth.toFloat())
                    val upY = (ny * screenHeight).coerceIn(0f, screenHeight.toFloat())
                    val duration = (System.currentTimeMillis() - lastDownTime).coerceAtLeast(30L)
                    val distance = hypot((upX - lastDownX).toDouble(), (upY - lastDownY).toDouble())

                    if (service == null) {
                        return RemoteInputResponsePayload(
                            success = false,
                            eventType = payload.eventType,
                            error = "Accessibility service not enabled on Android device. Please enable in Settings > Accessibility."
                        )
                    }

                    val success = if (distance < 24.0 && duration < 350L) {
                        // Single Tap
                        service.injectTap(upX, upY, durationMs = 50L)
                    } else {
                        // Swipe or Drag
                        service.injectSwipe(lastDownX, lastDownY, upX, upY, durationMs = duration.coerceIn(80L, 800L))
                    }

                    RemoteInputResponsePayload(success = success, eventType = payload.eventType)
                }

                "nav_button" -> {
                    val button = payload.navButton ?: return RemoteInputResponsePayload(
                        success = false,
                        eventType = payload.eventType,
                        error = "Missing navButton specification"
                    )

                    if (service == null) {
                        return RemoteInputResponsePayload(
                            success = false,
                            eventType = payload.eventType,
                            error = "Accessibility service not active for global navigation actions"
                        )
                    }

                    val success = service.triggerGlobalAction(button)
                    RemoteInputResponsePayload(success = success, eventType = payload.eventType)
                }

                "volume_adjust" -> {
                    val adjust = payload.volumeAdjust ?: "up"
                    when (adjust.lowercase()) {
                        "up" -> audioManager.adjustVolume(AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                        "down" -> audioManager.adjustVolume(AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
                        "mute" -> audioManager.adjustVolume(AudioManager.ADJUST_TOGGLE_MUTE, AudioManager.FLAG_SHOW_UI)
                    }
                    RemoteInputResponsePayload(success = true, eventType = payload.eventType)
                }

                "text" -> {
                    val textToInsert = payload.text ?: ""
                    if (service == null) {
                        return RemoteInputResponsePayload(
                            success = false,
                            eventType = payload.eventType,
                            error = "Accessibility service not active for text insertion"
                        )
                    }
                    val success = service.injectText(textToInsert)
                    RemoteInputResponsePayload(success = success, eventType = payload.eventType)
                }

                else -> {
                    RemoteInputResponsePayload(
                        success = false,
                        eventType = payload.eventType,
                        error = "Unsupported remote input event: ${payload.eventType}"
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling remote input event: ${payload.eventType}", e)
            RemoteInputResponsePayload(
                success = false,
                eventType = payload.eventType,
                error = e.message ?: "Input event dispatch failed"
            )
        }
    }
}
