import { expect, it } from 'vitest';
import { looseHairKeepMask } from '../../packages/photo-engine/src/loose-hair';
const width = 100,
  height = 100;
const points = {
  leftEye: { x: 35, y: 30 },
  rightEye: { x: 65, y: 30 },
  crown: { x: 50, y: 10 },
  chin: { x: 50, y: 70 },
  estimatedCrown: false,
};
const masks = () =>
  Array.from({ length: 6 }, (_, i) => new Float32Array(width * height).fill(i === 1 ? 1 : 0));
it('limits removal to lower side hair and leaves head, neck corridor, and lower body intact', () => {
  const channels = masks();
  const keep = looseHairKeepMask(channels, width, height, width, height, points);
  expect(keep[55 * width + 20]).toBe(0);
  expect(keep[55 * width + 80]).toBe(0);
  expect(keep[20 * width + 20]).toBe(1);
  expect(keep[55 * width + 50]).toBe(1);
  expect(keep[90 * width + 20]).toBe(1);
  expect(keep[46 * width + 20]).toBeGreaterThan(0);
  expect(keep[46 * width + 20]).toBeLessThan(1);
  expect(channels[1][55 * width + 20]).toBe(1);
});
it('protects skin, clothing, accessories and their uncertain borders', () => {
  for (const category of [2, 3, 4, 5]) {
    const channels = masks();
    channels[category][55 * width + 20] = 0.25;
    const keep = looseHairKeepMask(channels, width, height, width, height, points);
    expect(keep[55 * width + 20]).toBe(1);
    expect(keep[55 * width + 21]).toBe(1);
    expect(keep[55 * width + 24]).toBe(0);
  }
});
it('leaves uncertain categories alone and rejects invalid masks or face geometry', () => {
  const channels = masks();
  channels[1].fill(0.4);
  expect(
    looseHairKeepMask(channels, width, height, width, height, points).every((a) => a === 1),
  ).toBe(true);
  expect(() =>
    looseHairKeepMask(channels.slice(0, 5), width, height, width, height, points),
  ).toThrow();
  channels[0][0] = NaN;
  expect(() => looseHairKeepMask(channels, width, height, width, height, points)).toThrow();
  expect(() =>
    looseHairKeepMask(masks(), width, height, width, height, {
      ...points,
      rightEye: points.leftEye,
    }),
  ).toThrow();
});

it('uses source colours to remove dark hair inside an uncertain semantic protection band', () => {
  const channels = masks();
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const skin = x >= 28 ? 0.97 : x >= 23 ? 0.4 : 0.03;
      channels[1][i] = 1 - skin;
      channels[3][i] = skin;
      data.set(x >= 25 ? [190, 145, 120, 255] : [45, 35, 30, 255], i * 4);
    }
  const original = looseHairKeepMask(channels, width, height, width, height, points);
  const fixed = looseHairKeepMask(channels, width, height, width, height, points, {
    data,
    width,
    height,
  });
  expect(original[55 * width + 24]).toBe(1);
  expect(fixed[55 * width + 24]).toBeLessThan(0.05);
  expect(fixed[55 * width + 25]).toBeGreaterThan(0.95);
  expect(fixed[55 * width + 30]).toBe(1);
  expect(fixed[20 * width + 24]).toBe(1);
  expect(data[55 * width * 4 + 24 * 4]).toBe(45);
  expect(channels[3][55 * width + 24]).toBeCloseTo(0.4);
  // Similar foreground/hair colours provide no evidence to override semantics.
  for (let i = 0; i < width * height; i++) data.set([70, 65, 60, 255], i * 4);
  expect(
    looseHairKeepMask(channels, width, height, width, height, points, { data, width, height }),
  ).toEqual(original);
  expect(() =>
    looseHairKeepMask(channels, width, height, width, height, points, {
      data: new Uint8ClampedArray(1),
      width,
      height,
    }),
  ).toThrow();
});

it('cleans uncertain grey residue outside the jaw but protects skin, clothes and inner folds', () => {
  const channels = masks();
  // A broad core with a narrow uncertain grey spur; identical colours give no
  // basis for the earlier colour refinement to distinguish them.
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      data.set([120, 110, 100, 255], i * 4);
      if (x >= 20) {
        channels[1][i] = 0.12;
        channels[3][i] = 0.48;
      }
    }
  const outline = [
    { start: { x: 32, y: 50 }, end: { x: 45, y: 70 } },
    { start: { x: 68, y: 50 }, end: { x: 55, y: 70 } },
  ];
  const guide = { data, width, height };
  const before = looseHairKeepMask(channels, width, height, width, height, points, guide);
  const after = looseHairKeepMask(channels, width, height, width, height, points, guide, outline);
  expect(before[65 * width + 19]).toBe(1);
  expect(after[65 * width + 19]).toBeLessThan(0.1);
  expect(after[65 * width + 30]).toBe(1); // interior fold, far from removed background
  expect(after[40 * width + 20]).toBe(1); // upper head/ear region
  expect(after[75 * width + 50]).toBe(1); // central neck below chin
  for (const category of [2, 3, 4, 5]) {
    const copy = channels.map((c) => new Float32Array(c));
    for (let y = 60; y < 70; y++)
      for (let x = 19; x < 25; x++) copy[category][y * width + x] = 0.96;
    expect(
      looseHairKeepMask(copy, width, height, width, height, points, guide, outline)[
        65 * width + 19
      ],
    ).toBe(1);
  }
  // A dark garment seam with no hair evidence must not become a white slit.
  channels[1][65 * width + 19] = 0.02;
  expect(
    looseHairKeepMask(channels, width, height, width, height, points, guide, outline)[
      65 * width + 19
    ],
  ).toBe(1);
  expect(() =>
    looseHairKeepMask(channels, width, height, width, height, points, guide, [
      { start: { x: NaN, y: 0 }, end: { x: 1, y: 1 } },
    ]),
  ).toThrow();
});
