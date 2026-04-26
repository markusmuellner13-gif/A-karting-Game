// One-time script: generates PNG app icons using only built-in Node modules
const zlib = require('zlib');
const fs   = require('fs');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  c = (c ^ 0xFFFFFFFF) >>> 0;
  const b = Buffer.alloc(4); b.writeUInt32BE(c, 0); return b;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t   = Buffer.from(type);
  return Buffer.concat([len, t, data, crc32(Buffer.concat([t, data]))]);
}

function makePNG(size) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=2; // 8-bit RGB

  // Draw each pixel
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      // Background: dark navy
      let r = 10, g = 10, b = 26;

      // Orange outer ring
      const cx = x - size/2, cy = y - size/2;
      const dist = Math.sqrt(cx*cx + cy*cy);
      const outerR = size * 0.48, ringW = size * 0.1;
      if (dist < outerR && dist > outerR - ringW) { r=255; g=68; b=0; }

      // Checkered flag patch (top-right quadrant)
      const inPatch = x > size*0.52 && y < size*0.48;
      if (inPatch && dist < outerR - ringW - 2) {
        const cx2 = x - size*0.52, cy2 = y;
        const sq = Math.floor(size / 8);
        const isWhite = (Math.floor(cx2 / sq) + Math.floor(cy2 / sq)) % 2 === 0;
        r = isWhite ? 255 : 20; g = isWhite ? 255 : 20; b = isWhite ? 255 : 20;
      }

      // Simple kart body (orange rectangle, left side of circle)
      const inKart = x > size*0.14 && x < size*0.52 && y > size*0.38 && y < size*0.62;
      if (inKart && dist < outerR - ringW - 2) { r=255; g=68; b=0; }
      const inCockpit = x > size*0.16 && x < size*0.4 && y > size*0.41 && y < size*0.59;
      if (inCockpit) { r=200; g=200; b=255; }

      row[1 + x*3]     = r;
      row[1 + x*3 + 1] = g;
      row[1 + x*3 + 2] = b;
    }
    rows.push(row);
  }

  const raw  = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('./public/icon-192.png', makePNG(192));
fs.writeFileSync('./public/icon-512.png', makePNG(512));
console.log('Icons created: public/icon-192.png, public/icon-512.png');
