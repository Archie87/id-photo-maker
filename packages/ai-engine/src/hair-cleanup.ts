import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';
import manifest from '../../../models/manifest.json';
import { workerAsset } from './assets';
let pending: Promise<ImageSegmenter> | undefined;
async function initialize() {
  const model = manifest.models.find((m) => m.file === 'selfie_multiclass_256x256.tflite')!;
  const response = await fetch(workerAsset(`models/${model.file}`));
  if (!response.ok) throw new Error('头发识别模型未安装，请运行 pnpm models:download');
  const bytes = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
  if (hash !== model.sha256) throw new Error('头发识别模型校验失败，请重新下载');
  return ImageSegmenter.createFromOptions(
    await FilesetResolver.forVisionTasks(workerAsset('wasm')),
    {
      baseOptions: { modelAssetBuffer: new Uint8Array(bytes), delegate: 'CPU' },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    },
  );
}
export async function hairClasses(image: ImageData) {
  const segmenter = await (pending ??= initialize().catch((e) => {
    pending = undefined;
    throw e;
  }));
  const scale = Math.min(1, 768 / Math.max(image.width, image.height));
  const canvas = new OffscreenCanvas(
    Math.round(image.width * scale),
    Math.round(image.height * scale),
  );
  const ctx = canvas.getContext('2d')!;
  const bitmap = await createImageBitmap(image);
  try {
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
  const result = segmenter.segment(canvas);
  try {
    const masks = result.confidenceMasks;
    if (!masks || masks.length !== 6) throw new Error('头发识别未返回预期分类');
    return {
      channels: masks.map((m) => new Float32Array(m.getAsFloat32Array())),
      width: masks[0].width,
      height: masks[0].height,
      guide: ctx.getImageData(0, 0, canvas.width, canvas.height),
    };
  } finally {
    result.close();
    canvas.width = canvas.height = 1;
  }
}
