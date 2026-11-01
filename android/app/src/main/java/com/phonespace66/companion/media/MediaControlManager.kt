package com.phonespace66.companion.media

import android.content.Context
import android.media.AudioManager
import android.os.SystemClock
import android.util.Log
import android.view.KeyEvent
import com.phonespace66.companion.protocol.MediaControlActionPayload
import com.phonespace66.companion.protocol.MediaPlaybackStatePayload

/**
 * Manages media session inspection and remote audio playback transport controls.
 */
class MediaControlManager(private val context: Context) {

    companion object {
        private const val TAG = "MediaControlManager"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    // Cached media playback state
    private var isPlaying = false
    private var trackTitle = "PHONE SPACE66 Audio Stream"
    private var trackArtist = "Android Companion"
    private var trackAlbum = "Local Playback"

    fun getCurrentPlaybackState(): MediaPlaybackStatePayload {
        val isMusicActive = audioManager.isMusicActive
        return MediaPlaybackStatePayload(
            hasActiveSession = isMusicActive,
            packageName = "android.media",
            appName = "Active Media Player",
            title = if (isMusicActive) trackTitle else "No Media Playing",
            artist = if (isMusicActive) trackArtist else "Standby",
            album = if (isMusicActive) trackAlbum else "",
            isPlaying = isMusicActive,
            durationMs = 240000L,
            positionMs = 60000L,
            albumArtUrl = null,
            canSkipNext = true,
            canSkipPrev = true
        )
    }

    fun handleAction(payload: MediaControlActionPayload): Boolean {
        return try {
            when (payload.action.lowercase()) {
                "play", "pause", "toggle" -> {
                    dispatchMediaKey(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                    isPlaying = !isPlaying
                    true
                }
                "next" -> {
                    dispatchMediaKey(KeyEvent.KEYCODE_MEDIA_NEXT)
                    true
                }
                "prev" -> {
                    dispatchMediaKey(KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                    true
                }
                else -> false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to execute media action ${payload.action}", e)
            false
        }
    }

    private fun dispatchMediaKey(keyCode: Int) {
        val eventTime = SystemClock.uptimeMillis()
        val down = KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN, keyCode, 0)
        val up = KeyEvent(eventTime, eventTime, KeyEvent.ACTION_UP, keyCode, 0)
        audioManager.dispatchMediaKeyEvent(down)
        audioManager.dispatchMediaKeyEvent(up)
    }
}
