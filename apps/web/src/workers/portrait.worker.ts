import { FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { WorkerRequest, WorkerResponse, PortraitResult } from '@id-photo/ai-engine';
import { headShoulderRegion, cropRgba, workerAsset } from '@id-photo/ai-engine';
import type { Point } from '@id-photo/spec-engine';
import { refinePortraitEdges, looseHairKeepMask } from '@id-photo/photo-engine';
import { hivisionMatte } from '@id-photo/ai-engine/hivision';
import { hairClasses } from '@id-photo/ai-engine/hair-cleanup';
let face: FaceLandmarker, segmenter: ImageSegmenter;
let ready: Promise<void> | undefined;
async function initialize() {
  const files = await FilesetResolver.forVisionTasks(workerAsset('wasm'));
  face = await FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: workerAsset('models/face_landmarker.task'), delegate: 'CPU' },
    runningMode: 'IMAGE',
    numFaces: 2,
  });
}
// Serialize requests: MediaPipe task instances must not be used concurrently.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  queue = queue.then(async () => {
    const { id, image, options } = event.data;
    try {
      await (ready ??= initialize().catch((error) => {
        ready = undefined;
        throw error;
      }));
      const faces = face.detect(image).faceLandmarks;
      if (faces.length !== 1)
        throw new Error(
          faces.length
            ? '检测到多个人脸，请使用单人照片'
            : '未找到清晰人脸，请使用正面头肩照或手动调整',
        );
      const f = faces[0],
        point = (i: number): Point => ({ x: f[i].x * image.width, y: f[i].y * image.height });
      const eyes = [point(33), point(263)].sort((a, b) => a.x - b.x),
        chin = point(152),
        forehead = point(10);
      // Face landmarks omit the hair crown. Extrapolation is explicitly marked approximate.
      const crown = {
        x: forehead.x + (forehead.x - chin.x) * 0.25,
        y: forehead.y + (forehead.y - chin.y) * 0.25,
      };
      const points = { crown, chin, leftEye: eyes[0], rightEye: eyes[1], estimatedCrown: true };
      if (options?.matting === 'hair-cleanup') {
        const semantic = await hairClasses(image);
        const alpha = looseHairKeepMask(
          semantic.channels,
          semantic.width,
          semantic.height,
          image.width,
          image.height,
          points,
          semantic.guide,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL.map(({ start, end }) => ({
            start: point(start),
            end: point(end),
          })),
        );
        const result: PortraitResult = {
          points,
          alpha,
          maskWidth: semantic.guide.width,
          maskHeight: semantic.guide.height,
          faceCount: 1,
        };
        self.postMessage({ id, result } satisfies WorkerResponse, { transfer: [alpha.buffer] });
        return;
      }
      const maskRegion =
        options?.cropToHeadShoulders === false
          ? { x: 0, y: 0, width: image.width, height: image.height }
          : headShoulderRegion(points, image.width, image.height);
      const cropped = new ImageData(
        cropRgba(image.data, image.width, image.height, maskRegion),
        maskRegion.width,
        maskRegion.height,
      );
      let result: PortraitResult;
      if (options?.matting === 'hivision') {
        result = {
          points,
          maskRegion,
          faceCount: faces.length,
          ...(await hivisionMatte(cropped)),
          alphaInterpolation: 'area',
        };
      } else {
        segmenter ??= await ImageSegmenter.createFromOptions(
          await FilesetResolver.forVisionTasks(workerAsset('wasm')),
          {
            baseOptions: {
              modelAssetPath: workerAsset('models/selfie_segmenter.tflite'),
              delegate: 'CPU',
            },
            runningMode: 'IMAGE',
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          },
        );
        const masks = segmenter.segment(cropped);
        try {
          const mask = masks.confidenceMasks?.[0];
          if (!mask) throw new Error('未返回人像蒙版');
          const channels = masks.confidenceMasks!;
          // SelfieSegmenter can expose a single person probability or two category channels.
          const person = channels.length > 1 ? channels[1] : channels[0];
          result = {
            points,
            maskRegion,
            alpha: new Float32Array(person.getAsFloat32Array()),
            maskWidth: person.width,
            maskHeight: person.height,
            faceCount: faces.length,
          };
        } finally {
          masks.close();
        }
      }
      result.foreground = refinePortraitEdges(
        cropped,
        result.alpha,
        result.maskWidth,
        result.maskHeight,
        {
          preserveAlpha: options?.matting === 'hivision',
          interpolation: result.alphaInterpolation,
        },
      );
      self.postMessage({ id, result } satisfies WorkerResponse, {
        transfer: [result.alpha.buffer, result.foreground.buffer],
      });
    } catch (error) {
      self.postMessage({
        id,
        error:
          error instanceof Error ? error.message : '本地模型加载失败，请运行 pnpm models:download',
      } satisfies WorkerResponse);
    }
  });
};
