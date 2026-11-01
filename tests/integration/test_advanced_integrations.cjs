/**
 * PHONE SPACE66 — Integration Test: Phase 6 Advanced Integrations
 * Verifies:
 * 1. Companion pairing & token acquisition
 * 2. Notification synchronization: listing, active events, and remote dismiss
 * 3. Bi-directional clipboard synchronization
 * 4. Active media playback state & transport controls (Play/Pause/Toggle)
 * 5. Media Gallery exploration: categorizing (All, Camera, Screenshots, Videos)
 * 6. Security: rejection of unauthorized advanced integration requests
 */

const http = require('http');
const crypto = require('crypto');
const { MockCompanionDevice } = require('./mock_companion_device.cjs');

const TEST_WS_PORT = 6665;
const TEST_HTTP_PORT = 6666;

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
  console.log('--- PHONE SPACE66: Phase 6 Advanced Integrations Test ---');
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

    // 2. Test Notification List Request
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-notif-list-1',
        type: 'NOTIFICATION_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: {},
      })
    );
    const notifListMsg = await waitForMessage('NOTIFICATION_LIST_RESPONSE');
    const notifications = notifListMsg.payload.notifications;
    console.log(`[PASS] Notifications retrieved: ${notifications.length} active notifications`);
    if (notifications.length < 2 || !notifications.some((n) => n.id === 'notif-wa-01')) {
      throw new Error('Expected sample notifications not present in response');
    }

    // 3. Test Notification Dismiss Request
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-notif-dismiss',
        type: 'NOTIFICATION_DISMISS_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { notificationId: 'notif-wa-01' },
      })
    );
    const notifRemovedMsg = await waitForMessage('NOTIFICATION_REMOVED');
    console.log(`[PASS] Notification dismissed remotely: ID = ${notifRemovedMsg.payload.notificationId}`);
    if (notifRemovedMsg.payload.notificationId !== 'notif-wa-01') {
      throw new Error('Notification removal ID mismatch');
    }

    // 4. Test Bi-directional Clipboard Sync
    const testClipboardContent = 'PHONE SPACE66 Master Security Key: 0x99AABB';
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-clip-1',
        type: 'CLIPBOARD_SYNC',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { text: testClipboardContent, timestamp: Date.now(), source: 'desktop' },
      })
    );
    const clipEchoMsg = await waitForMessage('CLIPBOARD_SYNC');
    console.log(`[PASS] Clipboard synced with phone: "${clipEchoMsg.payload.text}"`);
    if (clipEchoMsg.payload.text !== testClipboardContent) {
      throw new Error('Clipboard text synchronization mismatch');
    }

    // 5. Test Media Playback State Request
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-media-1',
        type: 'MEDIA_PLAYBACK_STATE',
        timestamp: new Date().toISOString(),
        authToken,
        payload: {},
      })
    );
    const mediaStateMsg = await waitForMessage('MEDIA_PLAYBACK_STATE');
    console.log(`[PASS] Media session detected: "${mediaStateMsg.payload.title}" by ${mediaStateMsg.payload.artist} (isPlaying: ${mediaStateMsg.payload.isPlaying})`);
    if (!mediaStateMsg.payload.hasActiveSession || mediaStateMsg.payload.title !== 'Midnight City') {
      throw new Error('Media session state mismatch');
    }

    // 6. Test Media Control Action (Toggle Play/Pause)
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-media-act-1',
        type: 'MEDIA_CONTROL_ACTION',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { action: 'toggle' },
      })
    );
    const mediaToggledMsg = await waitForMessage('MEDIA_PLAYBACK_STATE');
    console.log(`[PASS] Media playback action executed: isPlaying toggled to ${mediaToggledMsg.payload.isPlaying}`);
    if (mediaToggledMsg.payload.isPlaying !== false) {
      throw new Error('Expected media playback to pause');
    }

    // 7. Test Gallery List Request - All Media
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-gallery-all',
        type: 'GALLERY_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { category: 'all' },
      })
    );
    const galleryAllMsg = await waitForMessage('GALLERY_LIST_RESPONSE');
    console.log(`[PASS] Gallery All Media retrieved: ${galleryAllMsg.payload.items.length} items`);
    if (galleryAllMsg.payload.items.length < 3) {
      throw new Error('Expected at least 3 gallery items in test storage');
    }

    // 8. Test Gallery List Request - Videos Category
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-gallery-videos',
        type: 'GALLERY_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { category: 'videos' },
      })
    );
    const galleryVideosMsg = await waitForMessage('GALLERY_LIST_RESPONSE');
    console.log(`[PASS] Gallery Videos retrieved: ${galleryVideosMsg.payload.items.length} video item(s)`);
    if (!galleryVideosMsg.payload.items.every((i) => i.mimeType.startsWith('video/'))) {
      throw new Error('Non-video file returned in gallery videos category');
    }

    // 9. Test Gallery List Request - Camera DCIM Category
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-gallery-camera',
        type: 'GALLERY_LIST_REQUEST',
        timestamp: new Date().toISOString(),
        authToken,
        payload: { category: 'camera' },
      })
    );
    const galleryCameraMsg = await waitForMessage('GALLERY_LIST_RESPONSE');
    console.log(`[PASS] Gallery Camera retrieved: ${galleryCameraMsg.payload.items.length} camera photo(s)`);
    if (!galleryCameraMsg.payload.items.some((i) => i.path.includes('/DCIM/'))) {
      throw new Error('Camera photo missing from DCIM gallery query');
    }

    // 10. Security: Reject unauthenticated advanced request
    socket.write(
      createWsFrame({
        protocolVersion: 1,
        messageId: 'msg-unauth-clip',
        type: 'CLIPBOARD_SYNC',
        timestamp: new Date().toISOString(),
        authToken: 'invalid_token_9999',
        payload: { text: 'malicious attempt' },
      })
    );
    const unauthErrorMsg = await waitForMessage('ERROR_RESPONSE');
    console.log(`[PASS] Unauthenticated request blocked with: ${unauthErrorMsg.payload.code}`);
    if (unauthErrorMsg.payload.code !== 'AUTH_REQUIRED') {
      throw new Error('Expected AUTH_REQUIRED for unauthenticated request');
    }

    socket.destroy();
    await mockCompanion.stop();

    console.log('\n========================================');
    console.log('PHASE 6: ALL 10/10 INTEGRATION TESTS PASSED');
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
