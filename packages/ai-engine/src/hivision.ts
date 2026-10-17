import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm';
import manifest from '../../../models/manifest.json';
import { hivisionInput } from './hivision-input';
let pending: Promise<InferenceSession> | undefined;
async function initialize() {
  env.wasm.numThreads = 1;
  env.wasm.proxy = false;
  env.wasm.wasmPaths = {
    mjs: new URL('/wasm/ort/ort-wasm-simd-threaded.mjs', self.location.origin).href,
    wasm: new URL('/wasm/ort/ort-wasm-simd-threaded.wasm', self.location.origin).href,
  };
  const model = manifest.models.find((m) => m.file === 'hivision_modnet.onnx')!;
  const response = await fetch(`/models/${model.file}`);
  if (!response.ok) throw new Error('精细抠图模型未安装，请运行 pnpm models:download');
  const bytes = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
  if (hash !== model.sha256) throw new Error('精细抠图模型校验失败，请重新下载');
  return InferenceSession.create(bytes, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
}
export async function hivisionMatte(image: ImageData) {
  let input: Tensor | undefined;
  let outputs: Record<string, Tensor> | undefined;
  try {
    const session = await (pending ??= initialize().catch((error) => {
      pending = undefined;
      throw error;
    }));
    const prepared = hivisionInput(image);
    input = new Tensor('float32', prepared.data, [1, 3, prepared.height, prepared.width]);
    outputs = await session.run({ [session.inputNames[0]]: input });
    const output = outputs[session.outputNames[0]];
    if (
      output.type !== 'float32' ||
      output.dims.length !== 4 ||
      output.dims[2] !== prepared.height ||
      output.dims[3] !== prepared.width
    )
      throw new Error('精细抠图模型返回了不支持的蒙版');
    return {
      alpha: new Float32Array(output.data as Float32Array),
      maskWidth: prepared.width,
      maskHeight: prepared.height,
    };
  } catch (error) {
    throw new Error(
      `精细抠图失败：${error instanceof Error ? error.message : String(error)}。可重试或手动选择快速分割。`,
    );
  } finally {
    input?.dispose();
    if (outputs) for (const output of Object.values(outputs)) output.dispose();
  }
}
