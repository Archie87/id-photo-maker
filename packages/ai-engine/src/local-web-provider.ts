import type { AnalyzeOptions, AIProvider, PortraitResult, WorkerResponse } from './types';
export class LocalWebProvider implements AIProvider {
  readonly id: string = 'local-web';
  constructor(private readonly matting: 'hivision' | 'selfie' | 'hair-cleanup' = 'selfie') {}
  private worker: Worker | null = null;
  private sequence = 0;
  private pending = new Map<
    number,
    {
      resolve: (r: PortraitResult) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  analyze(image: ImageData, options?: AnalyzeOptions): Promise<PortraitResult> {
    if (!this.worker) {
      this.worker = new Worker('/worker/portrait.js');
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const m = event.data,
          p = this.pending.get(m.id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(m.id);
        if (m.result) p.resolve(m.result);
        else p.reject(new Error(m.error || 'AI 处理失败'));
      };
      this.worker.onerror = () => this.dispose();
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.dispose(), 90000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ id, image, options: { ...options, matting: this.matting } }, [
        image.data.buffer,
      ]);
    });
  }
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('本地 AI 已停止或运行超时。请重试，或使用手动调整。'));
    }
    this.pending.clear();
  }
}
