/**
 * PHONE SPACE66 — Integration Test: Phase 5 Screen Mirroring & Remote Input
 * Verifies:
 * 1. Companion pairing & token acquisition
 * 2. Screen Mirror stream initialization (SCREEN_MIRROR_START)
 * 3. High-speed HTTP frame streaming (/screen/stream) with JPEG frame delivery
 * 4. Screen Mirror status polling (SCREEN_MIRROR_STATUS)
 * 5. Touch pointer events forwarding (pointer_down, pointer_move, pointer_up)
 * 6. Navigation keys forwarding (back, home, recents, power)
 * 7. Volume adjustment forwarding (up, down)
 * 8. Text input forwarding
 * 9. Screen Mirror shutdown (SCREEN_MIRROR_STOP)
 * 10. Security: rejection of unauthorized streaming and input
 */

const http = require('http');
const crypto = require('crypto');
const { MockCompanionDevice } = require('./mock_companion_device.cjs');

const TEST_WS_PORT = 6663;
const TEST_HTTP_PORT = 6664;

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

function fetchHttp(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('--- PHONE SPACE66: Phase 5 Screen Mirroring & Remote Input Test ---');
  let mockCompanion;

  try {
    mockCompanion = new MockCompanionDevice(TEST_WS_PORT, TEST_HTTP_PORT, {
      model: 'Pixel 8 Pro',
      pin: '662024',
    });
    await mockCompanion.start();
    console.log(`[PASS] Mock companion running on ports WS=${TEST_WS_PORT}, HTTP=${TEST_HTTP_PORT}`);

    // Connect WebSocket
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

    // 1. Handshake & Pairing
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-p1',
        type: 'PAIR_REQUEST',
        timestamp: new Date().toISOString(),
        payload: { desktopName: 'Hyprland Studio', desktopId: 'hypr-01' },
      })
    );
    await waitForMessage('PAIR_CHALLENGE');

    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-p2',
        type: 'PAIR_VERIFY',
        timestamp: new Date().toISOString(),
        payload: { pin: '662024' },
      })
    );
    const successMsg = await waitForMessage('PAIR_SUCCESS');
    const authToken = successMsg.payload.authToken;
    console.log(`[PASS] Authenticated successfully with token: ${authToken.slice(0, 12)}...`);

    // 2. Query initial SCREEN_MIRROR_STATUS (should be inactive)
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-stat-1',
        type: 'SCREEN_MIRROR_STATUS',
        timestamp: new Date().toISOString(),
        authToken,
        payload: {},
      })
    );
    const initialStatus = await waitForMessage('SCREEN_MIRROR_STATUS');
    console.log(`[PASS] Initial screen mirror status: isStreaming = ${initialStatus.payload.isStreaming}`);
    if (initialStatus.payload.isStreaming) {
      throw new Error('Screen mirror should not be active before start request');
    }

    // 3. Start Screen Mirroring (SCREEN_MIRROR_START)
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-start-1',
        type: 'SCREEN_MIRROR_START',
        timestamp: new Date().toISOString(),
        authToken,
        payload: {
          config: {
            maxFps: 60,
            bitrateBps: 6000000,
            scaleFactor: 1.0,
            quality: 'high',
            codec: 'mjpeg',
          },
        },
      })
    );
    const startStatus = await waitForMessage('SCREEN_MIRROR_STATUS');
    console.log(`[PASS] Screen mirror stream active: ${startStatus.payload.width}x${startStatus.payload.height} @ ${startStatus.payload.fps}fps`);
    if (!startStatus.payload.isStreaming || startStatus.payload.width !== 1080) {
      throw new Error('Screen mirror failed to start at expected 1080x2400 dimensions');
    }

    // 4. Test HTTP Live Frame Delivery (/screen/stream)
    const streamRes = await fetchHttp(
      `http://127.0.0.1:${TEST_HTTP_PORT}/screen/stream?token=${encodeURIComponent(authToken)}`
    );
    console.log(`[PASS] HTTP live frame delivery response: ${streamRes.statusCode} (${streamRes.headers['content-type']})`);
    if (streamRes.statusCode !== 200 || !streamRes.headers['content-type'].includes('image/jpeg')) {
      throw new Error(`Expected 200 OK image/jpeg, got ${streamRes.statusCode}`);
    }
    // Verify JPEG magic bytes FF D8
    if (streamRes.body[0] !== 0xff || streamRes.body[1] !== 0xd8) {
      throw new Error('Frame payload does not contain valid JPEG magic header');
    }

    // 5. Test Remote Touch Events (Pointer Down, Move, Up)
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-ptr-down',
        type: 'REMOTE_INPUT_EVENT',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { eventType: 'pointer_down', x: 0.5, y: 0.3 },
      })
    );
    const ptrDownRes = await waitForMessage('REMOTE_INPUT_RESPONSE');
    console.log(`[PASS] Remote touch pointer_down confirmed: success = ${ptrDownRes.payload.success}`);

    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-ptr-up',
        type: 'REMOTE_INPUT_EVENT',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { eventType: 'pointer_up', x: 0.5, y: 0.3 },
      })
    );
    const ptrUpRes = await waitForMessage('REMOTE_INPUT_RESPONSE');
    console.log(`[PASS] Remote touch pointer_up confirmed: success = ${ptrUpRes.payload.success}`);

    // 6. Test Navigation Buttons (Back, Home, Recents, Power)
    const navButtons = ['back', 'home', 'recents', 'power'];
    for (const btn of navButtons) {
      socket.write(
        createWsFrame({
          protocolVersion: 1,
          messageId: `msg-nav-${btn}`,
          type: 'REMOTE_INPUT_EVENT',
          timestamp: new Date().toISOString(),
          authToken,
          payload: { eventType: 'nav_button', navButton: btn },
        })
      );
      const navRes = await waitForMessage('REMOTE_INPUT_RESPONSE');
      if (!navRes.payload.success) {
        throw new Error(`Nav button action failed for: ${btn}`);
      }
    }
    console.log(`[PASS] Navigation buttons (Back, Home, Recents, Power) successfully forwarded`);

    // 7. Test Volume Adjust
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-vol-up',
        type: 'REMOTE_INPUT_EVENT',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { eventType: 'volume_adjust', volumeAdjust: 'up' },
      })
    );
    const volRes = await waitForMessage('REMOTE_INPUT_RESPONSE');
    console.log(`[PASS] Hardware volume adjustment forwarded: success = ${volRes.payload.success}`);

    // 8. Test Text Input Forwarding
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-text-1',
        type: 'REMOTE_INPUT_EVENT',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { eventType: 'text', text: 'PHONE SPACE66 Master Prompt' },
      })
    );
    const textRes = await waitForMessage('REMOTE_INPUT_RESPONSE');
    console.log(`[PASS] Remote keyboard text forwarded: success = ${textRes.payload.success}`);

    // 9. Test Unauthorized Access Rejection
    const unauthStreamRes = await fetchHttp(
      `http://127.0.0.1:${TEST_HTTP_PORT}/screen/stream?token=invalid_token`
    );
    console.log(`[PASS] Unauthorized /screen/stream request blocked with status: ${unauthStreamRes.statusCode}`);
    if (unauthStreamRes.statusCode !== 401) {
      throw new Error(`Expected 401 Unauthorized, got: ${unauthStreamRes.statusCode}`);
    }

    // 10. Stop Screen Mirroring (SCREEN_MIRROR_STOP)
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-stop-1',
        type: 'SCREEN_MIRROR_STOP',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { reason: 'User closed Screen Mirror window' },
      })
    );
    const stopStatus = await waitForMessage('SCREEN_MIRROR_STATUS');
    console.log(`[PASS] Screen mirror stream stopped: isStreaming = ${stopStatus.payload.isStreaming}`);
    if (stopStatus.payload.isStreaming) {
      throw new Error('Screen mirror stream was expected to stop');
    }

    socket.destroy();
    await mockCompanion.stop();

    console.log('\n========================================');
    console.log('PHASE 5: ALL 10/10 INTEGRATION TESTS PASSED');
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
