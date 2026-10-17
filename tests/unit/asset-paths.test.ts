import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteAsset, workerAsset } from '../../packages/ai-engine/src/assets';

describe('asset paths under a deployment base path', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('joins the site base path without duplicate or missing slashes', () => {
    expect(siteAsset('worker/portrait.js')).toBe('/worker/portrait.js');
    expect(siteAsset('worker/portrait.js', '/id-photo-maker')).toBe(
      '/id-photo-maker/worker/portrait.js',
    );
    expect(siteAsset('/worker/portrait.js', '/id-photo-maker/')).toBe(
      '/id-photo-maker/worker/portrait.js',
    );
  });

  it('resolves models and wasm relative to the worker script, not the origin root', () => {
    vi.stubGlobal('self', {
      location: { href: 'https://archie87.github.io/id-photo-maker/worker/portrait.js' },
    });
    expect(workerAsset('models/face_landmarker.task')).toBe(
      'https://archie87.github.io/id-photo-maker/models/face_landmarker.task',
    );
    expect(workerAsset('wasm')).toBe('https://archie87.github.io/id-photo-maker/wasm');
    vi.stubGlobal('self', { location: { href: 'http://127.0.0.1:3000/worker/portrait.js' } });
    expect(workerAsset('wasm/ort/ort-wasm-simd-threaded.wasm')).toBe(
      'http://127.0.0.1:3000/wasm/ort/ort-wasm-simd-threaded.wasm',
    );
  });
});
