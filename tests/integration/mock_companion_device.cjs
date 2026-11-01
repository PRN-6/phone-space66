/**
 * PHONE SPACE66 — Mock Android Companion Device
 * Simulates a real Android phone running PHONE SPACE66 Companion.
 * Uses pure Node.js (no external npm dependencies required) to implement RFC 6455 WebSocket & HTTP.
 */

const http = require('http');
const crypto = require('crypto');

class MockCompanionDevice {
  constructor(port = 6655, options = {}) {
    this.port = port;
    this.model = options.model || 'Pixel 8 Pro';
    this.manufacturer = options.manufacturer || 'Google';
    this.pin = options.pin || '662024';
    this.activeToken = 'pst_' + crypto.randomBytes(24).toString('base64url');
    this.batteryLevel = options.batteryLevel || 88;
    this.server = null;
    this.activeSockets = new Set();
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
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

      this.server.on('upgrade', (req, socket, head) => {
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

      this.server.listen(this.port, '0.0.0.0', () => {
        resolve(this.port);
      });

      this.server.on('error', reject);
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
          // Close frame
          socket.end();
          break;
        }

        if (opcode === 1) {
          // Text frame
          const text = payload.toString('utf8');
          this.handleMessage(socket, text);
        }
      }
    });

    socket.on('close', () => {
      this.activeSockets.delete(socket);
    });
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

          // Return full real device telemetry
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
                totalRamBytes: 12884901888, // 12 GB
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
                totalBytes: 256000000000, // 256 GB
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

        default:
          console.warn('Unhandled message type:', type);
      }
    } catch (e) {
      console.error('Error handling mock frame:', e);
    }
  }

  stop() {
    return new Promise((resolve) => {
      for (const socket of this.activeSockets) {
        socket.destroy();
      }
      this.activeSockets.clear();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

module.exports = { MockCompanionDevice };

