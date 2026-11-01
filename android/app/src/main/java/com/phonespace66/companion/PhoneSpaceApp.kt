package com.phonespace66.companion

import android.app.Application
import com.phonespace66.companion.device.DeviceTelemetryManager
import com.phonespace66.companion.networking.CompanionWebSocketServer
import com.phonespace66.companion.networking.NsdDiscoveryService
import com.phonespace66.companion.pairing.PairingManager

class PhoneSpaceApp : Application() {

    lateinit var pairingManager: PairingManager
        private set

    lateinit var telemetryManager: DeviceTelemetryManager
        private set

    lateinit var discoveryService: NsdDiscoveryService
        private set

    lateinit var webSocketServer: CompanionWebSocketServer
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        pairingManager = PairingManager(this)
        telemetryManager = DeviceTelemetryManager(this)
        discoveryService = NsdDiscoveryService(this)
        webSocketServer = CompanionWebSocketServer(this, pairingManager, telemetryManager)
    }

    fun startServices() {
        discoveryService.startAdvertising()
        webSocketServer.start()
    }

    fun stopServices() {
        discoveryService.stopAdvertising()
        webSocketServer.stop()
    }

    companion object {
        lateinit var instance: PhoneSpaceApp
            private set
    }
}

