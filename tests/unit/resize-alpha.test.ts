import { expect, it } from 'vitest';
import { resizeAlphaArea } from '../../packages/photo-engine/src/resize-alpha';
import { refinePortraitEdges } from '../../packages/photo-engine/src/refine-edges';
it('keeps opaque boundaries while accounting for fractional pixel coverage', () => {
  const mask = new Float32Array([0, 1]);
  expect([...resizeAlphaArea(mask, 2, 1, 4, 1)]).toEqual([0, 0, 1, 1]);
  expect([...resizeAlphaArea(mask, 2, 1, 3, 1)]).toEqual([0, 0.5, 1]);
  expect([...resizeAlphaArea(mask, 2, 1, 1, 1)]).toEqual([0.5]);
  expect([...mask]).toEqual([0, 1]);
});
it('preserves soft hair alpha and agrees between raw and colour-refined paths', () => {
  const mask = new Float32Array([0, 0.25, 1, 0, 0.75, 1]);
  const expected = resizeAlphaArea(mask, 3, 2, 8, 5);
  const data = new Uint8ClampedArray(8 * 5 * 4).fill(255);
  const clean = refinePortraitEdges({ width: 8, height: 5, data }, mask, 3, 2, {
    preserveAlpha: true,
    interpolation: 'area',
  });
  for (let i = 0; i < expected.length; i++)
    expect(clean[i * 4 + 3]).toBe(Math.round(expected[i] * 255));
  expect(expected[3]).toBeCloseTo(0.25);
  expect(expected[4 * 8 + 3]).toBeCloseTo(0.75);
});
it('rejects invalid dimensions and non-finite masks', () => {
  expect(() => resizeAlphaArea(new Float32Array([NaN]), 1, 1, 2, 2)).toThrow();
  expect(() => resizeAlphaArea(new Float32Array([1]), 2, 1, 2, 2)).toThrow();
  expect(() => resizeAlphaArea(new Float32Array([1]), 1, 1, 0, 2)).toThrow();
});
