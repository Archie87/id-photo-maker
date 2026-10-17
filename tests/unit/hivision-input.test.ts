import { expect, it } from 'vitest';
import { hivisionInput } from '../../packages/ai-engine/src/hivision-input';

it('uses fixed RGB NCHW 512-square input and handles transparency without mutating source', () => {
  const source = new Uint8ClampedArray([255, 0, 128, 255]);
  const result = hivisionInput({ width: 1, height: 1, data: source });
  expect([result.width, result.height]).toEqual([512, 512]);
  expect(result.data[0]).toBe(1);
  expect(result.data[512 * 512]).toBe(-1);
  expect(result.data[2 * 512 * 512]).toBeCloseTo(128 / 127.5 - 1);
  expect([...source]).toEqual([255, 0, 128, 255]);
  expect(
    hivisionInput({ width: 1, height: 1, data: new Uint8ClampedArray(4) }).data.every(
      (v) => v === 1,
    ),
  ).toBe(true);
  expect(() => hivisionInput({ width: 2, height: 1, data: source })).toThrow();
  expect(() => hivisionInput({ width: 0, height: 1, data: new Uint8ClampedArray() })).toThrow();
});

it('agrees with independent OpenCV INTER_AREA reference samples on noninteger downscaling', () => {
  const width = 769,
    height = 513,
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data.set([(x * 3 + y * 5) % 256, (x * 7 + y) % 256, (x + y * 11) % 256, 255], i);
    }
  const result = hivisionInput({ width, height, data });
  // Reference: cv2.resize(uint8 RGB, (512,512), interpolation=cv2.INTER_AREA).
  for (const [x, y, r, g, b] of [
    [0, 0, 1, 2, 0],
    [1, 1, 10, 13, 13],
    [100, 77, 69, 106, 231],
    [255, 255, 123, 123, 122],
    [511, 511, 85, 84, 86],
  ]) {
    for (const [c, v] of [r, g, b].entries())
      expect(result.data[c * 512 * 512 + y * 512 + x]).toBeCloseTo(v / 127.5 - 1, 5);
  }
});

it('averages subpixel texture instead of selecting a single sample', () => {
  const data = new Uint8ClampedArray(1024 * 512 * 4);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 1024; x++) data.set([x % 2 ? 255 : 0, 0, 0, 255], (y * 1024 + x) * 4);
  const result = hivisionInput({ width: 1024, height: 512, data });
  expect(result.data[0]).toBeCloseTo(128 / 127.5 - 1);
  expect(result.data[511]).toBeCloseTo(128 / 127.5 - 1);
});
