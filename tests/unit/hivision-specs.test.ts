import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { photoSpecs, outputSize, customSpec, validatePhoto } from '../../packages/spec-engine/src';

it('matches the pinned Hivision width/height values at 300 DPI and keeps print sizes explicit', () => {
  for (const [id, mm, px] of [
    ['one-inch', [25, 35], [295, 413]],
    ['two-inch', [35, 53], [413, 626]],
    ['small-one-inch', [22, 32], [260, 378]],
    ['small-two-inch', [35, 45], [413, 531]],
  ] as const) {
    const spec = photoSpecs.find((s) => s.id === id)!;
    expect([spec.widthMm, spec.heightMm]).toEqual(mm);
    expect(outputSize(spec)).toEqual({ width: px[0], height: px[1] });
    expect(spec.dpi).toBe(300);
    expect(spec.pixelSize).toBeUndefined(); // must remain printable, not electronic-only
    expect(spec.source).toContain(
      '5c191e2577f14755a69d9df6db415fab23aca484/demo/assets/size_list_CN.csv',
    );
    expect(spec.background).toEqual(['#ffffff', '#628bce', '#d74532']);
    expect(validatePhoto(spec, px[0], px[1]).find((c) => c.id === 'source')?.status).toBe(
      'warning',
    );
  }
});
it('covers every row of the pinned Chinese catalogue once without losing same-size names', () => {
  const rows = readFileSync('data/hivision-size-list.csv', 'utf8')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','));
  expect(rows).toHaveLength(18);
  expect(photoSpecs).toHaveLength(19);
  expect(new Set(photoSpecs.map((s) => s.id)).size).toBe(19);
  for (const [name, height, width] of rows) {
    const matches = photoSpecs.filter((s) => s.name === name);
    expect(matches).toHaveLength(1);
    const spec = matches[0];
    expect(outputSize(spec)).toEqual({ width: Number(width), height: Number(height) });
    expect(spec.dpi).toBe(300);
    expect(spec.status).toBe('preset');
    expect(spec.source).toContain('5c191e2577f14755a69d9df6db415fab23aca484');
    expect(spec.lastVerified).toBe('2026-10-02');
    expect(spec.file.minKb).toBeNull();
    expect(spec.file.maxKb).toBeNull();
    expect(spec.restrictBackground).not.toBe(true);
    if (spec.pixelSize)
      expect(outputSize({ ...spec, widthMm: 99, heightMm: 99 })).toEqual(spec.pixelSize);
  }
  expect(photoSpecs.find((s) => s.id === 'five-inch')?.pixelSize).toEqual({
    width: 1050,
    height: 1499,
  });
});
it('does not misattribute custom dimensions to Hivision or replace the separate resident-ID preset', () => {
  const custom = customSpec(35, 49);
  expect(outputSize(custom)).toEqual({ width: 413, height: 579 });
  expect(custom.source).toBeNull();
  expect(custom.lastVerified).toBeNull();
  expect(custom.verificationNote).not.toContain('Hivision');
  const electronic = photoSpecs.find((s) => s.id === 'cn-resident-id-electronic')!;
  expect(electronic.source).toContain('ncga.nc.gov.cn');
  expect(electronic.dpi).toBe(350);
  expect(outputSize(electronic)).toEqual({ width: 358, height: 441 });
});
