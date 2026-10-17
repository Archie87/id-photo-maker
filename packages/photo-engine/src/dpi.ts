function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes[0] !== 137 || bytes[1] !== 80) throw new Error('无效 PNG');
  const chunk = new Uint8Array(21),
    v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  const ppm = Math.round(dpi / 0.0254);
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  chunk[16] = 1;
  v.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let pos = 8;
  while (pos + 12 <= bytes.length) {
    const len = new DataView(bytes.buffer, bytes.byteOffset + pos, 4).getUint32(0);
    const end = pos + len + 12;
    if (end > bytes.length) throw new Error('PNG 数据不完整');
    const kind = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    if (kind !== 'pHYs') parts.push(bytes.subarray(pos, end));
    if (kind === 'IHDR') parts.push(chunk);
    pos = end;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
export function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('无效 JPEG');
  const out = new Uint8Array(bytes);
  let pos = 2;
  while (pos + 18 <= out.length && out[pos] === 255) {
    const marker = out[pos + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = out[pos + 2] * 256 + out[pos + 3];
    if (len < 2) break;
    if (marker === 0xe0 && String.fromCharCode(...out.subarray(pos + 4, pos + 9)) === 'JFIF\0') {
      out[pos + 11] = 1;
      out[pos + 12] = dpi >> 8;
      out[pos + 13] = dpi & 255;
      out[pos + 14] = dpi >> 8;
      out[pos + 15] = dpi & 255;
      return out;
    }
    pos += len + 2;
  }
  const app = new Uint8Array([
    255,
    224,
    0,
    16,
    74,
    70,
    73,
    70,
    0,
    1,
    1,
    1,
    dpi >> 8,
    dpi & 255,
    dpi >> 8,
    dpi & 255,
    0,
    0,
  ]);
  const result = new Uint8Array(bytes.length + app.length);
  result.set(bytes.subarray(0, 2));
  result.set(app, 2);
  result.set(bytes.subarray(2), 20);
  return result;
}
