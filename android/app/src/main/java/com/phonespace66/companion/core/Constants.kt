package com.phonespace66.companion.core

object Constants {
    const val PROTOCOL_VERSION = 1
    const val DEFAULT_WS_PORT = 6655
    const val DEFAULT_HTTP_PORT = 6656
    const val NSD_SERVICE_TYPE = "_phonespace66._tcp"
    const val NSD_SERVICE_NAME = "PHONE SPACE66 Companion"

    const val NOTIFICATION_CHANNEL_ID = "phonespace66_foreground"
    const val NOTIFICATION_ID = 6655

    const val PREFS_FILE = "phonespace66_secure_prefs"
    const val KEY_AUTH_TOKEN = "auth_token"
    const val KEY_PAIRED_DESKTOP_ID = "paired_desktop_id"
    const val KEY_PAIRED_DESKTOP_NAME = "paired_desktop_name"

    // Message Types
    const val TYPE_PAIR_REQUEST = "PAIR_REQUEST"
    const val TYPE_PAIR_CHALLENGE = "PAIR_CHALLENGE"
    const val TYPE_PAIR_VERIFY = "PAIR_VERIFY"
    const val TYPE_PAIR_SUCCESS = "PAIR_SUCCESS"
    const val TYPE_PAIR_REJECT = "PAIR_REJECT"
    const val TYPE_HEARTBEAT = "HEARTBEAT"
    const val TYPE_HEARTBEAT_ACK = "HEARTBEAT_ACK"
    const val TYPE_DEVICE_INFO_REQUEST = "DEVICE_INFO_REQUEST"
    const val TYPE_DEVICE_INFO_RESPONSE = "DEVICE_INFO_RESPONSE"
    const val TYPE_BATTERY_STATUS_UPDATE = "BATTERY_STATUS_UPDATE"
    const val TYPE_ERROR_RESPONSE = "ERROR_RESPONSE"
}

