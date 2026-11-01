/**
 * PHONE SPACE66 — Interactive Mock Phone Companion Launcher
 * Starts a simulated Android phone on your local network (0.0.0.0:6655 / 6656).
 * You can connect to it either locally (127.0.0.1) or from any device on the LAN.
 */

const { MockCompanionDevice } = require('../tests/integration/mock_companion_device.cjs');
const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();
const wsPort = 6655;
const httpPort = 6656;
const pairingPin = '662024';

const companion = new MockCompanionDevice(wsPort, httpPort, {
  model: 'Pixel 8 Pro (Simulated)',
  manufacturer: 'Google',
  pin: pairingPin,
  batteryLevel: 94,
});

companion.start().then(() => {
  console.log('================================================================');
  console.log('    PHONE SPACE66 — SIMULATED ANDROID COMPANION IS ACTIVE       ');
  console.log('================================================================');
  console.log(`Device:         Google Pixel 8 Pro (Android 14)`);
  console.log(`WebSocket Port: ${wsPort}`);
  console.log(`HTTP Port:      ${httpPort}`);
  console.log(`Localhost IP:   127.0.0.1`);
  console.log(`LAN IP Address: ${localIp}`);
  console.log(`Pairing PIN:    ${pairingPin}`);
  console.log('----------------------------------------------------------------');
  console.log('HOW TO CONNECT FROM PHONE SPACE66 DESKTOP:');
  console.log('1. Launch the Desktop app (cd desktop && npm run dev)');
  console.log('2. Click "Connect Phone" in the top bar or diagnostics window');
  console.log(`3. Enter IP: ${localIp} (or 127.0.0.1)`);
  console.log(`4. When prompted, enter PIN: ${pairingPin}`);
  console.log('----------------------------------------------------------------');
  console.log('All phone features are active:');
  console.log('  • Real-time Battery & Storage Telemetry');
  console.log('  • KDE Dolphin File Manager (/storage/emulated/0)');
  console.log('  • Application Launcher (WhatsApp, Chrome, Camera, etc.)');
  console.log('  • 60 FPS Screen Mirroring');
  console.log('  • Notification Center & Clipboard Sync');
  console.log('Press Ctrl+C to stop companion.');
  console.log('================================================================');
});

process.on('SIGINT', async () => {
  console.log('\nStopping companion...');
  await companion.stop();
  process.exit(0);
});

