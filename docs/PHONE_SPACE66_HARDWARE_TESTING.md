# PHONE SPACE66 — Physical Hardware Testing & Validation Guide

**Target Hardware:** Windows 10/11 PC + Physical Android Smartphone  
**Supported Manufacturers Tested:** Google Pixel, Realme / OPPO, Samsung, Xiaomi / POCO, OnePlus, Motorola  
**Transports Covered:** Wired USB (MTP), Developer USB (ADB), Wireless LAN (Companion App)

---

## 1. Pre-Flight Hardware Checklist

Before testing file transfers or device discovery:

- [ ] **USB Cable Verification:**
  - Ensure you are using a **data-capable USB cable** (4-wire USB 2.0 or 9-wire USB 3.0/Type-C).
  - *Warning:* Cheap charging cables ("charge-only") only connect the VBUS and GND pins, omitting D+ and D- lines. If Windows does not play a hardware connection chime when plugged in, the cable is charge-only and cannot transfer data.
- [ ] **Direct Port Connection:**
  - Connect directly to a motherboard or laptop USB port. Avoid unpowered USB hubs which may throttle current or drop MTP packets.
- [ ] **Unlock the Phone Screen:**
  - Modern Android disables MTP storage endpoints while the lock screen is active (PIN, pattern, or fingerprint locked). Unlock your device before testing.

---

## 2. Step-by-Step Hardware Test Matrix

### Scenario A: Standard Plug-and-Play USB (Zero-Install / Driverless MTP)
*Use this mode if you only want to access phone storage, photos, videos, and documents without installing any app on your phone.*

1. **Plug the Phone into the PC with your USB cable.**
   - Windows plays the device connection chime.
2. **Check Phone Screen Notification:**
   - Swipe down from the top of your phone screen.
   - Look for the notification: **"Charging this device via USB"** or **"USB connected"**.
   - Tap this notification to open the **USB Preferences** menu.
   - Select **"File Transfer"** (or **"Android Auto / Transfer files"**).
   - *Note on Realme UI:* Select **"Transfer Files"** on the popup dialog.
   - *Note on Samsung OneUI:* Select **"Transferring files"**.
   - *Note on Google Pixel:* Under "Use USB for", select **"File transfer"**.
3. **Launch PHONE SPACE66:**
   - Double-click **`PHONE SPACE66.exe`** on your desktop, OR in PowerShell run:
     ```powershell
     cd d:\projects\phonespace66\desktop
     npm run dev
     ```
4. **Verify Storage Discovery:**
   - Look at the top status bar: It will display `USB: MTP Attached` with your device model (e.g. `Realme 9 Pro 5G` or `Google Pixel 8 Pro`).
   - Open the **File Manager** from the dock.
   - You should see your real Android root folders:
     - `DCIM/` (Camera photos and screenshots)
     - `Download/` (Downloaded files)
     - `Documents/`
     - `Pictures/`
     - `Music/`
5. **Verify File Operations:**
   - **Download:** Click on any photo or file in the File Manager and click download. Verify the file streams to your Windows Downloads folder.
   - **Upload:** Drag-and-drop a file from Windows Explorer into the File Manager window. Verify progress bar completes and the file appears on the phone.
   - **Delete:** Select a temporary file, click delete, and confirm removal.

---

### Scenario B: Wireless High-Performance Companion Mode (LAN)
*Use this mode to access full desktop features: Screen Mirroring, Live Notifications, Android Applications, and Audio/Media Sync.*

1. **Ensure Phone and PC are on the Same Wi-Fi Network** (or connect PC to your phone's Wi-Fi Hotspot).
2. **Open the PHONE SPACE66 Companion App** on your Android phone.
3. **Open PHONE SPACE66 Desktop:**
   - A pairing modal will prompt with a 6-digit mutual authentication PIN (e.g. `662024`).
   - Enter the PIN on the desktop screen.
4. **Verify Features:**
   - **Notifications:** Send a test message or WhatsApp on your phone; verify desktop notification pops up.
   - **Screen Mirroring:** Open Screen Mirror window; interact with your phone screen using your desktop mouse and keyboard.
   - **Applications:** Click the launcher icon in the dock; launch any installed Android app directly onto the screen.

---

### Scenario C: Advanced ADB USB Bridge (For Developers / Power Users)
*Provides wired screen mirroring and app launching over USB cable without Wi-Fi.*

1. **Enable USB Debugging on Android:**
   - Open phone **Settings > About Phone**.
   - Tap **Build Number** 7 times until you see *"You are now a developer!"*.
   - Go to **Settings > System > Developer Options**.
   - Toggle **USB Debugging** to **ON**.
2. **Connect USB Cable & Authorize:**
   - Plug into the PC.
   - On the phone screen, check **"Always allow from this computer"** and tap **Allow**.
3. **Verify ADB Status:**
   - Run in PowerShell:
     ```powershell
     cd d:\projects\phonespace66
     npm run diagnostics
     ```
   - Verify output reports:
     `ADB Status: 🟢 AVAILABLE & AUTHORIZED (Device ID: <your-device-serial>)`

---

## 3. Hardware Diagnostic Commands

Run these built-in diagnostic tools if your phone is not appearing:

### 1. Instant Hardware Scanner
```powershell
cd d:\projects\phonespace66
npm run diagnostics
```
*Expected output:*
- Enumerate Windows PnP WPD devices.
- Detect connected vendor and hardware IDs (`VID_22D9`, `VID_18D1`, `VID_04E8`, etc.).
- Inspect Windows Shell COM `Namespace(17)` storage objects (`Internal shared storage`).
- Verify ADB daemon status and authorization.

### 2. Standalone USB Hardware Bridge
To run the USB bridge in standalone verbose mode:
```powershell
cd d:\projects\phonespace66
npm run bridge
```
*Listens on:*
- WebSocket: `ws://127.0.0.1:6655/ws`
- HTTP Server: `http://127.0.0.1:6656` (`/ping`, `/diagnostics`, `/download`, `/upload`, `/screen/stream`)

### 3. Run Automated System Regression Tests
```powershell
cd d:\projects\phonespace66
npm run test
```

---

## 4. Troubleshooting Real-World Edge Cases

| Issue | Reason | Resolution |
|---|---|---|
| **Status bar says "⚠️ Select File Transfer on Phone"** | Modern Android defaults USB to charging mode upon connection. | Unlock phone screen, swipe down notification shade, tap USB notification, and choose **"File Transfer"**. |
| **Status bar says "⚠️ Unlock Phone Screen"** | Screen lock is engaged (PIN/Fingerprint). | Unlock your phone screen once. Modern Android automatically mounts MTP storage objects when unlocked. |
| **Bridge reports `COUNT: 0` storage objects** | Device is in "Charge Only" mode, or MTP driver is restarting. | Unplug and replug the USB cable, and select "File Transfer". |
| **"Device Busy" or Transfer Stalled** | Windows Explorer or another application currently has an exclusive lock on the MTP device. | Close Windows Explorer windows that have the phone folder open, then retry the transfer in PHONE SPACE66. |
| **Realme / Oppo OTG auto-shutoff** | ColorOS / Realme UI has an OTG connection timeout. | Go to phone **Settings > Additional Settings > OTG Connection** and turn it **ON**. |
| **Phone charges, but PC doesn't detect anything** | Damaged cable or charge-only cable missing data lines. | Replace cable with a standard high-speed Type-C data cable. |

