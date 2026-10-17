export async function normalizeImage(file: File): Promise<HTMLCanvasElement> {
  if (file.size > 30 * 1024 * 1024) throw new Error('图片超过 30 MB，请先缩小图片');
  if (
    !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) &&
    !/\.(jpe?g|png|webp|hei[cf])$/i.test(file.name)
  )
    throw new Error('请选择 JPG、PNG、WebP 或 HEIC 图片');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('浏览器无法解码此图片。HEIC 请先转为 JPG 或在支持 HEIC 的浏览器中打开。');
  }
  try {
    if (bitmap.width * bitmap.height > 60_000_000)
      throw new Error('图片超过 6000 万像素，请缩小后重试');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}
