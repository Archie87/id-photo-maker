import { setJpegDpi, setPngDpi } from './dpi';
async function encode(
  canvas: HTMLCanvasElement,
  format: 'jpg' | 'png',
  quality: number,
  dpi: number,
): Promise<Blob> {
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), mime, quality),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const result = format === 'jpg' ? setJpegDpi(bytes, dpi) : setPngDpi(bytes, dpi);
  return new Blob([result.buffer as ArrayBuffer], { type: mime });
}
export async function encodePhoto(
  canvas: HTMLCanvasElement,
  format: 'jpg' | 'png',
  dpi = 300,
  maxKb?: number,
): Promise<Blob> {
  if (maxKb !== undefined && (!Number.isFinite(maxKb) || maxKb <= 0))
    throw new Error('文件大小上限必须大于零');
  let best = await encode(canvas, format, 0.95, dpi);
  if (!maxKb || best.size <= maxKb * 1024) return best;
  if (format === 'png') throw new Error('PNG 无法在保持像素尺寸时保证 KB 上限，请使用 JPG');
  let low = 0.1,
    high = 0.95;
  best = await encode(canvas, format, low, dpi);
  if (best.size > maxKb * 1024)
    throw new Error('在保留当前像素尺寸的前提下无法达到该 KB 上限，请提高上限');
  for (let i = 0; i < 9; i++) {
    const q = (low + high) / 2,
      b = await encode(canvas, format, q, dpi);
    if (b.size <= maxKb * 1024) {
      best = b;
      low = q;
    } else high = q;
  }
  return best;
}
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
