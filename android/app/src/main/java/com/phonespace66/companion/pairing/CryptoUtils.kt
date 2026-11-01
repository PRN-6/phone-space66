package com.phonespace66.companion.pairing

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.UUID

object CryptoUtils {
    private val secureRandom = SecureRandom()

    fun generate6DigitPin(): String {
        val num = secureRandom.nextInt(900000) + 100000
        return num.toString()
    }

    fun generateRandomToken(): String {
        val bytes = ByteArray(32)
        secureRandom.nextBytes(bytes)
        return "pst_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun generateChallenge(): String {
        val bytes = ByteArray(16)
        secureRandom.nextBytes(bytes)
        return Base64.getEncoder().encodeToString(bytes)
    }

    fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }
}

