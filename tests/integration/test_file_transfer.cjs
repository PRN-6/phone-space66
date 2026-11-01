/**
 * PHONE SPACE66 — Phase 2 Automated Integration Test
 * Validates:
 * 1. Storage directory listing via WebSocket (STORAGE_LIST_REQUEST)
 * 2. Remote directory creation (mkdir)
 * 3. High-throughput chunked HTTP upload with SHA-256 integrity verification
 * 4. Checksum corruption detection & rejection
 * 5. Chunked HTTP streaming download with client-side SHA-256 validation
 * 6. File renaming and deletion operations
 */

const assert = require('assert');
const crypto = require('crypto');
const { MockCompanionDevice } = require('./mock_companion_device.cjs');

async function runFileTransferIntegrationTest() {
  console.log('================================================================');
  console.log('   PHONE SPACE66 — PHASE 2 FILE MANAGEMENT INTEGRATION TEST     ');
  console.log('================================================================\n');

  const wsPort = 6657;
  const httpPort = 6658;
  const companion = new MockCompanionDevice(wsPort, httpPort, {
    model: 'Pixel 8 Pro',
    manufacturer: 'Google',
    pin: '662024',
  });

  await companion.start();
  console.log(`[COMPANION] Mock companion started (WS: ${wsPort}, HTTP: ${httpPort})`);

  // Establish WebSocket connection & Authenticate
  const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws`);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const messagesQueue = [];
  ws.onmessage = (e) => messagesQueue.push(JSON.parse(e.data));

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

  // Authenticate
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'auth-req-1',
      type: 'PAIR_REQUEST',
      timestamp: new Date().toISOString(),
      payload: { desktopName: 'PHONE SPACE66 Test Desktop', desktopId: 'desk-01' },
    })
  );
  await waitForMessage('PAIR_CHALLENGE');

  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'auth-ver-1',
      type: 'PAIR_VERIFY',
      timestamp: new Date().toISOString(),
      payload: { pin: '662024' },
    })
  );
  const pairSuccess = await waitForMessage('PAIR_SUCCESS');
  const token = pairSuccess.payload.authToken;
  console.log(`✓ Authenticated: Session Bearer Token granted`);

  // -------------------------------------------------------------
  // Test 1: Storage Directory Listing
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Requesting directory listing for /storage/emulated/0...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'storage-list-01',
      type: 'STORAGE_LIST_REQUEST',
      authToken: token,
      timestamp: new Date().toISOString(),
      payload: { path: '/storage/emulated/0' },
    })
  );

  const listResponse = await waitForMessage('STORAGE_LIST_RESPONSE');
  assert.strictEqual(listResponse.payload.currentPath, '/storage/emulated/0');
  assert.ok(listResponse.payload.entries.length >= 6, 'Should contain standard directories');
  const dirNames = listResponse.payload.entries.map((e) => e.name);
  assert.ok(dirNames.includes('DCIM'), 'Should include DCIM');
  assert.ok(dirNames.includes('Download'), 'Should include Download');
  assert.ok(dirNames.includes('Pictures'), 'Should include Pictures');
  console.log(`✓ PASS: Listed ${listResponse.payload.entries.length} items in root directory`);

  // -------------------------------------------------------------
  // Test 2: Directory Creation (mkdir)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing folder creation (mkdir: "ProjectBackup")...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'mkdir-01',
      type: 'FILE_OPERATION_REQUEST',
      authToken: token,
      timestamp: new Date().toISOString(),
      payload: {
        action: 'mkdir',
        targetPath: '/storage/emulated/0',
        newFolderName: 'ProjectBackup',
      },
    })
  );

  const mkdirRes = await waitForMessage('FILE_OPERATION_RESPONSE');
  assert.strictEqual(mkdirRes.payload.action, 'mkdir');
  assert.strictEqual(mkdirRes.payload.success, true);
  assert.strictEqual(mkdirRes.payload.destinationPath, '/storage/emulated/0/ProjectBackup');
  console.log('✓ PASS: Created folder /storage/emulated/0/ProjectBackup successfully');

  // -------------------------------------------------------------
  // Test 3: Bidirectional Streaming File Upload (Laptop -> Phone)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing streaming file upload (256 KB binary file)...');
  const uploadPayload = crypto.randomBytes(262144); // 256 KB
  const clientChecksum = crypto.createHash('sha256').update(uploadPayload).digest('hex');

  const uploadUrl = `http://127.0.0.1:${httpPort}/upload?destination=/storage/emulated/0/ProjectBackup&filename=archive_v1.bin`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SHA256-Checksum': clientChecksum,
      'Content-Type': 'application/octet-stream',
    },
    body: uploadPayload,
  });

  assert.strictEqual(uploadRes.status, 200, 'Upload should return 200 OK');
  const uploadResult = await uploadRes.json();
  assert.strictEqual(uploadResult.success, true);
  assert.strictEqual(uploadResult.sha256, clientChecksum, 'SHA-256 on phone must match client calculation');
  console.log(`✓ PASS: Streamed 256 KB to phone with verified SHA-256: ${clientChecksum.substring(0, 16)}...`);

  // -------------------------------------------------------------
  // Test 4: Checksum Integrity Mismatch Rejection
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing rejection of corrupted checksum upload...');
  const corruptChecksum = '0000000000000000000000000000000000000000000000000000000000000000';
  const corruptRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-SHA256-Checksum': corruptChecksum,
      'Content-Type': 'application/octet-stream',
    },
    body: uploadPayload,
  });

  assert.strictEqual(corruptRes.status, 422, 'Corrupt checksum must be rejected with 422');
  console.log('✓ PASS: FileServer rejected upload with invalid SHA-256 checksum');

  // -------------------------------------------------------------
  // Test 5: Bidirectional Streaming File Download (Phone -> Laptop)
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing streaming file download from phone...');
  const downloadUrl = `http://127.0.0.1:${httpPort}/download?path=/storage/emulated/0/ProjectBackup/archive_v1.bin`;
  const dlRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.strictEqual(dlRes.status, 200, 'Download should return 200 OK');
  const serverChecksum = dlRes.headers.get('x-sha256-checksum');
  assert.strictEqual(serverChecksum, clientChecksum);

  const downloadedBytes = Buffer.from(await dlRes.arrayBuffer());
  const clientDlChecksum = crypto.createHash('sha256').update(downloadedBytes).digest('hex');
  assert.strictEqual(clientDlChecksum, clientChecksum, 'Client-computed checksum must match original');
  assert.strictEqual(downloadedBytes.length, 262144, 'Downloaded byte count must match');
  console.log(`✓ PASS: Streamed 256 KB from phone with verified SHA-256 integrity`);

  // -------------------------------------------------------------
  // Test 6: File Rename Operation
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing remote file rename...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'rename-01',
      type: 'FILE_OPERATION_REQUEST',
      authToken: token,
      timestamp: new Date().toISOString(),
      payload: {
        action: 'rename',
        targetPath: '/storage/emulated/0/ProjectBackup/archive_v1.bin',
        destinationPath: 'archive_v2_renamed.bin',
      },
    })
  );

  const renameRes = await waitForMessage('FILE_OPERATION_RESPONSE');
  assert.strictEqual(renameRes.payload.action, 'rename');
  assert.strictEqual(renameRes.payload.success, true);
  console.log('✓ PASS: File renamed successfully to archive_v2_renamed.bin');

  // -------------------------------------------------------------
  // Test 7: File Deletion Operation
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing remote file deletion...');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      messageId: 'delete-01',
      type: 'FILE_OPERATION_REQUEST',
      authToken: token,
      timestamp: new Date().toISOString(),
      payload: {
        action: 'delete',
        targetPath: '/storage/emulated/0/ProjectBackup/archive_v2_renamed.bin',
      },
    })
  );

  const deleteRes = await waitForMessage('FILE_OPERATION_RESPONSE');
  assert.strictEqual(deleteRes.payload.action, 'delete');
  assert.strictEqual(deleteRes.payload.success, true);
  console.log('✓ PASS: File deleted successfully from phone');

  // Cleanup
  ws.close();
  await companion.stop();

  console.log('\n================================================================');
  console.log('  ALL FILE MANAGEMENT TESTS PASSED (7/7) — PHASE 2 VALIDATED    ');
  console.log('================================================================\n');
}

runFileTransferIntegrationTest().catch((err) => {
  console.error('\n❌ FILE MANAGEMENT TEST FAILED:', err);
  process.exit(1);
});
