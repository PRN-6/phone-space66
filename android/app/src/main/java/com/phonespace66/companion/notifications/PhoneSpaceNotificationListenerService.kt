package com.phonespace66.companion.notifications

import android.app.Notification
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Base64
import android.util.Log
import com.phonespace66.companion.protocol.PhoneNotification
import java.io.ByteArrayOutputStream

/**
 * Android NotificationListenerService for PHONE SPACE66.
 * Listens for posted/removed notifications and forwards them to the desktop companion.
 */
class PhoneSpaceNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationListener"
        var instance: PhoneSpaceNotificationListenerService? = null
            private set

        var onNotificationPostedListener: ((PhoneNotification) -> Unit)? = null
        var onNotificationRemovedListener: ((String) -> Unit)? = null

        val isServiceActive: Boolean
            get() = instance != null
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "Notification listener connected to PHONE SPACE66 Companion")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        if (instance == this) {
            instance = null
        }
        Log.i(TAG, "Notification listener disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val notif = parseStatusBarNotification(sbn) ?: return
        onNotificationPostedListener?.invoke(notif)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        onNotificationRemovedListener?.invoke(sbn.key)
    }

    /**
     * Dismisses a notification on phone by ID/key.
     */
    fun dismissNotification(key: String): Boolean {
        return try {
            cancelNotification(key)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel notification $key", e)
            false
        }
    }

    /**
     * Returns list of currently active phone notifications.
     */
    fun getActiveNotificationsList(): List<PhoneNotification> {
        val list = mutableListOf<PhoneNotification>()
        try {
            val active = activeNotifications ?: return emptyList()
            for (sbn in active) {
                val parsed = parseStatusBarNotification(sbn)
                if (parsed != null) {
                    list.add(parsed)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to retrieve active notifications", e)
        }
        return list
    }

    private fun parseStatusBarNotification(sbn: StatusBarNotification): PhoneNotification? {
        try {
            val notification = sbn.notification ?: return null
            val extras = notification.extras ?: return null
            val pkg = sbn.packageName

            // Ignore foreground service persistent notifications of our own companion
            if (pkg == applicationContext.packageName) return null

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()
                ?: ""

            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: ""

            if (title.isBlank() && text.isBlank()) return null

            val pm = applicationContext.packageManager
            val appName = try {
                val appInfo = pm.getApplicationInfo(pkg, 0)
                pm.getApplicationLabel(appInfo).toString()
            } catch (_: Exception) {
                pkg
            }

            var iconBase64: String? = null
            try {
                val iconDrawable = notification.getLargeIcon()?.loadDrawable(applicationContext)
                    ?: notification.smallIcon?.loadDrawable(applicationContext)
                if (iconDrawable != null) {
                    iconBase64 = drawableToBase64(iconDrawable)
                }
            } catch (_: Exception) {}

            return PhoneNotification(
                id = sbn.key,
                packageName = pkg,
                appName = appName,
                title = title,
                text = text,
                postTime = sbn.postTime,
                isClearable = sbn.isClearable,
                iconBase64 = iconBase64
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing notification", e)
            return null
        }
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val bitmap = when (drawable) {
                is BitmapDrawable -> drawable.bitmap
                else -> {
                    val w = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 64
                    val h = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 64
                    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                    val canvas = Canvas(bmp)
                    drawable.setBounds(0, 0, canvas.width, canvas.height)
                    drawable.draw(canvas)
                    bmp
                }
            }
            val scaled = Bitmap.createScaledBitmap(bitmap, 64, 64, true)
            val stream = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.PNG, 85, stream)
            Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }
}
