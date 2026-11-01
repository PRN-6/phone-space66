# PHONE SPACE66 Companion — Android Setup Guide

## Requirements
- Android 10.0+ (API level 29 or higher). Android 11, 12, 13, and 14+ fully supported.
- Wi-Fi network connection or Active Wi-Fi Hotspot on the phone.

---

## 1. Installation

1. Copy `PHONE-SPACE66-Companion.apk` to your phone or build directly with Android Studio / Gradle:
   ```bash
   cd android
   ./gradlew installDebug
   ```
2. Open **PHONE SPACE66 Companion** from your launcher.

---

## 2. Initial Setup & Permissions

The companion app requests permissions incrementally:

1. **Local Network & Wi-Fi**:
   - `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`, `INTERNET`: Enables mDNS discovery and local WebSocket server.
2. **Foreground Service**:
   - `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`: Keeps connection alive when the app is in the background or the screen is locked.
3. **Storage Access** (Phase 2):
   - Storage Access Framework (SAF) folder picker prompts for Internal Storage or specific folders (e.g., `Downloads`, `DCIM`).
4. **Notifications** (Phase 6):
   - Notification Listener permission enabled explicitly in Android System Settings.
5. **Screen Mirroring** (Phase 5):
   - Android `MediaProjection` system prompt "Start recording or casting with PHONE SPACE66?".

---

## 3. Connecting to PHONE SPACE66 Desktop

1. Make sure your laptop and phone are connected to the same Wi-Fi network (or connect your laptop to the phone's mobile hotspot).
2. Open **PHONE SPACE66 Desktop** on your laptop.
3. Open **PHONE SPACE66 Companion** on your phone.
4. The desktop will automatically discover your phone via mDNS. Click **Connect**.
5. When prompted on your phone, verify the 6-digit PIN and tap **Approve Pairing**.
6. The desktop status bar will instantly display your phone name, battery level, and charging status!

