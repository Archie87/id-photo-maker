import { expect, it } from 'vitest';
import { defringeRgba } from '../../packages/photo-engine/src/defringe';
function sample(core = [40, 35, 30], rim = [190, 185, 180]) {
  const width = 20,
    height = 12,
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 4; x < width; x++)
      data.set([...(x === 4 ? rim : core), x === 4 ? 160 : 255], (y * width + x) * 4);
  return { width, height, data };
}
it('removes a coherent light fringe without eroding hair alpha or editing the opaque interior', () => {
  const image = sample(),
    original = new Uint8ClampedArray(image.data),
    output = defringeRgba(image);
  expect(output[4 * 4]).toBeLessThan(60);
  for (let i = 3; i < output.length; i += 4) expect(output[i]).toBe(image.data[i]);
  expect(output.slice(8 * 4, 15 * 4)).toEqual(image.data.slice(8 * 4, 15 * 4));
  expect(image.data).toEqual(original);
});
it('supports zero and intermediate strength without cumulative changes', () => {
  const image = sample(),
    full = defringeRgba(image, 100),
    half = defringeRgba(image, 50);
  expect(defringeRgba(image, 0)).toEqual(image.data);
  expect(half[16]).toBeGreaterThan(full[16]);
  expect(half[16]).toBeLessThan(image.data[16]);
  expect(defringeRgba(image, 100)).toEqual(full);
});
it('preserves white clothing, coloured edges and a fully opaque source', () => {
  const white = sample([245, 245, 245], [255, 255, 255]);
  expect(defringeRgba(white)).toEqual(white.data);
  const coloured = sample([40, 35, 30], [10, 220, 60]);
  expect(defringeRgba(coloured)).toEqual(coloured.data);
  const opaque = sample();
  for (let i = 3; i < opaque.data.length; i += 4) opaque.data[i] = 255;
  expect(defringeRgba(opaque)).toEqual(opaque.data);
  expect(() => defringeRgba({ width: 0, height: 0, data: new Uint8ClampedArray() })).toThrow();
});
