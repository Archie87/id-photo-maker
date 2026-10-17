'use client';
import { useRef, useState, type DragEvent } from 'react';
import type { PhotoEditor } from '../editor/use-photo-editor';
import { CanvasPreview } from './CanvasPreview';
const accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
export function Studio({ e, onEditPoints }: { e: PhotoEditor; onEditPoints: () => void }) {
  const input = useRef<HTMLInputElement>(null),
    [drag, setDrag] = useState(false),
    [guides, setGuides] = useState(true);
  const pick = () => input.current?.click();
  const dropHandlers = {
    onDragOver: (v: DragEvent) => {
      v.preventDefault();
      setDrag(true);
    },
    // 只在指针真正离开拖放区时取消高亮，避免经过子元素时闪烁
    onDragLeave: (v: DragEvent) => {
      if (!v.currentTarget.contains(v.relatedTarget as Node | null)) setDrag(false);
    },
    onDrop: (v: DragEvent) => {
      v.preventDefault();
      setDrag(false);
      const f = v.dataTransfer.files[0];
      if (f) void e.importFile(f);
    },
  };
  const size = e.spec.pixelSize
    ? `${e.width} × ${e.height} px`
    : `${e.spec.widthMm} × ${e.spec.heightMm} mm`;
  return (
    <section className="studio panel" aria-label="照片工作台">
      <div className="panel-heading">
        <h2>照片工作台</h2>
        <label className="check">
          <input type="checkbox" checked={guides} onChange={(v) => setGuides(v.target.checked)} />
          构图辅助线
        </label>
      </div>
      <input
        ref={input}
        type="file"
        aria-label="选择照片文件"
        className="file-input"
        accept={accept}
        onChange={(v) => {
          const f = v.target.files?.[0];
          if (f) void e.importFile(f);
          v.target.value = '';
        }}
      />
      {e.source ? (
        <div className={`stage ${drag ? 'dragging' : ''}`} {...dropHandlers}>
          <div className="result">
            <div className="photo-mat">
              <div
                className="result-frame checker"
                style={{ aspectRatio: `${e.width}/${e.height}` }}
              >
                <CanvasPreview canvas={e.output} label="证件照预览" />
                {guides && (
                  <div className="guides" aria-hidden="true">
                    <div className="eye-line" />
                    <div className="center-line" />
                  </div>
                )}
              </div>
            </div>
            <p className="dimension-label">
              {e.spec.name} · {size} · {e.spec.dpi} DPI
              <small>
                {e.spec.pixelSize ? '固定像素输出' : `输出 ${e.width} × ${e.height} 像素`}
              </small>
            </p>
          </div>
          <aside className="original">
            <span className="caption">原始照片</span>
            <div className="original-frame">
              <CanvasPreview canvas={e.source} label="原始照片" />
            </div>
            <small className="filename" title={e.filename}>
              {e.filename}
            </small>
            <button className="secondary small" onClick={pick}>
              更换照片
            </button>
            <button className="text-button" onClick={e.clear}>
              清除照片
            </button>
          </aside>
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone ${drag ? 'dragging' : ''}`}
          onClick={pick}
          disabled={e.busy}
          {...dropHandlers}
        >
          <span className="dropzone-icon" aria-hidden="true">
            ＋
          </span>
          <strong>{e.busy ? '正在读取照片…' : '选择照片，或拖到这里'}</strong>
          <span>正面、单人、头肩完整的照片效果最好</span>
          <small>JPG / PNG / WebP / HEIC* · 最大 30 MB · 照片只在本机处理</small>
        </button>
      )}
      <div className="action-bar">
        <button
          className="primary"
          disabled={!e.source || e.busy}
          aria-busy={e.busy}
          onClick={() => void e.analyze()}
        >
          {e.busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              处理中…
            </>
          ) : e.portrait ? (
            '✦ 重新本地 AI 处理'
          ) : (
            '✦ 本地 AI 处理'
          )}
        </button>
        <button className="secondary" disabled={!e.source || e.busy} onClick={onEditPoints}>
          校正关键点
        </button>
        <p role="status" aria-label="处理状态">
          {e.message}
        </p>
      </div>
      {e.aiStale && !e.busy && (
        <p className="notice">抠图设置已更改，点击「重新本地 AI 处理」后生效。</p>
      )}
      {e.error && (
        <div role="alert" className="error">
          {e.error}
        </div>
      )}
    </section>
  );
}
