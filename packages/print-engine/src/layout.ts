export interface Sheet {
  name: string;
  widthMm: number;
  heightMm: number;
}
export const sheets: Record<string, Sheet> = {
  six: { name: '6 寸相纸', widthMm: 152.4, heightMm: 101.6 },
  a4: { name: 'A4', widthMm: 210, heightMm: 297 },
};
export function calculateLayout(
  sheet: Sheet,
  widthMm: number,
  heightMm: number,
  margin = 5,
  gap = 2,
) {
  if (
    ![sheet.widthMm, sheet.heightMm, widthMm, heightMm, margin, gap].every(Number.isFinite) ||
    Math.min(sheet.widthMm, sheet.heightMm, widthMm, heightMm) <= 0 ||
    margin < 0 ||
    gap < 0
  )
    throw new Error('排版尺寸无效');
  const grid = (width: number, height: number) => ({
    columns: Math.max(0, Math.floor((sheet.widthMm - 2 * margin + gap) / (width + gap))),
    rows: Math.max(0, Math.floor((sheet.heightMm - 2 * margin + gap) / (height + gap))),
  });
  const upright = grid(widthMm, heightMm),
    turned = grid(heightMm, widthMm);
  // Keep the source orientation when counts tie. Rotation never rescales the photo.
  const rotated = turned.columns * turned.rows > upright.columns * upright.rows;
  const { columns, rows } = rotated ? turned : upright;
  const width = rotated ? heightMm : widthMm,
    height = rotated ? widthMm : heightMm;
  const x0 = (sheet.widthMm - columns * width - Math.max(0, columns - 1) * gap) / 2,
    y0 = (sheet.heightMm - rows * height - Math.max(0, rows - 1) * gap) / 2;
  return Array.from({ length: columns * rows }, (_, i) => ({
    x: x0 + (i % columns) * (width + gap),
    y: y0 + Math.floor(i / columns) * (height + gap),
    width,
    height,
    rotated,
  }));
}
