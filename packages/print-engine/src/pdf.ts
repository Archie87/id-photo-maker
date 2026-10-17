import { PDFDocument, rgb, degrees } from 'pdf-lib';
import type { Sheet } from './layout';
import { createPrintPlan, type PrintOptions } from './plan';
const pt = (mm: number) => (mm * 72) / 25.4;
export async function createPrintPdf(
  png: Uint8Array,
  widthMm: number,
  heightMm: number,
  sheet: Sheet,
  options: PrintOptions = {},
): Promise<Uint8Array> {
  const plan = createPrintPlan(sheet, widthMm, heightMm, options);
  const doc = await PDFDocument.create();
  doc.setTitle('ID Photo Maker · Print sheet');
  doc.setCreator('ID Photo Maker');
  const page = doc.addPage([pt(sheet.widthMm), pt(sheet.heightMm)]),
    photo = await doc.embedPng(png);
  for (const p of plan.cells)
    page.drawImage(photo, {
      x: pt(p.x),
      y: pt(sheet.heightMm - p.y - (p.rotated ? 0 : p.height)),
      width: pt(p.rotated ? p.height : p.width),
      height: pt(p.rotated ? p.width : p.height),
      rotate: degrees(p.rotated ? -90 : 0),
    });
  for (const line of plan.lines)
    page.drawLine({
      start: { x: pt(line.x1), y: pt(sheet.heightMm - line.y1) },
      end: { x: pt(line.x2), y: pt(sheet.heightMm - line.y2) },
      thickness: pt(0.09),
      color: line.kind === 'crop' ? rgb(0.6, 0.6, 0.6) : rgb(0.15, 0.15, 0.15),
    });
  for (const label of plan.labels)
    page.drawText(label.text, {
      x: pt(label.x),
      y: pt(sheet.heightMm - label.y),
      size: pt(1.7),
      color: rgb(0.15, 0.15, 0.15),
    });
  return doc.save();
}
