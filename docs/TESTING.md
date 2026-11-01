# PHONE SPACE66 Testing Guide & Verification Procedures

This document details automated tests, integration test harnesses, and manual hardware verification procedures.

---

## 1. Automated Test Suite

### Protocol Validation & Message Handling Tests
Run unit tests for message validation, envelopes, and telemetry schemas:
```bash
cd tests
npm test
```

### Integration Test Harness (Mock Companion Device)
The test suite includes a full implementation of the Android Companion server in Node.js (`tests/integration/mock_companion_device.ts`).
This allows end-to-end testing of:
- WebSocket connection on port 6655.
- Pairing challenge exchange and 6-digit PIN verification.
- Session token generation and authentication rejection on invalid tokens.
- `DEVICE_INFO_REQUEST` processing and real telemetry response payload validation.
- Heartbeat ping-pong and latency calculation.

To run the integration harness test:
```bash
node tests/integration/run_handshake_test.cjs
```

---

## 2. Hardware-in-the-Loop Manual Test Matrix

| Test ID | Scenario | Expected Behavior |
|---|---|---|
| **TC-01** | Connect over common 5GHz Wi-Fi | mDNS auto-discovers phone within 3 seconds; PIN pairing approves smoothly; battery & storage populate accurately. |
| **TC-02** | Connect over Phone Mobile Hotspot (laptop connected to phone) | Laptop resolves phone gateway (e.g. `192.168.43.1:6655`); pairing succeeds. |
| **TC-03** | Phone screen turns off / phone goes to sleep | Android Foreground Service maintains WebSocket connection; heartbeat keeps active. |
| **TC-04** | User toggles Airplane Mode or disconnects Wi-Fi | Desktop detects connection drop within heartbeat timeout (5s); top bar displays "Disconnected"; auto-reconnect initiates when network is restored. |
| **TC-05** | Rogue device attempts connection with invalid PIN | Companion rejects pairing; returns `PAIRING_REJECTED`; session token is NOT issued. |
| **TC-06** | Real-time Battery update | Plug in charger to physical phone; Desktop status bar immediately switches icon to charging bolt and updates battery percentage. |

