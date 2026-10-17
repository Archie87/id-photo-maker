import { expect, it } from 'vitest';
import { refinePortraitEdges } from '../../packages/photo-engine/src/refine-edges';

function fixture(foreground = [40, 50, 70], background = [255, 255, 255]) {
  const width = 13,
    height = 3;
  const truth = [0, 0, 0, 0.1, 0.4, 0.8, 1, 1, 1, 1, 1, 1, 1];
  const estimate = [0, 0, 0, 0.3, 0.55, 0.85, 1, 1, 1, 1, 1, 1, 1];
  const data = new Uint8ClampedArray(width * height * 4),
    mask = new Float32Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = estimate[i % width];
    for (let c = 0; c < 3; c++)
      data[i * 4 + c] = foreground[c] * truth[i % width] + background[c] * (1 - truth[i % width]);
    data[i * 4 + 3] = 255;
  }
  return { image: { data, width, height }, mask, truth };
}

it('removes light-background contamination on red and blue without making soft hairs opaque', () => {
  const { image, mask, truth } = fixture(),
    original = new Uint8ClampedArray(image.data),
    originalMask = new Float32Array(mask);
  const clean = refinePortraitEdges(image, mask, image.width, image.height);
  for (const background of [
    [220, 40, 50],
    [40, 100, 220],
  ]) {
    let before = 0,
      after = 0;
    for (const x of [3, 4, 5])
      for (let c = 0; c < 3; c++) {
        const i = (image.width + x) * 4,
          expected = [40, 50, 70][c] * truth[x] + background[c] * (1 - truth[x]);
        before += Math.abs(
          image.data[i + c] * mask[image.width + x] +
            background[c] * (1 - mask[image.width + x]) -
            expected,
        );
        after += Math.abs(
          (clean[i + c] * clean[i + 3]) / 255 + background[c] * (1 - clean[i + 3] / 255) - expected,
        );
        expect(clean[i + 3] / 255).toBeCloseTo(truth[x], 2);
      }
    expect(after).toBeLessThan(before * 0.1);
  }
  expect(image.data).toEqual(original);
  expect(mask).toEqual(originalMask);
  expect(clean.slice(7 * 4, 10 * 4)).toEqual(original.slice(7 * 4, 10 * 4));
});

it('preserves white clothing when local foreground and background cannot be distinguished', () => {
  const { image, mask } = fixture([248, 249, 250]);
  const clean = refinePortraitEdges(image, mask, image.width, image.height);
  for (let i = 0; i < mask.length; i++) {
    expect([...clean.slice(i * 4, i * 4 + 3)]).toEqual([...image.data.slice(i * 4, i * 4 + 3)]);
    expect(clean[i * 4 + 3]).toBe(Math.round(mask[i] * 255));
  }
});

it('preserves a matting model alpha instead of replacing it with the segmentation heuristic', () => {
  const { image, mask } = fixture();
  const clean = refinePortraitEdges(image, mask, image.width, image.height, {
    preserveAlpha: true,
  });
  for (let i = 0; i < mask.length; i++) expect(clean[i * 4 + 3]).toBe(Math.round(mask[i] * 255));
  expect(clean[4 * 4]).toBeLessThan(image.data[4 * 4]);
});

it('uses an interior colour anchor to remove a falsely opaque white rim', () => {
  const { image, mask } = fixture();
  for (let y = 0; y < image.height; y++) {
    mask[y * image.width + 3] = 1;
    image.data.set([255, 255, 255, 255], (y * image.width + 3) * 4);
  }
  const clean = refinePortraitEdges(image, mask, image.width, image.height);
  expect(clean[(image.width + 3) * 4 + 3]).toBe(0);
  expect([...clean.slice((image.width + 7) * 4, (image.width + 8) * 4)]).toEqual([40, 50, 70, 255]);
});

it('rejects inconsistent colour pairs and respects existing transparency', () => {
  const { image, mask } = fixture();
  const i = (image.width + 4) * 4;
  image.data.set([30, 220, 60, 255], i);
  const j = (image.width + 5) * 4;
  image.data[j + 3] = 128;
  const clean = refinePortraitEdges(image, mask, image.width, image.height);
  expect([...clean.slice(i, i + 3)]).toEqual([30, 220, 60]);
  expect(clean[i + 3]).toBe(Math.round(mask[image.width + 4] * 255));
  expect(clean[j + 3]).toBe(Math.round(mask[image.width + 5] * 128));
});

it('upsamples small masks with soft edges and handles missing anchors without inventing detail', () => {
  const image = { width: 12, height: 2, data: new Uint8ClampedArray(12 * 2 * 4).fill(255) };
  const clean = refinePortraitEdges(image, new Float32Array([0, 1, 1]), 3, 1);
  expect(clean[3]).toBe(0);
  expect(clean[4 * 3 + 3]).toBe(96);
  expect(clean[11 * 4 + 3]).toBe(255);
  expect(refinePortraitEdges(image, new Float32Array([1]), 1, 1)).toEqual(image.data);
  const empty = refinePortraitEdges(image, new Float32Array([0]), 1, 1);
  expect(
    Array.from(empty)
      .filter((_, i) => i % 4 === 3)
      .every((v) => v === 0),
  ).toBe(true);
  expect(() => refinePortraitEdges(image, new Float32Array([NaN]), 1, 1)).toThrow('无效');
  expect(() => refinePortraitEdges(image, new Float32Array([0]), 2, 1)).toThrow('无效');
});
