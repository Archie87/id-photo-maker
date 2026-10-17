import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'export',
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
