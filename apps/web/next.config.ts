import type { NextConfig } from 'next';
// 部署在子路径（如 GitHub Pages 的 /id-photo-maker）时构建前设置；本地与 Docker 保持根路径。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
if (basePath && !/^\/[\w-]+(\/[\w-]+)*$/.test(basePath))
  throw new Error(`NEXT_PUBLIC_BASE_PATH 必须以 / 开头且不以 / 结尾，当前为 "${basePath}"`);
const config: NextConfig = {
  output: 'export',
  basePath,
  devIndicators: false,
  images: { unoptimized: true },
  transpilePackages: [
    '@id-photo/photo-engine',
    '@id-photo/ai-engine',
    '@id-photo/spec-engine',
    '@id-photo/print-engine',
  ],
};
export default config;
