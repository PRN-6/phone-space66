/**
 * Generates PNG icon files and ICO for Tauri 2 desktop bundle packaging
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(width, height) {
  const rowLen = width * 4 + 1;
  const rawData = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const nx = x / width;
      const ny = y / height;

      // Distance from center
      const dx = (nx - 0.5) * 2;
      const dy = (ny - 0.5) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.85) {
        // Dark Obsidian / Carbon background with metallic silver highlight
        const shade = Math.floor(18 + (1 - dist) * 24);
        rawData[pxOffset] = shade;     // R
        rawData[pxOffset + 1] = shade; // G
        rawData[pxOffset + 2] = shade; // B
        rawData[pxOffset + 3] = 255;   // A

        // Draw central "66" metallic frame
        if (nx > 0.35 && nx < 0.65 && ny > 0.25 && ny < 0.75) {
          if (nx < 0.38 || nx > 0.62 || ny < 0.28 || ny > 0.72) {
            // Silver border
            rawData[pxOffset] = 220;
            rawData[pxOffset + 1] = 220;
            rawData[pxOffset + 2] = 220;
          }
        }
      } else if (dist < 0.95) {
        // Border ring
        rawData[pxOffset] = 60;
        rawData[pxOffset + 1] = 60;
        rawData[pxOffset + 2] = 60;
        rawData[pxOffset + 3] = 255;
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = Buffer.alloc(12 + 13);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  const ihdrCrc = crc32(ihdrChunk.subarray(4, 21));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // IDAT
  const idatChunk = Buffer.alloc(12 + deflated.length);
  idatChunk.writeUInt32BE(deflated.length, 0);
  idatChunk.write('IDAT', 4);
  deflated.copy(idatChunk, 8);
  const idatCrc = crc32(idatChunk.subarray(4, 8 + deflated.length));
  idatChunk.writeUInt32BE(idatCrc, 8 + deflated.length);

  // IEND
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write('IEND', 4);
  const iendCrc = crc32(iendChunk.subarray(4, 8));
  iendChunk.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(png32Buffer) {
  // Simple ICO wrapper for 32x32 PNG
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type: 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0); // width
  dirEntry.writeUInt8(32, 1); // height
  dirEntry.writeUInt8(0, 2);  // color count
  dirEntry.writeUInt8(0, 3);  // reserved
  dirEntry.writeUInt16LE(1, 4); // color planes
  dirEntry.writeUInt16LE(32, 6); // bits per pixel
  dirEntry.writeUInt32LE(png32Buffer.length, 8); // size
  dirEntry.writeUInt32LE(6 + 16, 12); // offset

  return Buffer.concat([icoHeader, dirEntry, png32Buffer]);
}

const iconsDir = path.join(__dirname, '..', 'desktop', 'src-tauri', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const png32 = createPng(32, 32);
const png128 = createPng(128, 128);
const png256 = createPng(256, 256);
const png512 = createPng(512, 512);
const ico = createIco(png32);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), png512);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), png512);

console.log('App icons generated in:', iconsDir);
