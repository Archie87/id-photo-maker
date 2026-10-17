import { expect, it } from 'vitest';
import { photoSpecs, outputSize, customSpec, validatePhoto } from '../../packages/spec-engine/src';
const electronic = photoSpecs.find((s) => s.id === 'cn-resident-id-electronic')!;
it('keeps submission pixels authoritative even if print metadata changes', () => {
  expect(outputSize(electronic)).toEqual({ width: 358, height: 441 });
  expect(outputSize({ ...electronic, widthMm: 25, heightMm: 35, dpi: 300 })).toEqual({
    width: 358,
    height: 441,
  });
  expect(electronic.dpi).toBe(350);
});
it('preserves ordinary one-inch and custom physical dimensions', () => {
  expect(outputSize(photoSpecs[0])).toEqual({ width: 295, height: 413 });
  expect(outputSize(customSpec(25, 35))).toEqual({ width: 295, height: 413 });
});
it('validates actual pixels while retaining the incomplete-compliance warning', () => {
  expect(validatePhoto(electronic, 358, 441).find((c) => c.id === 'size')?.status).toBe('pass');
  expect(validatePhoto(electronic, 295, 413).find((c) => c.id === 'size')?.status).toBe('fail');
  const source = validatePhoto(electronic, 358, 441).find((c) => c.id === 'source');
  expect(source?.status).toBe('warning');
  expect(source?.message).toContain('未覆盖完整制证要求');
  expect(electronic.source).toMatch(/^https:\/\//);
  expect(electronic.lastVerified).toBe('2026-10-02');
});
it('rejects non-integer digital dimensions', () => {
  expect(() => outputSize({ ...electronic, pixelSize: { width: 358.5, height: 441 } })).toThrow();
});
