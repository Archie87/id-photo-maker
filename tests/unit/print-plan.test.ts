import { expect, it } from 'vitest';
import { createPrintPlan, sheets, createPrintPdf } from '../../packages/print-engine/src';
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
it('fits four two-inch photos on six-inch paper without reducing size or safety margins', () => {
  for (const calibration of [false, true]) {
    const plan = createPrintPlan(sheets.six, 35, 53, { calibration });
    expect(plan.cells).toHaveLength(4);
    expect(new Set(plan.cells.map((p) => p.x)).size).toBe(2);
    expect(new Set(plan.cells.map((p) => p.y)).size).toBe(2);
    for (const [i, p] of plan.cells.entries()) {
      expect(p).toMatchObject({ width: 53, height: 35, rotated: true });
      expect(p.x).toBeGreaterThanOrEqual(calibration ? 14 : 6);
      expect(p.y).toBeGreaterThanOrEqual(6);
      expect(p.x + p.width).toBeLessThanOrEqual(sheets.six.widthMm - 6);
      expect(p.y + p.height).toBeLessThanOrEqual(sheets.six.heightMm - (calibration ? 18 : 6));
      for (const q of plan.cells.slice(i + 1))
        expect(
          p.x + p.width + 2 <= q.x ||
            q.x + q.width + 2 <= p.x ||
            p.y + p.height + 2 <= q.y ||
            q.y + q.height + 2 <= p.y,
        ).toBe(true);
    }
  }
});
it('places four unscaled clockwise photos in the PDF using the same physical plan', async () => {
  const pixel = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const pdf = await PDFDocument.load(
    await createPrintPdf(pixel, 35, 53, sheets.six, { cropMarks: false }),
  );
  const page = pdf.getPage(0),
    contents = page.node.Contents() as PDFArray;
  expect(page.getWidth()).toBeCloseTo(432);
  expect(page.getHeight()).toBeCloseTo(288);
  let text = '';
  for (let i = 0; i < contents.size(); i++)
    text += new TextDecoder().decode(
      decodePDFRawStream(pdf.context.lookup(contents.get(i)) as PDFRawStream).decode(),
    );
  const draws = text.split('q\n').filter((part) => part.includes(' Do'));
  const cells = createPrintPlan(sheets.six, 35, 53).cells;
  expect(draws).toHaveLength(4);
  for (const [i, draw] of draws.entries()) {
    const matrices = [
      ...draw.matchAll(
        /([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) cm/g,
      ),
    ].map((m) => m.slice(1).map(Number));
    expect(matrices[0][4]).toBeCloseTo((cells[i].x * 72) / 25.4);
    expect(matrices[0][5]).toBeCloseTo(((101.6 - cells[i].y) * 72) / 25.4);
    expect(matrices[1][0]).toBeCloseTo(0);
    expect(matrices[1][1]).toBe(-1);
    expect(matrices[1][2]).toBe(1);
    expect(matrices[1][3]).toBeCloseTo(0);
    expect(matrices[2][0]).toBeCloseTo((35 * 72) / 25.4);
    expect(matrices[2][3]).toBeCloseTo((53 * 72) / 25.4);
  }
});
it('reserves printable ruler space and keeps all marks off the photos', () => {
  for (const sheet of Object.values(sheets)) {
    const plan = createPrintPlan(sheet, 25, 35, { calibration: true });
    for (const p of plan.cells) {
      expect(p.width).toBe(p.rotated ? 35 : 25);
      expect(p.height).toBe(p.rotated ? 25 : 35);
      expect(p.x).toBeGreaterThanOrEqual(13);
      expect(p.y + p.height).toBeLessThanOrEqual(sheet.heightMm - 17 + 0.001);
    }
    for (const l of plan.lines) {
      for (const [x, y] of [
        [l.x1, l.y1],
        [l.x2, l.y2],
      ]) {
        expect(x).toBeGreaterThanOrEqual(5);
        expect(x).toBeLessThanOrEqual(sheet.widthMm - 5);
        expect(y).toBeGreaterThanOrEqual(4);
        expect(y).toBeLessThanOrEqual(sheet.heightMm - 5 + 0.001);
      }
    }
    const rulers = plan.lines.filter(
      (l) => l.kind === 'ruler' && Math.hypot(l.x2 - l.x1, l.y2 - l.y1) > 10,
    );
    expect(rulers).toHaveLength(2);
    for (const r of rulers) expect(Math.hypot(r.x2 - r.x1, r.y2 - r.y1)).toBe(50);
  }
});
it('crop toggle removes only crop marks, leaving rulers and mm sizes intact', () => {
  const marked = createPrintPlan(sheets.six, 25, 35, { calibration: true });
  const bare = createPrintPlan(sheets.six, 25, 35, { calibration: true, cropMarks: false });
  expect(bare.cells).toEqual(marked.cells);
  expect(bare.lines).toEqual(marked.lines.filter((l) => l.kind === 'ruler'));
  expect(createPrintPlan(sheets.six, 25, 35, { cropMarks: false }).lines).toHaveLength(0);
  expect(() => createPrintPlan(sheets.six, 140, 90, { calibration: true })).toThrow();
});
it('encodes 50 mm axes in PDF content streams and preserves the physical page size', async () => {
  const pixel = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const pdf = await PDFDocument.load(
    await createPrintPdf(pixel, 25, 35, sheets.six, { calibration: true, cropMarks: false }),
  );
  const page = pdf.getPage(0);
  expect(page.getWidth()).toBeCloseTo(432);
  expect(page.getHeight()).toBeCloseTo(288);
  const contents = page.node.Contents() as PDFArray;
  let text = '';
  for (let i = 0; i < contents.size(); i++) {
    const stream = pdf.context.lookup(contents.get(i)) as PDFRawStream;
    text += new TextDecoder().decode(decodePDFRawStream(stream).decode());
  }
  const segments = [...text.matchAll(/([\d.]+) ([\d.]+) m\s+([\d.]+) ([\d.]+) l/g)]
    .map((m) => Math.hypot(Number(m[3]) - Number(m[1]), Number(m[4]) - Number(m[2])))
    .filter((n) => n > 100);
  expect(segments).toHaveLength(2);
  for (const n of segments) expect(n).toBeCloseTo((50 / 25.4) * 72);
});
