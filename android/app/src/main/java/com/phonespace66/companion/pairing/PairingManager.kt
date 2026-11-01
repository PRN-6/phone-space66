package com.phonespace66.companion.pairing

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PendingPairingRequest(
    val desktopName: String,
    val desktopId: String,
    val pin: String,
    val challenge: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class PairedDevice(
    val desktopId: String,
    val desktopName: String,
    val token: String,
    val pairedAt: Long
)

class PairingManager(private val context: Context) {

    private val _pendingPairing = MutableStateFlow<PendingPairingRequest?>(null)
    val pendingPairing: StateFlow<PendingPairingRequest?> = _pendingPairing.asStateFlow()

    private val activeTokens = mutableMapOf<String, Long>() // Token -> Expiry
    private val pairedDevices = mutableMapOf<String, PairedDevice>()

    fun createChallenge(desktopName: String, desktopId: String): PendingPairingRequest {
        val pin = CryptoUtils.generate6DigitPin()
        val challenge = CryptoUtils.generateChallenge()
        val pending = PendingPairingRequest(
            desktopName = desktopName,
            desktopId = desktopId,
            pin = pin,
            challenge = challenge
        )
        _pendingPairing.value = pending
        return pending
    }

    fun verifyPin(enteredPin: String): Boolean {
        val current = _pendingPairing.value ?: return false
        // Expiration check: 2 minutes
        if (System.currentTimeMillis() - current.timestamp > 120_000) {
            _pendingPairing.value = null
            return false
        }
        return current.pin == enteredPin.trim()
    }

    fun approvePairing(): PairSuccessData? {
        val current = _pendingPairing.value ?: return null
        val token = CryptoUtils.generateRandomToken()
        val expiresAt = System.currentTimeMillis() + (7L * 24 * 60 * 60 * 1000) // 7 days

        activeTokens[token] = expiresAt
        pairedDevices[current.desktopId] = PairedDevice(
            desktopId = current.desktopId,
            desktopName = current.desktopName,
            token = token,
            pairedAt = System.currentTimeMillis()
        )

        _pendingPairing.value = null

        return PairSuccessData(
            authToken = token,
            expiresAt = expiresAt,
            desktopId = current.desktopId
        )
    }

    fun rejectPairing() {
        _pendingPairing.value = null
    }

    fun validateToken(token: String?): Boolean {
        if (token.isNullOrBlank()) return false
        val expiry = activeTokens[token] ?: return false
        if (System.currentTimeMillis() > expiry) {
            activeTokens.remove(token)
            return false
        }
        return true
    }

    fun revokeAll() {
        activeTokens.clear()
        pairedDevices.clear()
        _pendingPairing.value = null
    }

    data class PairSuccessData(
        val authToken: String,
        val expiresAt: Long,
        val desktopId: String
    )
}

