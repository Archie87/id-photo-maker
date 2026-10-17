import type { AIProvider, PortraitResult } from './types';
/** Reserved extension point. No network implementation or automatic fallback. */
export class ServerProvider implements AIProvider {
  readonly id = 'server-disabled';
  async analyze(_image: ImageData): Promise<PortraitResult> {
    throw new Error('服务器 Provider 尚未实现；照片不会上传。');
  }
  dispose(): void {}
}
