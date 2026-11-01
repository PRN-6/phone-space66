# PHONE SPACE66 Security & Threat Model

## 1. Security Core Principles

PHONE SPACE66 adheres to five fundamental security constraints:
1. **Zero External/Cloud Dependencies**: All traffic stays strictly within the user's Local Area Network.
2. **Explicit User Approval**: The Android phone will never accept a desktop connection without physical user approval on the mobile screen.
3. **Cryptographic Authentication**: Session keys are derived and validated using SHA-256 challenges; raw passwords or hardcoded keys are strictly prohibited.
4. **Principle of Least Privilege**: Android permissions are requested dynamically only when the specific feature (e.g. Storage, Notifications, Screen Capture) is used.
5. **No Arbitrary Shell Execution**: The protocol consists solely of structured, typed, and schema-validated JSON actions. No raw shell commands (`sh`, `bash`, `cmd`) can ever be triggered over the network.

---

## 2. Threat Model

| Threat | Risk Level | Mitigation in PHONE SPACE66 |
|---|---|---|
| **Rogue device on same Wi-Fi attempting pairing** | High | Every pairing attempt generates a random 6-digit PIN and requires explicit tap approval on the Android screen. Unauthenticated requests are dropped. |
| **Replay Attacks** | Medium | Every message includes a unique `messageId` UUID, timestamp, and signed challenge nonce. Messages older than 60 seconds are rejected. |
| **Man-in-the-Middle (LAN eavesdropping)** | Medium | Support for TLS/WSS over LAN with self-signed certificate pinning or token-based HMAC verification. |
| **Malicious File Injection** | High | Transfers require active user session, destination folder validation, path traversal sanitation (`..` stripped), and SHA-256 checksum verification. |
| **Unauthorized Remote App Execution** | High | App launches are restricted to explicit `Intent.ACTION_MAIN` launch intents for launchable apps verified by Android `PackageManager`. |

---

## 3. Storage & Credential Security

- **Android Token Storage**: Bearer tokens are kept in `EncryptedSharedPreferences` backed by the hardware **Android Keystore System** (`MasterKey.Builder`).
- **Desktop Token Storage**: Saved in application-level secure storage with device ID association.
- **Revocation**: Users can tap "Disconnect All Devices" or "Revoke Pairing" at any time from both the phone app and the desktop settings to immediately invalidate tokens.

