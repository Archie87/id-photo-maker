import { it, expect } from 'vitest';
import { headShoulderRegion, cropRgba } from '../../packages/ai-engine/src/region';
import {
  initialLandmarks,
  landmarkError,
  fitPortrait,
  transformPoint,
} from '../../packages/spec-engine/src';
it('keeps portrait region within source boundaries while preserving original landmarks', () => {
  const points = {
    ...initialLandmarks(2000, 3000),
    crown: { x: 900, y: 200 },
    chin: { x: 900, y: 700 },
    leftEye: { x: 800, y: 400 },
    rightEye: { x: 1000, y: 400 },
  };
  const before = structuredClone(points),
    r = headShoulderRegion(points, 2000, 3000);
  expect(r).toEqual({ x: 175, y: 0, width: 1450, height: 1500 });
  expect(points).toEqual(before);
  const edge = headShoulderRegion(
    { ...points, leftEye: { x: 0, y: 400 }, rightEye: { x: 100, y: 400 } },
    2000,
    3000,
  );
  expect(edge.x).toBe(0);
  expect(edge.x + edge.width).toBeLessThanOrEqual(2000);
});
it('copies exactly the ROI rows without shifting or changing source pixels', () => {
  const original = Uint8ClampedArray.from({ length: 4 * 3 * 4 }, (_, i) => i),
    snapshot = new Uint8ClampedArray(original);
  const cropped = cropRgba(original, 4, 3, { x: 1, y: 1, width: 2, height: 2 });
  expect([...cropped]).toEqual([...original.slice(20, 28), ...original.slice(36, 44)]);
  expect(original).toEqual(snapshot);
  expect(() => cropRgba(original, 4, 3, { x: 3, y: 0, width: 2, height: 2 })).toThrow();
});
it('manual correction rejects invalid point order and preserves valid eye alignment', () => {
  const p = initialLandmarks(600, 800);
  expect(landmarkError(p, 600, 800)).toBeNull();
  expect(landmarkError({ ...p, crown: { x: 300, y: 700 } }, 600, 800)).toContain('顺序');
  expect(landmarkError({ ...p, leftEye: p.rightEye }, 600, 800)).toContain('两眼');
  expect(landmarkError({ ...p, chin: { x: 600, y: 400 } }, 600, 800)).toContain('范围');
  const corrected = { ...p, crown: { x: 300, y: 60 }, estimatedCrown: false },
    t = fitPortrait(corrected, 295, 413);
  expect(transformPoint(corrected.leftEye, t).y / 413).toBeCloseTo(0.44);
  expect(
    (transformPoint(corrected.chin, t).y - transformPoint(corrected.crown, t).y) / 413,
  ).toBeCloseTo(0.59);
});
