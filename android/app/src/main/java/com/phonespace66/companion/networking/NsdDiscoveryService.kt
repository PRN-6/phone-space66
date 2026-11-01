package com.phonespace66.companion.networking

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.util.Log
import com.phonespace66.companion.core.Constants

class NsdDiscoveryService(private val context: Context) {
    private val TAG = "NsdDiscoveryService"
    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var isRegistered = false

    fun startAdvertising(port: Int = Constants.DEFAULT_WS_PORT) {
        if (isRegistered) return

        nsdManager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
        val serviceInfo = NsdServiceInfo().apply {
            serviceName = "${Constants.NSD_SERVICE_NAME} - ${Build.MODEL}"
            serviceType = Constants.NSD_SERVICE_TYPE
            setPort(port)
            // Add attributes
            setAttribute("model", Build.MODEL)
            setAttribute("manufacturer", Build.MANUFACTURER)
            setAttribute("version", Constants.PROTOCOL_VERSION.toString())
        }

        registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(service: NsdServiceInfo?) {
                isRegistered = true
                Log.i(TAG, "PHONE SPACE66 Companion successfully registered over mDNS: ${service?.serviceName}")
            }

            override fun onRegistrationFailed(service: NsdServiceInfo?, errorCode: Int) {
                isRegistered = false
                Log.e(TAG, "mDNS Registration failed with error: $errorCode")
            }

            override fun onServiceUnregistered(service: NsdServiceInfo?) {
                isRegistered = false
                Log.i(TAG, "mDNS Service unregistered")
            }

            override fun onUnregistrationFailed(service: NsdServiceInfo?, errorCode: Int) {
                Log.e(TAG, "mDNS Unregistration failed with error: $errorCode")
            }
        }

        try {
            nsdManager?.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
        } catch (e: Exception) {
            Log.e(TAG, "Error registering NSD service", e)
        }
    }

    fun stopAdvertising() {
        if (!isRegistered) return
        try {
            registrationListener?.let { nsdManager?.unregisterService(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering NSD service", e)
        } finally {
            isRegistered = false
            registrationListener = null
        }
    }
}

