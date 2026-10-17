import { it, expect } from 'vitest';
import { setJpegDpi, setPngDpi } from '../../packages/photo-engine/src/dpi';
it('writes PNG pixels-per-meter once when repeatedly encoding', () => {
  const pixel = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const a = setPngDpi(pixel, 300),
    b = setPngDpi(a, 300);
  expect(b.length).toBe(a.length);
  const offset = Buffer.from(b).indexOf('pHYs');
  expect(new DataView(b.buffer).getUint32(offset + 4)).toBe(11811);
  expect(b[offset + 12]).toBe(1);
});
it('adds and then updates a JPEG JFIF density segment', () => {
  const a = setJpegDpi(new Uint8Array([255, 216, 255, 217]), 300);
  expect(a[13]).toBe(1);
  expect(a[14] * 256 + a[15]).toBe(300);
  const b = setJpegDpi(a, 150);
  expect(b.length).toBe(a.length);
  expect(b[14] * 256 + b[15]).toBe(150);
});
