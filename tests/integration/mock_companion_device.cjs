/**
 * PHONE SPACE66 — Mock Android Companion Device
 * Simulates a real Android phone running PHONE SPACE66 Companion.
 * Uses pure Node.js (no external npm dependencies required) to implement:
 * 1. Port 6655 (Control WebSocket & Discovery)
 * 2. Port 6656 (High-Speed HTTP Streaming File Transfer with SHA-256 validation)
 */

const http = require('http');
const crypto = require('crypto');

class MockCompanionDevice {
  constructor(wsPort = 6655, httpPortOrOptions = 6656, options = {}) {
    let httpPort = 6656;
    let opts = options;
    if (typeof httpPortOrOptions === 'object' && httpPortOrOptions !== null) {
      opts = httpPortOrOptions;
      httpPort = (typeof wsPort === 'number' ? wsPort + 1 : 6656);
    } else if (typeof httpPortOrOptions === 'number') {
      httpPort = httpPortOrOptions;
    }

    this.wsPort = wsPort;
    this.httpPort = httpPort;
    this.model = opts.model || 'Pixel 8 Pro';
    this.manufacturer = opts.manufacturer || 'Google';
    this.pin = opts.pin || '662024';
    this.activeToken = 'pst_' + crypto.randomBytes(24).toString('base64url');
    this.batteryLevel = opts.batteryLevel || 88;

    this.wsServer = null;
    this.httpServer = null;
    this.activeSockets = new Set();

    // In-memory virtual file storage representing Android phone files
    this.virtualFiles = new Map();
    this.initVirtualStorage();
  }

  initVirtualStorage() {
    const root = '/storage/emulated/0';
    const sampleImageContent = Buffer.from('RIFF....WEBPVP8 ...MOCK_IMAGE_DATA...');
    const sampleTextContent = Buffer.from('PHONE SPACE66 Master Configuration\nAndroid Companion Active.\nSecurity: Authenticated LAN.');

    this.virtualFiles.set(root, {
      path: root,
      name: '0',
      isDirectory: true,
      sizeBytes: 0,
      modifiedAt: Date.now() - 1000000,
      mimeType: 'inode/directory',
      extension: '',
      isWritable: true,
    });

    const standardDirs = ['DCIM', 'Download', 'Pictures', 'Documents', 'Music', 'Movies'];
    for (const d of standardDirs) {
      const p = `${root}/${d}`;
      this.virtualFiles.set(p, {
        path: p,
        name: d,
        isDirectory: true,
        sizeBytes: 0,
        modifiedAt: Date.now() - 500000,
        mimeType: 'inode/directory',
        extension: '',
        isWritable: true,
      });
    }

    // Sample files
    this.addFile(`${root}/Pictures/photo_2026.jpg`, sampleImageContent, 'image/jpeg', 'jpg');
    this.addFile(`${root}/Documents/notes.txt`, sampleTextContent, 'text/plain', 'txt');
  }

  addFile(path, buffer, mimeType, extension) {
    const name = path.split('/').pop();
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    this.virtualFiles.set(path, {
      path,
      name,
      isDirectory: false,
      sizeBytes: buffer.length,
      modifiedAt: Date.now(),
      mimeType,
      extension,
      isWritable: true,
      buffer,
      sha256,
    });
  }

  start() {
    return Promise.all([this.startWsServer(), this.startHttpServer()]);
  }

  startWsServer() {
    return new Promise((resolve, reject) => {
      this.wsServer = http.createServer((req, res) => {
        if (req.url === '/ping') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(
            JSON.stringify({
              status: 'ready',
              name: `PHONE SPACE66 Companion - ${this.model}`,
              model: this.model,
              version: 1,
            })
          );
          return;
        }
        res.writeHead(404);
        res.end();
      });

      this.wsServer.on('upgrade', (req, socket, head) => {
        if (req.url !== '/ws') {
          socket.destroy();
          return;
        }

        const key = req.headers['sec-websocket-key'];
        if (!key) {
          socket.destroy();
          return;
        }

        const digest = crypto
          .createHash('sha1')
          .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64');

        const responseHeaders = [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${digest}`,
          '\r\n',
        ];

        socket.write(responseHeaders.join('\r\n'));
        this.setupWebSocket(socket);
      });

      this.wsServer.listen(this.wsPort, '0.0.0.0', () => resolve(this.wsPort));
      this.wsServer.on('error', reject);
    });
  }

  startHttpServer() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const urlObj = new URL(req.url, `http://127.0.0.1:${this.httpPort}`);
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (token !== this.activeToken) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Authentication required' }));
          return;
        }

        // GET /download?path=...
        if (req.method === 'GET' && urlObj.pathname === '/download') {
          const filePath = urlObj.searchParams.get('path');
          const file = this.virtualFiles.get(filePath);

          if (!file || file.isDirectory) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
          }

          res.writeHead(200, {
            'Content-Type': file.mimeType || 'application/octet-stream',
            'Content-Length': file.buffer.length,
            'Content-Disposition': `attachment; filename="${file.name}"`,
            'X-SHA256-Checksum': file.sha256,
          });

          // Stream in 64KB chunks to simulate streaming transfer
          let offset = 0;
          const chunkSize = 65536;
          const sendChunk = () => {
            if (offset < file.buffer.length) {
              const chunk = file.buffer.subarray(offset, offset + chunkSize);
              offset += chunk.length;
              res.write(chunk);
              setImmediate(sendChunk);
            } else {
              res.end();
            }
          };
          sendChunk();
          return;
        }

        // POST /upload?destination=...&filename=...
        if (req.method === 'POST' && urlObj.pathname === '/upload') {
          const dest = urlObj.searchParams.get('destination') || '/storage/emulated/0';
          const filename = urlObj.searchParams.get('filename');
          const expectedSha256 = (req.headers['x-sha256-checksum'] || '').toLowerCase();

          if (!filename) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing filename parameter' }));
            return;
          }

          const chunks = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            const calculatedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            if (expectedSha256 && expectedSha256 !== calculatedSha256) {
              res.writeHead(422, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Checksum verification mismatch' }));
              return;
            }

            const targetPath = `${dest}/${filename}`;
            const ext = filename.split('.').pop() || '';
            this.addFile(targetPath, fileBuffer, 'application/octet-stream', ext);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                path: targetPath,
                sha256: calculatedSha256,
                bytes: fileBuffer.length,
              })
            );
          });
          return;
        }

        res.writeHead(404);
        res.end();
      });

      this.httpServer.listen(this.httpPort, '0.0.0.0', () => resolve(this.httpPort));
      this.httpServer.on('error', reject);
    });
  }

  setupWebSocket(socket) {
    this.activeSockets.add(socket);
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        const opcode = firstByte & 0x0f;
        const isMasked = (secondByte & 0x80) !== 0;
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) break;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) break;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        let mask = null;
        if (isMasked) {
          if (buffer.length < offset + 4) break;
          mask = buffer.subarray(offset, offset + 4);
          offset += 4;
        }

        if (buffer.length < offset + payloadLen) break;

        const payload = buffer.subarray(offset, offset + payloadLen);
        buffer = buffer.subarray(offset + payloadLen);

        if (isMasked && mask) {
          for (let i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4];
          }
        }

        if (opcode === 8) {
          socket.end();
          break;
        }

        if (opcode === 1) {
          const text = payload.toString('utf8');
          this.handleMessage(socket, text);
        }
      }
    });

    socket.on('close', () => this.activeSockets.delete(socket));
  }

  sendFrame(socket, dataObj) {
    const jsonStr = JSON.stringify(dataObj);
    const payload = Buffer.from(jsonStr, 'utf8');
    let header;

    if (payload.length < 126) {
      header = Buffer.from([0x81, payload.length]);
    } else if (payload.length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }

    socket.write(Buffer.concat([header, payload]));
  }

  handleMessage(socket, rawText) {
    try {
      const msg = JSON.parse(rawText);
      const { type, requestId, authToken, payload } = msg;

      switch (type) {
        case 'PAIR_REQUEST': {
          const challenge = crypto.randomBytes(16).toString('base64');
          this.sendFrame(socket, {
            protocolVersion: 1,
            messageId: 'msg-' + crypto.randomUUID(),
            requestId,
            type: 'PAIR_CHALLENGE',
            timestamp: new Date().toISOString(),
            payload: {
              phoneName: `${this.manufacturer} ${this.model}`,
              phoneModel: this.model,
              challenge,
              pinRequired: true,
              pin: this.pin,
            },
          });
          break;
        }

        case 'PAIR_VERIFY': {
          if (payload && payload.pin === this.pin) {
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'PAIR_SUCCESS',
              timestamp: new Date().toISOString(),
              payload: {
                authToken: this.activeToken,
                expiresAt: Date.now() + 7 * 86400000,
                phoneId: 'android-hw-fingerprint-66',
                phoneName: `${this.manufacturer} ${this.model}`,
              },
            });
          } else {
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'PAIR_REJECT',
              timestamp: new Date().toISOString(),
              payload: {
                reason: 'Invalid 6-digit PIN entered',
              },
            });
          }
          break;
        }

        case 'HEARTBEAT': {
          this.sendFrame(socket, {
            protocolVersion: 1,
            messageId: 'msg-' + crypto.randomUUID(),
            requestId,
            type: 'HEARTBEAT_ACK',
            timestamp: new Date().toISOString(),
            payload: {
              clientTimestamp: payload?.clientTimestamp || Date.now(),
              serverTimestamp: Date.now(),
            },
          });
          break;
        }

        case 'DEVICE_INFO_REQUEST': {
          if (!authToken || authToken !== this.activeToken) {
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'ERROR_RESPONSE',
              timestamp: new Date().toISOString(),
              payload: {
                code: 'AUTH_REQUIRED',
                message: 'Valid pairing token required',
              },
            });
            return;
          }

          this.sendFrame(socket, {
            protocolVersion: 1,
            messageId: 'msg-' + crypto.randomUUID(),
            requestId,
            type: 'DEVICE_INFO_RESPONSE',
            timestamp: new Date().toISOString(),
            payload: {
              device: {
                manufacturer: this.manufacturer,
                model: this.model,
                marketName: `${this.manufacturer} ${this.model}`,
                androidVersion: '14',
                sdkInt: 34,
                uptimeMs: 7420100,
                totalRamBytes: 12884901888,
                availableRamBytes: 6442450944,
              },
              battery: {
                level: this.batteryLevel,
                isCharging: true,
                chargingSource: 'USB_PD',
                temperatureCelsius: 29.5,
                health: 'GOOD',
              },
              storage: {
                totalBytes: 256000000000,
                availableBytes: 168000000000,
                usedBytes: 88000000000,
              },
              network: {
                ipAddress: '127.0.0.1',
                ssid: 'Space66-5G',
                linkSpeedMbps: 1200,
                isWifi: true,
                isHotspot: false,
              },
            },
          });
          break;
        }

        // Phase 2: Directory Listing
        case 'STORAGE_LIST_REQUEST': {
          if (!authToken || authToken !== this.activeToken) {
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'ERROR_RESPONSE',
              timestamp: new Date().toISOString(),
              payload: { code: 'AUTH_REQUIRED', message: 'Auth token required' },
            });
            return;
          }

          const targetDir = payload?.path || '/storage/emulated/0';
          const entries = [];

          for (const [fPath, fObj] of this.virtualFiles.entries()) {
            if (fPath !== targetDir && fPath.startsWith(targetDir)) {
              // Direct child check
              const sub = fPath.substring(targetDir.endsWith('/') ? targetDir.length : targetDir.length + 1);
              if (!sub.includes('/')) {
                entries.push({
                  name: fObj.name,
                  path: fObj.path,
                  isDirectory: fObj.isDirectory,
                  sizeBytes: fObj.sizeBytes,
                  modifiedAt: fObj.modifiedAt,
                  mimeType: fObj.mimeType,
                  extension: fObj.extension,
                  isWritable: fObj.isWritable,
                });
              }
            }
          }

          const parent = targetDir === '/storage/emulated/0' ? null : targetDir.substring(0, targetDir.lastIndexOf('/')) || '/storage/emulated/0';

          this.sendFrame(socket, {
            protocolVersion: 1,
            messageId: 'msg-' + crypto.randomUUID(),
            requestId,
            type: 'STORAGE_LIST_RESPONSE',
            timestamp: new Date().toISOString(),
            payload: {
              currentPath: targetDir,
              parentPath: parent,
              entries,
              totalEntries: entries.length,
            },
          });
          break;
        }

        // Phase 2: File Operations
        case 'FILE_OPERATION_REQUEST': {
          if (!authToken || authToken !== this.activeToken) {
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'ERROR_RESPONSE',
              timestamp: new Date().toISOString(),
              payload: { code: 'AUTH_REQUIRED', message: 'Auth token required' },
            });
            return;
          }

          const { action, targetPath, newFolderName, destinationPath } = payload;
          if (action === 'mkdir') {
            const newPath = `${targetPath}/${newFolderName || 'New Folder'}`;
            this.virtualFiles.set(newPath, {
              path: newPath,
              name: newFolderName || 'New Folder',
              isDirectory: true,
              sizeBytes: 0,
              modifiedAt: Date.now(),
              mimeType: 'inode/directory',
              extension: '',
              isWritable: true,
            });

            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'FILE_OPERATION_RESPONSE',
              timestamp: new Date().toISOString(),
              payload: { action: 'mkdir', success: true, targetPath, destinationPath: newPath },
            });
          } else if (action === 'delete') {
            this.virtualFiles.delete(targetPath);
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'FILE_OPERATION_RESPONSE',
              timestamp: new Date().toISOString(),
              payload: { action: 'delete', success: true, targetPath },
            });
          } else if (action === 'rename') {
            const file = this.virtualFiles.get(targetPath);
            if (file) {
              this.virtualFiles.delete(targetPath);
              file.name = destinationPath;
              file.path = targetPath.substring(0, targetPath.lastIndexOf('/') + 1) + destinationPath;
              this.virtualFiles.set(file.path, file);
            }
            this.sendFrame(socket, {
              protocolVersion: 1,
              messageId: 'msg-' + crypto.randomUUID(),
              requestId,
              type: 'FILE_OPERATION_RESPONSE',
              timestamp: new Date().toISOString(),
              payload: { action: 'rename', success: true, targetPath, destinationPath },
            });
          }
          break;
        }

        default:
          console.warn('Unhandled message type:', type);
      }
    } catch (e) {
      console.error('Error handling mock frame:', e);
    }
  }

  stop() {
    return Promise.all([
      new Promise((resolve) => {
        for (const socket of this.activeSockets) socket.destroy();
        this.activeSockets.clear();
        if (this.wsServer) this.wsServer.close(() => resolve());
        else resolve();
      }),
      new Promise((resolve) => {
        if (this.httpServer) this.httpServer.close(() => resolve());
        else resolve();
      }),
    ]);
  }
}

module.exports = { MockCompanionDevice };
