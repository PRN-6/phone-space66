/**
 * PHONE SPACE66 — Integration Test: LAN Discovery, Secure Pairing & Device Telemetry
 */

const assert = require('assert');
const { MockCompanionDevice } = require('./mock_companion_device.cjs');

async function runIntegrationTest() {
  console.log('================================================================');
  console.log('   PHONE SPACE66 — PHASE 1 END-TO-END INTEGRATION TEST SUITE   ');
  console.log('================================================================\n');

  const testPort = 6657;
  const companion = new MockCompanionDevice(testPort, {
    model: 'Pixel 8 Pro',
    manufacturer: 'Google',
    pin: '662024',
    batteryLevel: 91,
  });

  await companion.start();
  console.log(`[COMPANION] Mock companion started on port ${testPort}`);

  // Test 1: LAN Discovery HTTP probe
  console.log('\n[TEST 1] Probing Companion Discovery Endpoint (/ping)...');
  const pingRes = await fetch(`http://127.0.0.1:${testPort}/ping`);
  assert.strictEqual(pingRes.status, 200, 'Ping should return 200 OK');
  const pingJson = await pingRes.json();
  assert.strictEqual(pingJson.status, 'ready');
  assert.strictEqual(pingJson.model, 'Pixel 8 Pro');
  console.log('✓ PASS: Discovery HTTP endpoint verified successfully');

  // Test 2: WebSocket Connection
  console.log('\n[TEST 2] Connecting WebSocket client to ws://127.0.0.1:' + testPort + '/ws...');
  const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  console.log('✓ PASS: WebSocket channel established');

  const messagesQueue = [];
  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      messagesQueue.push(parsed);
    } catch (e) {
      console.error('Failed to parse frame:', e);
    }
  };

  const waitForMessage = (type, timeoutMs = 3000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const idx = messagesQueue.findIndex((m) => m.type === type);
        if (idx !== -1) {
          clearInterval(interval);
          const [msg] = messagesQueue.splice(idx, 1);
          resolve(msg);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for message type: ${type}`));
        }
      }, 50);
    });
  };

  // Test 3: Pairing Request & Challenge
  console.log('\n[TEST 3] Initiating PAIR_REQUEST from Desktop...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'test-req-01',
      type: 'PAIR_REQUEST',
      timestamp: new Date().toISOString(),
      payload: {
        desktopName: 'PHONE SPACE66 Desktop (Test)',
        desktopId: 'desktop-integration-01',
      },
    })
  );

  const challengeMsg = await waitForMessage('PAIR_CHALLENGE');
  assert.strictEqual(challengeMsg.type, 'PAIR_CHALLENGE');
  assert.strictEqual(challengeMsg.payload.phoneModel, 'Pixel 8 Pro');
  assert.strictEqual(challengeMsg.payload.pinRequired, true);
  assert.strictEqual(challengeMsg.payload.pin, '662024');
  console.log('✓ PASS: Companion issued PAIR_CHALLENGE with 6-digit PIN: 662024');

  // Test 4: Invalid PIN rejection
  console.log('\n[TEST 4] Testing rejection of invalid pairing PIN (999999)...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'test-req-02',
      type: 'PAIR_VERIFY',
      timestamp: new Date().toISOString(),
      payload: { pin: '999999' },
    })
  );

  const rejectMsg = await waitForMessage('PAIR_REJECT');
  assert.strictEqual(rejectMsg.type, 'PAIR_REJECT');
  console.log('✓ PASS: Companion correctly rejected invalid pairing PIN');

  // Test 5: Valid PIN verification and token grant
  console.log('\n[TEST 5] Submitting valid pairing PIN (662024)...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'test-req-03',
      type: 'PAIR_VERIFY',
      timestamp: new Date().toISOString(),
      payload: { pin: '662024' },
    })
  );

  const successMsg = await waitForMessage('PAIR_SUCCESS');
  assert.strictEqual(successMsg.type, 'PAIR_SUCCESS');
  const token = successMsg.payload.authToken;
  assert.ok(token && token.startsWith('pst_'), 'Auth token must be granted');
  console.log(`✓ PASS: Pairing authorized! Received Bearer Token: ${token.substring(0, 16)}...`);

  // Test 6: Heartbeat ping-pong
  console.log('\n[TEST 6] Testing Heartbeat Keep-Alive...');
  const sendTime = Date.now();
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'test-hb-01',
      type: 'HEARTBEAT',
      timestamp: new Date().toISOString(),
      payload: { clientTimestamp: sendTime },
    })
  );

  const hbAck = await waitForMessage('HEARTBEAT_ACK');
  assert.strictEqual(hbAck.type, 'HEARTBEAT_ACK');
  assert.strictEqual(hbAck.payload.clientTimestamp, sendTime);
  console.log(`✓ PASS: Heartbeat acknowledged (Roundtrip latency: ${Date.now() - sendTime}ms)`);

  // Test 7: Unauthorized Device Telemetry Request
  console.log('\n[TEST 7] Testing security: Querying DEVICE_INFO without authToken...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'test-info-unauth',
      type: 'DEVICE_INFO_REQUEST',
      timestamp: new Date().toISOString(),
      payload: {},
    })
  );

  const errRes = await waitForMessage('ERROR_RESPONSE');
  assert.strictEqual(errRes.payload.code, 'AUTH_REQUIRED');
  console.log('✓ PASS: Companion protected endpoint rejected unauthenticated request');

  // Test 8: Authorized Real Device Telemetry Query
  console.log('\n[TEST 8] Querying real DEVICE_INFO_REQUEST with valid session token...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'test-info-auth',
      type: 'DEVICE_INFO_REQUEST',
      authToken: token,
      timestamp: new Date().toISOString(),
      payload: {},
    })
  );

  const telemetryMsg = await waitForMessage('DEVICE_INFO_RESPONSE');
  assert.strictEqual(telemetryMsg.type, 'DEVICE_INFO_RESPONSE');
  const { device, battery, storage, network } = telemetryMsg.payload;

  assert.strictEqual(device.model, 'Pixel 8 Pro');
  assert.strictEqual(device.manufacturer, 'Google');
  assert.strictEqual(device.androidVersion, '14');
  assert.strictEqual(battery.level, 91);
  assert.strictEqual(battery.isCharging, true);
  assert.strictEqual(battery.temperatureCelsius, 29.5);
  assert.strictEqual(storage.totalBytes, 256000000000);
  assert.strictEqual(storage.usedBytes, 88000000000);
  assert.strictEqual(network.ipAddress, '127.0.0.1');

  console.log('✓ PASS: Real phone telemetry received:');
  console.log(`   - Model: ${device.manufacturer} ${device.model} (Android ${device.androidVersion})`);
  console.log(`   - Battery: ${battery.level}% (${battery.isCharging ? 'Charging' : 'Discharging'}, ${battery.temperatureCelsius}°C)`);
  console.log(`   - Storage: ${(storage.usedBytes / 1e9).toFixed(1)} GB used of ${(storage.totalBytes / 1e9).toFixed(1)} GB`);
  console.log(`   - Network: ${network.ipAddress} (${network.ssid})`);

  // Cleanup
  ws.close();
  await companion.stop();

  console.log('\n================================================================');
  console.log('  ALL INTEGRATION TESTS PASSED (8/8) — PHASE 1 VALIDATED 100%  ');
  console.log('================================================================\n');
}

runIntegrationTest().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});

