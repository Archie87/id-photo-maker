import { calculateLayout, type Sheet } from './layout';
export interface PrintOptions {
  cropMarks?: boolean;
  calibration?: boolean;
}
export interface PrintLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'crop' | 'ruler';
}
/** One millimetre-based plan is shared by preview, JPEG and PDF. */
export function createPrintPlan(
  sheet: Sheet,
  widthMm: number,
  heightMm: number,
  options: PrintOptions = {},
) {
  const reserveLeft = options.calibration ? 8 : 0;
  const usable = {
    ...sheet,
    widthMm: sheet.widthMm - reserveLeft,
    heightMm: sheet.heightMm - (options.calibration ? 12 : 0),
  };
  const cells = calculateLayout(usable, widthMm, heightMm, 6).map((cell) => ({
    ...cell,
    x: cell.x + reserveLeft,
  }));
  if (!cells.length) throw new Error('当前纸张和标尺留白无法容纳照片，请换纸张或关闭标尺');
  const lines: PrintLine[] = [];
  if (options.cropMarks !== false)
    for (const p of cells) {
      for (const [x, y, sx, sy] of [
        [p.x, p.y, -1, -1],
        [p.x + p.width, p.y, 1, -1],
        [p.x, p.y + p.height, -1, 1],
        [p.x + p.width, p.y + p.height, 1, 1],
      ]) {
        lines.push(
          { x1: x + sx * 0.25, y1: y, x2: x + sx * 0.8, y2: y, kind: 'crop' },
          { x1: x, y1: y + sy * 0.25, x2: x, y2: y + sy * 0.8, kind: 'crop' },
        );
      }
    }
  const labels: { x: number; y: number; text: string }[] = [];
  if (options.calibration) {
    if (sheet.widthMm < 70 || sheet.heightMm < 70)
      throw new Error('纸张太小，无法放置 50 mm 校准标尺');
    const x = 13,
      y = sheet.heightMm - 5;
    lines.push(
      { x1: x, y1: y, x2: x + 50, y2: y, kind: 'ruler' },
      { x1: 6, y1: 10, x2: 6, y2: 60, kind: 'ruler' },
    );
    for (let i = 0; i <= 50; i++) {
      const length = i % 10 === 0 ? 2 : i % 5 === 0 ? 1.5 : 0.8;
      lines.push(
        { x1: x + i, y1: y, x2: x + i, y2: y - length, kind: 'ruler' },
        { x1: 6, y1: 10 + i, x2: 6 + length, y2: 10 + i, kind: 'ruler' },
      );
    }
    labels.push({
      x,
      y: sheet.heightMm - 9,
      text: '50 mm (horizontal + vertical) | Print at 100%',
    });
  }
  return { cells, lines, labels };
}
