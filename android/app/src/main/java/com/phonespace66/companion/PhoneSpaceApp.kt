package com.phonespace66.companion

import android.app.Application
import com.phonespace66.companion.applications.AppManager
import com.phonespace66.companion.device.DeviceTelemetryManager
import com.phonespace66.companion.input.RemoteInputManager
import com.phonespace66.companion.mirror.ScreenMirrorManager
import com.phonespace66.companion.networking.CompanionWebSocketServer
import com.phonespace66.companion.networking.NsdDiscoveryService
import com.phonespace66.companion.pairing.PairingManager
import com.phonespace66.companion.storage.AndroidStorageManager
import com.phonespace66.companion.storage.FileServer

class PhoneSpaceApp : Application() {

    lateinit var pairingManager: PairingManager
        private set

    lateinit var telemetryManager: DeviceTelemetryManager
        private set

    lateinit var storageManager: AndroidStorageManager
        private set

    lateinit var appManager: AppManager
        private set

    lateinit var screenMirrorManager: ScreenMirrorManager
        private set

    lateinit var remoteInputManager: RemoteInputManager
        private set

    lateinit var discoveryService: NsdDiscoveryService
        private set

    lateinit var webSocketServer: CompanionWebSocketServer
        private set

    lateinit var fileServer: FileServer
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        pairingManager = PairingManager(this)
        telemetryManager = DeviceTelemetryManager(this)
        storageManager = AndroidStorageManager(this)
        appManager = AppManager(this)
        screenMirrorManager = ScreenMirrorManager(this)
        remoteInputManager = RemoteInputManager(this)
        discoveryService = NsdDiscoveryService(this)
        webSocketServer = CompanionWebSocketServer(
            this,
            pairingManager,
            telemetryManager,
            storageManager,
            appManager,
            screenMirrorManager,
            remoteInputManager
        )
        fileServer = FileServer(this, storageManager, pairingManager, screenMirrorManager)
    }

    fun startServices() {
        discoveryService.startAdvertising()
        webSocketServer.start()
        fileServer.start()
    }

    fun stopServices() {
        discoveryService.stopAdvertising()
        webSocketServer.stop()
        fileServer.stop()
    }

    companion object {
        lateinit var instance: PhoneSpaceApp
            private set
    }
}
