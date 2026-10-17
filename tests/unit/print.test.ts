import { it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { calculateLayout, sheets, createPrintPdf } from '../../packages/print-engine/src';
it('keeps all photos within usable paper and preserves mm dimensions', () => {
  for (const sheet of Object.values(sheets)) {
    const cells = calculateLayout(sheet, 25, 35);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(5);
      expect(c.y).toBeGreaterThanOrEqual(5);
      expect(c.x + c.width).toBeLessThanOrEqual(sheet.widthMm - 5 + 0.001);
      expect(c.y + c.height).toBeLessThanOrEqual(sheet.heightMm - 5 + 0.001);
      expect(c.width).toBe(c.rotated ? 35 : 25);
      expect(c.height).toBe(c.rotated ? 25 : 35);
    }
  }
});
it('returns no cells for a photo that cannot fit and rejects negative gaps', () => {
  expect(calculateLayout(sheets.six, 200, 200)).toHaveLength(0);
  expect(() => calculateLayout(sheets.a4, 25, 35, 5, -1)).toThrow();
});
it('keeps upright placement on ties and rotates when only the turned photo fits', () => {
  const tie = calculateLayout({ name: 'square', widthMm: 100, heightMm: 100 }, 25, 35);
  expect(tie.every((cell) => !cell.rotated)).toBe(true);
  const turned = calculateLayout({ name: 'narrow', widthMm: 60, heightMm: 40 }, 25, 45);
  expect(turned).toHaveLength(1);
  expect(turned[0]).toMatchObject({ width: 45, height: 25, rotated: true });
});
it('writes a one-page PDF with exact A4 MediaBox', async () => {
  const pixel = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const bytes = await createPrintPdf(pixel, 25, 35, sheets.a4);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getPage(0).getWidth()).toBeCloseTo((210 / 25.4) * 72);
  expect(pdf.getPage(0).getHeight()).toBeCloseTo((297 / 25.4) * 72);
});
