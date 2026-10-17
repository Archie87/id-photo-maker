import { describe, it, expect } from 'vitest';
import {
  mmToPx,
  fitPortrait,
  transformPoint,
  customSpec,
  validatePhoto,
} from '../../packages/spec-engine/src';
const points = {
  crown: { x: 100, y: 20 },
  chin: { x: 100, y: 220 },
  leftEye: { x: 65, y: 110 },
  rightEye: { x: 135, y: 110 },
  estimatedCrown: true,
};
describe('physical dimensions and composition', () => {
  it('uses nearest integer pixels without changing physical print dimensions', () => {
    expect(mmToPx(25)).toBe(295);
    expect(mmToPx(35)).toBe(413);
    expect(mmToPx(152.4)).toBe(1800);
    expect(() => mmToPx(NaN)).toThrow();
  });
  it('places eyes at requested height and matches head ratio', () => {
    const t = fitPortrait(points, 295, 413);
    const l = transformPoint(points.leftEye, t),
      r = transformPoint(points.rightEye, t);
    expect((l.x + r.x) / 2).toBeCloseTo(147.5);
    expect(l.y / 413).toBeCloseTo(0.44);
    expect(
      (transformPoint(points.chin, t).y - transformPoint(points.crown, t).y) / 413,
    ).toBeCloseTo(0.59);
  });
  it('levels tilted eyes', () => {
    const p = { ...points, rightEye: { x: 135, y: 130 } };
    const t = fitPortrait(p, 295, 413);
    expect(transformPoint(p.leftEye, t).y).toBeCloseTo(transformPoint(p.rightEye, t).y);
  });
  it('rejects degenerate landmarks and oversized custom specs', () => {
    expect(() => fitPortrait({ ...points, chin: points.crown }, 295, 413)).toThrow();
    expect(() => customSpec(0, 35)).toThrow();
    expect(() => customSpec(25, 101)).toThrow();
  });
  it('does not claim compliance without detection or verified sources', () => {
    const checks = validatePhoto(customSpec(25, 35), 295, 413);
    expect(checks.find((c) => c.id === 'source')?.status).toBe('warning');
    expect(checks.find((c) => c.id === 'face')?.status).toBe('warning');
  });
});
