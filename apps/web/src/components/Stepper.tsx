import type { PhotoEditor } from '../editor/use-photo-editor';
export function Stepper({ e }: { e: PhotoEditor }) {
  const steps = [
    { label: '上传照片', done: !!e.source },
    { label: '本地 AI 去背景', done: !!e.portrait, optional: true },
    { label: '调整构图', done: !!e.points },
    { label: '下载保存', done: !!e.lastExport },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="stepper" aria-label="制作进度">
      {steps.map((s, i) => (
        <li
          key={s.label}
          className={s.done ? 'done' : i === current ? 'current' : ''}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="dot">{s.done ? '✓' : i + 1}</span>
          <span>
            {s.label}
            {s.optional && <small>可选</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}
