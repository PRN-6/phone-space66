package com.phonespace66.companion.applications

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.Base64
import android.util.Log
import com.phonespace66.companion.protocol.AppInfo
import com.phonespace66.companion.protocol.AppLaunchResponsePayload
import com.phonespace66.companion.protocol.AppListResponsePayload
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

/**
 * Manages installed Android applications discovery and intent-based application launching.
 */
class AppManager(private val context: Context) {

    companion object {
        private const val TAG = "AppManager"
        private const val ICON_SIZE_PX = 96
    }

    private val packageManager: PackageManager = context.packageManager

    /**
     * Retrieves launchable Android applications installed on the device.
     */
    suspend fun getInstalledApps(
        includeSystemApps: Boolean = false,
        filter: String? = null
    ): AppListResponsePayload = withContext(Dispatchers.IO) {
        val launchIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfos: List<ResolveInfo> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager.queryIntentActivities(
                launchIntent,
                PackageManager.ResolveInfoFlags.of(0)
            )
        } else {
            @Suppress("DEPRECATION")
            packageManager.queryIntentActivities(launchIntent, 0)
        }

        val apps = mutableListOf<AppInfo>()
        val queryLower = filter?.lowercase()?.trim()

        for (resolveInfo in resolveInfos) {
            try {
                val activityInfo = resolveInfo.activityInfo ?: continue
                val pkgName = activityInfo.packageName
                val appInfo = activityInfo.applicationInfo

                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                if (isSystem && !includeSystemApps) {
                    continue
                }

                val appName = resolveInfo.loadLabel(packageManager).toString()

                if (!queryLower.isNullOrEmpty()) {
                    if (!appName.lowercase().contains(queryLower) && !pkgName.lowercase().contains(queryLower)) {
                        continue
                    }
                }

                var versionName = "1.0.0"
                var versionCode: Long = 1
                var firstInstallTime: Long? = null
                var lastUpdateTime: Long? = null

                try {
                    val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        packageManager.getPackageInfo(pkgName, PackageManager.PackageInfoFlags.of(0))
                    } else {
                        @Suppress("DEPRECATION")
                        packageManager.getPackageInfo(pkgName, 0)
                    }
                    versionName = pInfo.versionName ?: "1.0.0"
                    versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        pInfo.longVersionCode
                    } else {
                        @Suppress("DEPRECATION")
                        pInfo.versionCode.toLong()
                    }
                    firstInstallTime = pInfo.firstInstallTime
                    lastUpdateTime = pInfo.lastUpdateTime
                } catch (e: Exception) {
                    Log.w(TAG, "Could not fetch detailed package info for $pkgName: ${e.message}")
                }

                val iconBase64 = try {
                    val iconDrawable = resolveInfo.loadIcon(packageManager)
                    drawableToBase64(iconDrawable)
                } catch (e: Exception) {
                    null
                }

                apps.add(
                    AppInfo(
                        packageName = pkgName,
                        appName = appName,
                        versionName = versionName,
                        versionCode = versionCode,
                        isSystemApp = isSystem,
                        iconBase64 = iconBase64,
                        installedAt = firstInstallTime,
                        lastUpdatedAt = lastUpdateTime
                    )
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error resolving app info", e)
            }
        }

        // Sort alphabetically by app name
        apps.sortBy { it.appName.lowercase() }

        AppListResponsePayload(
            apps = apps,
            totalCount = apps.size
        )
    }

    /**
     * Launches an Android application using its launcher intent.
     */
    suspend fun launchApp(
        packageName: String,
        activityName: String? = null
    ): AppLaunchResponsePayload = withContext(Dispatchers.Main) {
        try {
            var launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            val appLabel = try {
                val appInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    packageManager.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.getApplicationInfo(packageName, 0)
                }
                packageManager.getApplicationLabel(appInfo).toString()
            } catch (_: Exception) {
                packageName
            }

            if (launchIntent == null) {
                if (activityName != null) {
                    launchIntent = Intent().apply {
                        component = ComponentName(packageName, activityName)
                    }
                } else {
                    return@withContext AppLaunchResponsePayload(
                        packageName = packageName,
                        appName = appLabel,
                        success = false,
                        errorMessage = "Application does not have a default launcher activity."
                    )
                }
            }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            context.startActivity(launchIntent)

            Log.i(TAG, "Successfully launched application: $packageName ($appLabel)")
            AppLaunchResponsePayload(
                packageName = packageName,
                appName = appLabel,
                success = true,
                errorMessage = null,
                launchedAt = System.currentTimeMillis()
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException launching $packageName", e)
            AppLaunchResponsePayload(
                packageName = packageName,
                appName = packageName,
                success = false,
                errorMessage = "SecurityException: Insufficient permission to launch application: ${e.message}"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch $packageName", e)
            AppLaunchResponsePayload(
                packageName = packageName,
                appName = packageName,
                success = false,
                errorMessage = "Failed to launch application: ${e.message}"
            )
        }
    }

    /**
     * Converts a Drawable to a compact base64-encoded PNG string.
     */
    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val bitmap = when (drawable) {
                is BitmapDrawable -> {
                    if (drawable.bitmap != null && drawable.bitmap.width > 0 && drawable.bitmap.height > 0) {
                        Bitmap.createScaledBitmap(drawable.bitmap, ICON_SIZE_PX, ICON_SIZE_PX, true)
                    } else {
                        createBitmapFromDrawable(drawable)
                    }
                }
                else -> createBitmapFromDrawable(drawable)
            }

            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, outputStream)
            val byteArray = outputStream.toByteArray()
            Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to encode icon to base64", e)
            null
        }
    }

    private fun createBitmapFromDrawable(drawable: Drawable): Bitmap {
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else ICON_SIZE_PX
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else ICON_SIZE_PX
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return Bitmap.createScaledBitmap(bitmap, ICON_SIZE_PX, ICON_SIZE_PX, true)
    }
}

