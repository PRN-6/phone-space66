/**
 * PHONE SPACE66 — Master Full-System Regression & Verification Suite
 * Executes end-to-end verification across all 6 core functional domains:
 * 1. Protocol & LAN Handshake (Phase 1)
 * 2. Android Storage & File Streaming (Phase 2)
 * 3. Desktop Shell & Window Management (Phase 3)
 * 4. Android Applications Integration (Phase 4)
 * 5. Screen Mirroring & Remote Input (Phase 5)
 * 6. Advanced Integrations: Notifications, Clipboard, Media, Gallery (Phase 6)
 */

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const testSuites = [
  { name: 'Phase 1: Protocol Envelope & Telemetry Specs', script: 'tests/desktop/protocol.test.cjs', env: 'sandboxed' },
  { name: 'Phase 1: USB Bridge & Storage Architecture Specs', script: 'tests/desktop/usb_bridge_and_storage.test.cjs', env: 'sandboxed' },
  { name: 'Phase 1: LAN Discovery & Authenticated Handshake', script: 'tests/integration/test_companion_handshake.cjs', env: 'network' },
  { name: 'Phase 2: Bidirectional File Transfer & Streaming Checksum', script: 'tests/integration/test_file_transfer.cjs', env: 'network' },
  { name: 'Phase 3: Hyprland Window Manager & Snapping Engine', script: 'tests/desktop/window_manager.test.cjs', env: 'sandboxed' },
  { name: 'Phase 4: Android Application Discovery & Intent Launching', script: 'tests/integration/test_app_integration.cjs', env: 'network' },
  { name: 'Phase 5: High-Performance Screen Mirroring & Touch Input', script: 'tests/integration/test_screen_mirror.cjs', env: 'network' },
  { name: 'Phase 6: Notifications, Clipboard, Media & Gallery', script: 'tests/integration/test_advanced_integrations.cjs', env: 'network' },
];

console.log('================================================================');
console.log('       PHONE SPACE66 — MASTER SYSTEM VERIFICATION SUITE         ');
console.log('          "Your Phone. Your Space. Your Desktop."               ');
console.log('================================================================\n');

let passedCount = 0;
const startTime = Date.now();

for (let i = 0; i < testSuites.length; i++) {
  const suite = testSuites[i];
  console.log(`[SUITE ${i + 1}/${testSuites.length}] Running ${suite.name}...`);
  const scriptPath = path.join(rootDir, suite.script);

  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`✓ [PASSED] ${suite.name}\n`);
    passedCount++;
  } catch (err) {
    console.error(`✗ [FAILED] ${suite.name}\n`);
    process.exit(1);
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('================================================================');
console.log(`  ALL ${passedCount}/${testSuites.length} SUBSYSTEM SUITES PASSED IN ${totalTime}s`);
console.log('  PHONE SPACE66 SYSTEM IS 100% PRODUCTION READY');
console.log('================================================================\n');

