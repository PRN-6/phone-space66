package com.phonespace66.companion.clipboard

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonespace66.companion.protocol.ClipboardPayload

/**
 * Manages bi-directional clipboard synchronization between Android and desktop.
 */
class ClipboardSyncManager(private val context: Context) {

    companion object {
        private const val TAG = "ClipboardSyncManager"
    }

    private val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastSyncedText: String = ""

    var onClipboardChangedListener: ((ClipboardPayload) -> Unit)? = null

    private val clipListener = ClipboardManager.OnPrimaryClipChangedListener {
        try {
            val clip = clipboardManager.primaryClip ?: return@OnPrimaryClipChangedListener
            if (clip.itemCount > 0) {
                val text = clip.getItemAt(0).text?.toString() ?: ""
                if (text.isNotEmpty() && text != lastSyncedText) {
                    lastSyncedText = text
                    Log.i(TAG, "Local phone clipboard changed (${text.length} chars)")
                    onClipboardChangedListener?.invoke(
                        ClipboardPayload(
                            text = text,
                            timestamp = System.currentTimeMillis(),
                            source = "phone"
                        )
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking primary clip change", e)
        }
    }

    fun startListening() {
        clipboardManager.addPrimaryClipChangedListener(clipListener)
        Log.i(TAG, "Clipboard synchronization listener started")
    }

    fun stopListening() {
        clipboardManager.removePrimaryClipChangedListener(clipListener)
        Log.i(TAG, "Clipboard synchronization listener stopped")
    }

    /**
     * Sets clipboard text received from the desktop.
     */
    fun setRemoteText(text: String): Boolean {
        return try {
            if (text == lastSyncedText) return true
            lastSyncedText = text
            mainHandler.post {
                try {
                    val clip = ClipData.newPlainText("PHONE_SPACE66", text)
                    clipboardManager.setPrimaryClip(clip)
                    Log.i(TAG, "Set phone clipboard from desktop (${text.length} chars)")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to set primary clip on main thread", e)
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error setting remote clipboard text", e)
            false
        }
    }

    fun getCurrentText(): String {
        return try {
            val clip = clipboardManager.primaryClip
            if (clip != null && clip.itemCount > 0) {
                clip.getItemAt(0).text?.toString() ?: ""
            } else ""
        } catch (_: Exception) {
            ""
        }
    }
}
