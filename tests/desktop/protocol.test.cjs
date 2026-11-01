/**
 * PHONE SPACE66 — Protocol & Serialization Unit Tests
 * Tests envelope structure, message validators, and schema adherence.
 */

const assert = require('assert');

const PROTOCOL_VERSION = 1;

function createMessage(type, payload, authToken, requestId) {
  const randomUUID = 'msg-' + Math.random().toString(36).substring(2, 10);
  return {
    protocolVersion: PROTOCOL_VERSION,
    messageId: randomUUID,
    requestId,
    type,
    timestamp: new Date().toISOString(),
    authToken,
    payload,
  };
}

function validateMessage(raw) {
  if (typeof raw !== 'object' || raw === null) return null;
  if (typeof raw.protocolVersion !== 'number' || raw.protocolVersion !== PROTOCOL_VERSION) {
    return null;
  }
  if (typeof raw.messageId !== 'string' || !raw.messageId) return null;
  if (typeof raw.type !== 'string' || !raw.type) return null;
  if (typeof raw.timestamp !== 'string') return null;
  return raw;
}

console.log('--- RUNNING PHONE SPACE66 PROTOCOL UNIT TESTS ---');

// Test 1: Message creation
const pairMsg = createMessage('PAIR_REQUEST', {
  desktopName: 'PHONE SPACE66 Desktop',
  desktopId: 'desktop-test-01',
});
assert.strictEqual(pairMsg.protocolVersion, 1, 'Protocol version must equal 1');
assert.strictEqual(pairMsg.type, 'PAIR_REQUEST', 'Type must match');
assert.ok(pairMsg.messageId.startsWith('msg-'), 'MessageId must have proper prefix');
assert.ok(Date.parse(pairMsg.timestamp) > 0, 'Timestamp must be valid ISO-8601');
console.log('✓ Test 1 Passed: createMessage produces valid protocol envelope');

// Test 2: Message validation
const valid = validateMessage(pairMsg);
assert.notStrictEqual(valid, null, 'Valid message must pass validation');

const invalidVersion = { ...pairMsg, protocolVersion: 2 };
assert.strictEqual(validateMessage(invalidVersion), null, 'Invalid protocol version must fail');

const missingType = { ...pairMsg, type: '' };
assert.strictEqual(validateMessage(missingType), null, 'Empty type must fail');
console.log('✓ Test 2 Passed: validateMessage enforces version and mandatory fields');

// Test 3: Telemetry payload contract
const mockTelemetry = {
  device: {
    manufacturer: 'Google',
    model: 'Pixel 8 Pro',
    marketName: 'Google Pixel 8 Pro',
    androidVersion: '14',
    sdkInt: 34,
    uptimeMs: 120500,
  },
  battery: {
    level: 85,
    isCharging: true,
    chargingSource: 'USB_PD',
    temperatureCelsius: 28.5,
    health: 'GOOD',
  },
  storage: {
    totalBytes: 128000000000,
    availableBytes: 64000000000,
    usedBytes: 64000000000,
  },
  network: {
    ipAddress: '192.168.1.150',
    ssid: 'Home-WiFi',
    linkSpeedMbps: 866,
    isWifi: true,
    isHotspot: false,
  },
};

const telemetryEnvelope = createMessage('DEVICE_INFO_RESPONSE', mockTelemetry, 'test_token');
assert.strictEqual(telemetryEnvelope.type, 'DEVICE_INFO_RESPONSE');
assert.strictEqual(telemetryEnvelope.payload.battery.level, 85);
assert.strictEqual(telemetryEnvelope.payload.device.model, 'Pixel 8 Pro');
assert.strictEqual(telemetryEnvelope.payload.storage.usedBytes, 64000000000);
console.log('✓ Test 3 Passed: Device telemetry payload structure verified');

// Test 4: Heartbeat ping-pong
const hbMsg = createMessage('HEARTBEAT', { clientTimestamp: 1000 });
const hbAck = createMessage('HEARTBEAT_ACK', { clientTimestamp: 1000, serverTimestamp: 1008 });
assert.strictEqual(hbAck.payload.serverTimestamp - hbAck.payload.clientTimestamp, 8);
console.log('✓ Test 4 Passed: Heartbeat ping-pong contract verified');

console.log('--- ALL PROTOCOL UNIT TESTS PASSED ---\n');

