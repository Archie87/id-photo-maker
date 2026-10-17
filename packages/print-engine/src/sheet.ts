import { mmToPx } from '@id-photo/spec-engine';
import type { Sheet } from './layout';
import { createPrintPlan, type PrintOptions } from './plan';
export function renderSheet(
  photo: HTMLCanvasElement,
  widthMm: number,
  heightMm: number,
  sheet: Sheet,
  dpi = 300,
  options: PrintOptions = {},
): HTMLCanvasElement {
  const plan = createPrintPlan(sheet, widthMm, heightMm, options);
  const c = document.createElement('canvas');
  c.width = mmToPx(sheet.widthMm, dpi);
  c.height = mmToPx(sheet.heightMm, dpi);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  const px = (n: number) => (n * dpi) / 25.4;
  for (const p of plan.cells) {
    ctx.save();
    if (p.rotated) {
      ctx.translate(px(p.x + p.width), px(p.y));
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(photo, 0, 0, px(p.height), px(p.width));
    } else ctx.drawImage(photo, px(p.x), px(p.y), px(p.width), px(p.height));
    ctx.restore();
  }
  ctx.lineWidth = px(0.09);
  for (const l of plan.lines) {
    ctx.strokeStyle = l.kind === 'crop' ? '#999' : '#262626';
    ctx.beginPath();
    ctx.moveTo(px(l.x1), px(l.y1));
    ctx.lineTo(px(l.x2), px(l.y2));
    ctx.stroke();
  }
  ctx.fillStyle = '#262626';
  ctx.font = `${px(1.7)}px sans-serif`;
  for (const label of plan.labels) ctx.fillText(label.text, px(label.x), px(label.y));
  return c;
}
