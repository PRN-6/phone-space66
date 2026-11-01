package com.phonespace66.companion.device

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.SystemClock
import com.phonespace66.companion.networking.NetworkUtils
import com.phonespace66.companion.protocol.BatteryInfo
import com.phonespace66.companion.protocol.DeviceHardwareInfo
import com.phonespace66.companion.protocol.DeviceInfoResponsePayload
import com.phonespace66.companion.protocol.NetworkInfo
import com.phonespace66.companion.protocol.StorageMetrics

class DeviceTelemetryManager(private val context: Context) {

    fun getHardwareInfo(): DeviceHardwareInfo {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager?.getMemoryInfo(memoryInfo)

        return DeviceHardwareInfo(
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL,
            marketName = "${Build.MANUFACTURER} ${Build.MODEL}",
            androidVersion = Build.VERSION.RELEASE,
            sdkInt = Build.VERSION.SDK_INT,
            uptimeMs = SystemClock.elapsedRealtime(),
            totalRamBytes = memoryInfo.totalMem,
            availableRamBytes = memoryInfo.availMem
        )
    }

    fun getBatteryInfo(): BatteryInfo {
        val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val batteryStatus: Intent? = context.registerReceiver(null, ifilter)

        val level: Int = batteryStatus?.let { intent ->
            val rawLevel = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            if (rawLevel >= 0 && scale > 0) (rawLevel * 100) / scale else -1
        } ?: -1

        val status: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging: Boolean = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        val chargePlug: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) ?: -1
        val chargingSource = when (chargePlug) {
            BatteryManager.BATTERY_PLUGGED_USB -> "USB"
            BatteryManager.BATTERY_PLUGGED_AC -> "AC"
            BatteryManager.BATTERY_PLUGGED_WIRELESS -> "WIRELESS"
            else -> if (isCharging) "USB_PD" else "NONE"
        }

        val tempTenths = batteryStatus?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0
        val tempCelsius = tempTenths / 10.0f

        val healthCode = batteryStatus?.getIntExtra(BatteryManager.EXTRA_HEALTH, BatteryManager.BATTERY_HEALTH_UNKNOWN)
        val health = when (healthCode) {
            BatteryManager.BATTERY_HEALTH_GOOD -> "GOOD"
            BatteryManager.BATTERY_HEALTH_OVERHEAT -> "OVERHEAT"
            BatteryManager.BATTERY_HEALTH_DEAD -> "DEAD"
            BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "OVER_VOLTAGE"
            BatteryManager.BATTERY_HEALTH_COLD -> "COLD"
            else -> "UNKNOWN"
        }

        return BatteryInfo(
            level = if (level in 0..100) level else 100,
            isCharging = isCharging,
            chargingSource = chargingSource,
            temperatureCelsius = tempCelsius,
            health = health
        )
    }

    fun getStorageMetrics(): StorageMetrics {
        val path = Environment.getDataDirectory()
        val stat = StatFs(path.path)
        val blockSize = stat.blockSizeLong
        val totalBlocks = stat.blockCountLong
        val availableBlocks = stat.availableBlocksLong

        val totalBytes = totalBlocks * blockSize
        val availableBytes = availableBlocks * blockSize
        val usedBytes = totalBytes - availableBytes

        return StorageMetrics(
            totalBytes = totalBytes,
            availableBytes = availableBytes,
            usedBytes = usedBytes
        )
    }

    fun getNetworkInfo(): NetworkInfo {
        val ip = NetworkUtils.getLocalIpAddress()
        val ssid = NetworkUtils.getWifiSsid(context)
        val linkSpeed = NetworkUtils.getWifiLinkSpeed(context)
        val isWifi = NetworkUtils.isWifiConnected(context)

        return NetworkInfo(
            ipAddress = ip,
            ssid = ssid,
            linkSpeedMbps = linkSpeed,
            isWifi = isWifi,
            isHotspot = !isWifi && ip != "127.0.0.1"
        )
    }

    fun getFullTelemetry(): DeviceInfoResponsePayload {
        return DeviceInfoResponsePayload(
            device = getHardwareInfo(),
            battery = getBatteryInfo(),
            storage = getStorageMetrics(),
            network = getNetworkInfo()
        )
    }
}

