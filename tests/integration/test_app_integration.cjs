/**
 * PHONE SPACE66 — Integration Test: Phase 4 Android Application Integration
 * Verifies:
 * 1. Companion pairing & token acquisition
 * 2. Installed application querying (filtered and unfiltered)
 * 3. System apps filtering
 * 4. Application search query
 * 5. Intent launch request for valid package
 * 6. Intent launch request failure handling for non-existent package
 * 7. Security rejection for unauthorized app requests
 */

const http = require('http');
const crypto = require('crypto');
const { MockCompanionDevice } = require('./mock_companion_device.cjs');

const TEST_WS_PORT = 6661;
const TEST_HTTP_PORT = 6662;

function createWsFrame(data) {
  const jsonStr = JSON.stringify(data);
  const payload = Buffer.from(jsonStr, 'utf8');
  const length = payload.length;

  let header;
  const maskingKey = crypto.randomBytes(4);

  if (length < 126) {
    header = Buffer.alloc(2 + 4);
    header[0] = 0x81;
    header[1] = 0x80 | length;
    maskingKey.copy(header, 2);
  } else if (length < 65536) {
    header = Buffer.alloc(4 + 4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
    maskingKey.copy(header, 4);
  } else {
    header = Buffer.alloc(10 + 4);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
    maskingKey.copy(header, 10);
  }

  const maskedPayload = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    maskedPayload[i] = payload[i] ^ maskingKey[i % 4];
  }

  return Buffer.concat([header, maskedPayload]);
}

function parseWsFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const secondByte = buffer[offset + 1];
    let payloadLen = secondByte & 0x7f;
    let headerSize = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerSize = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerSize = 10;
    }

    if (offset + headerSize + payloadLen > buffer.length) break;

    const payload = buffer.slice(offset + headerSize, offset + headerSize + payloadLen);
    try {
      messages.push(JSON.parse(payload.toString('utf8')));
    } catch (e) {
      // not JSON
    }
    offset += headerSize + payloadLen;
  }

  return { messages, remaining: buffer.slice(offset) };
}

async function runTest() {
  console.log('--- PHONE SPACE66: Phase 4 Application Integration Test ---');
  let mockCompanion;

  try {
    mockCompanion = new MockCompanionDevice(TEST_WS_PORT, TEST_HTTP_PORT, {
      model: 'Pixel 8 Pro',
      pin: '662024',
    });
    await mockCompanion.start();
    console.log(`[PASS] Mock companion running on ports WS=${TEST_WS_PORT}, HTTP=${TEST_HTTP_PORT}`);

    // Connect WebSocket client
    const wsKey = crypto.randomBytes(16).toString('base64');
    const req = http.request({
      port: TEST_WS_PORT,
      host: '127.0.0.1',
      path: '/ws',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': wsKey,
      },
    });

    const socket = await new Promise((resolve, reject) => {
      req.on('upgrade', (res, sock) => resolve(sock));
      req.on('error', reject);
      req.end();
    });

    let incomingBuffer = Buffer.alloc(0);
    const receivedMessages = [];

    socket.on('data', (chunk) => {
      incomingBuffer = Buffer.concat([incomingBuffer, chunk]);
      const { messages, remaining } = parseWsFrames(incomingBuffer);
      incomingBuffer = remaining;
      for (const m of messages) {
        receivedMessages.push(m);
      }
    });

    const waitForMessage = (type, timeoutMs = 3000) => {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          const idx = receivedMessages.findIndex((m) => m.type === type);
          if (idx !== -1) {
            const msg = receivedMessages.splice(idx, 1)[0];
            return resolve(msg);
          }
          if (Date.now() - start > timeoutMs) {
            return reject(new Error(`Timeout waiting for message: ${type}`));
          }
          setTimeout(check, 25);
        };
        check();
      });
    };

    // 1. Send PAIR_REQUEST
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-pair-1',
        type: 'PAIR_REQUEST',
        timestamp: new Date().toISOString(),
        payload: { desktopName: 'Omarchy Laptop', desktopId: 'omarchy-01' },
      })
    );

    const challengeMsg = await waitForMessage('PAIR_CHALLENGE');
    console.log(`[PASS] Handshake challenge received: ${challengeMsg.payload.phoneName}`);

    // 2. Send PAIR_VERIFY
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-pair-2',
        type: 'PAIR_VERIFY',
        timestamp: new Date().toISOString(),
        payload: { pin: '662024' },
      })
    );

    const successMsg = await waitForMessage('PAIR_SUCCESS');
    const authToken = successMsg.payload.authToken;
    console.log(`[PASS] Authenticated successfully with token: ${authToken.slice(0, 12)}...`);

    // 3. Test APP_LIST_REQUEST without system apps
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-app-list-1',
        type: 'APP_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { includeSystemApps: false },
      })
    );

    const appListMsg = await waitForMessage('APP_LIST_RESPONSE');
    const userApps = appListMsg.payload.apps;
    console.log(`[PASS] User applications retrieved: ${userApps.length} apps`);
    if (!userApps.some((a) => a.packageName === 'com.whatsapp')) {
      throw new Error('Expected WhatsApp in user apps list');
    }
    if (userApps.some((a) => a.packageName === 'com.android.settings')) {
      throw new Error('System app com.android.settings found when includeSystemApps=false');
    }

    // 4. Test APP_LIST_REQUEST with includeSystemApps = true
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-app-list-2',
        type: 'APP_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { includeSystemApps: true },
      })
    );

    const appListWithSysMsg = await waitForMessage('APP_LIST_RESPONSE');
    const allApps = appListWithSysMsg.payload.apps;
    console.log(`[PASS] All applications (including system) retrieved: ${allApps.length} apps`);
    if (!allApps.some((a) => a.packageName === 'com.android.settings')) {
      throw new Error('Expected com.android.settings in full apps list');
    }

    // 5. Test search filtering (filter = 'spotify')
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-app-list-3',
        type: 'APP_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { includeSystemApps: false, filter: 'spotify' },
      })
    );

    const filteredAppMsg = await waitForMessage('APP_LIST_RESPONSE');
    console.log(`[PASS] Filtered search returned: ${filteredAppMsg.payload.apps.length} app(s)`);
    if (filteredAppMsg.payload.apps.length !== 1 || filteredAppMsg.payload.apps[0].packageName !== 'com.spotify.music') {
      throw new Error('Filter query did not return expected Spotify app');
    }

    // 6. Test launch valid app (com.whatsapp)
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-launch-1',
        type: 'APP_LAUNCH_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { packageName: 'com.whatsapp' },
      })
    );

    const launchSuccessMsg = await waitForMessage('APP_LAUNCH_RESPONSE');
    console.log(`[PASS] App launch confirmed: ${launchSuccessMsg.payload.appName} (success: ${launchSuccessMsg.payload.success})`);
    if (!launchSuccessMsg.payload.success) {
      throw new Error(`Expected launch success for com.whatsapp, got failure: ${launchSuccessMsg.payload.errorMessage}`);
    }

    // 7. Test launch invalid app
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-launch-2',
        type: 'APP_LAUNCH_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { packageName: 'com.nonexistent.dummyapp' },
      })
    );

    const launchFailMsg = await waitForMessage('APP_LAUNCH_RESPONSE');
    console.log(`[PASS] Invalid app launch correctly failed with: "${launchFailMsg.payload.errorMessage}"`);
    if (launchFailMsg.payload.success) {
      throw new Error('Expected launch failure for non-existent app');
    }

    // 8. Test security: unauthenticated app request
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-launch-unauth',
        type: 'APP_LAUNCH_REQUEST',
        timestamp: new Date().toISOString(),
        authToken: 'invalid_token_12345',
        payload: { packageName: 'com.whatsapp' },
      })
    );

    const authErrorMsg = await waitForMessage('ERROR_RESPONSE');
    console.log(`[PASS] Unauthorized request rejected with code: ${authErrorMsg.payload.code}`);
    if (authErrorMsg.payload.code !== 'AUTH_REQUIRED') {
      throw new Error(`Expected AUTH_REQUIRED, got: ${authErrorMsg.payload.code}`);
    }

    socket.destroy();
    await mockCompanion.stop();

    console.log('\n========================================');
    console.log('PHASE 4: ALL 8/8 INTEGRATION TESTS PASSED');
    console.log('========================================\n');
  } catch (err) {
    console.error('[FAIL] Integration test failed:', err);
    if (mockCompanion) {
      try {
        await mockCompanion.stop();
      } catch (_) {}
    }
    process.exit(1);
  }
}

runTest();

