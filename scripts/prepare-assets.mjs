import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
const require = createRequire(new URL('../packages/ai-engine/package.json', import.meta.url));
const base = dirname(require.resolve('@mediapipe/tasks-vision'));
await mkdir('apps/web/public/wasm', { recursive: true });
await cp(resolve(base, 'wasm'), 'apps/web/public/wasm', { recursive: true });
const manifest = JSON.parse(await readFile('models/manifest.json', 'utf8'));
const modelFiles = new Set(manifest.models.map((model) => model.file));
// This generated directory must not retain retired weights between builds.
await rm('apps/web/public/models', { recursive: true, force: true });
await mkdir('apps/web/public/models', { recursive: true });
for (const file of await readdir('models'))
  if (modelFiles.has(file) || file.endsWith('-LICENSE'))
    await cp(`models/${file}`, `apps/web/public/models/${file}`);
const ortBase = dirname(require.resolve('onnxruntime-web/wasm'));
await mkdir('apps/web/public/wasm/ort', { recursive: true });
for (const file of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'])
  await cp(resolve(ortBase, file), `apps/web/public/wasm/ort/${file}`);
await build({
  entryPoints: ['apps/web/src/workers/portrait.worker.ts'],
  outfile: 'apps/web/public/worker/portrait.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  nodePaths: ['packages/ai-engine/node_modules'],
});
console.log('Local WASM, models and classic worker prepared.');
