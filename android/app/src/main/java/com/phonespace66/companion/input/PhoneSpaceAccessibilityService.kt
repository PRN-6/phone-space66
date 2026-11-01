package com.phonespace66.companion.input

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Android Accessibility Service for PHONE SPACE66 Companion.
 * Enables remote touch injection (clicks, swipes), navigation keys, and text input without requiring root.
 */
class PhoneSpaceAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PhoneSpaceAccessibility"
        var instance: PhoneSpaceAccessibilityService? = null
            private set

        val isServiceActive: Boolean
            get() = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "PhoneSpaceAccessibilityService connected and ready for input events")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Passive monitoring
    }

    override fun onInterrupt() {
        Log.w(TAG, "PhoneSpaceAccessibilityService interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
        Log.i(TAG, "PhoneSpaceAccessibilityService destroyed")
    }

    /**
     * Injects a touch tap event at specific screen coordinates (px).
     */
    fun injectTap(x: Float, y: Float, durationMs: Long = 60L, onComplete: ((Boolean) -> Unit)? = null): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false

        val path = Path().apply {
            moveTo(x, y)
        }

        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs.coerceAtLeast(10L))
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        return dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                onComplete?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                onComplete?.invoke(false)
            }
        }, null)
    }

    /**
     * Injects a touch swipe/drag from (startX, startY) to (endX, endY) in screen coordinates (px).
     */
    fun injectSwipe(
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        durationMs: Long = 200L,
        onComplete: ((Boolean) -> Unit)? = null
    ): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false

        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }

        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs.coerceAtLeast(50L))
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        return dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                onComplete?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                onComplete?.invoke(false)
            }
        }, null)
    }

    /**
     * Performs standard Android global navigation actions.
     */
    fun triggerGlobalAction(action: String): Boolean {
        return when (action.lowercase()) {
            "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
            "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
            "recents" -> performGlobalAction(GLOBAL_ACTION_RECENTS)
            "power" -> performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)
            "notifications" -> performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
            "quick_settings" -> performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
            else -> false
        }
    }

    /**
     * Injects text into currently focused input node.
     */
    fun injectText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val focusedNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false

        val arguments = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        return focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }
}

