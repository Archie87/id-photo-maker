'use client';
import { useEffect, useRef } from 'react';
export function CanvasPreview({
  canvas,
  label,
}: {
  canvas: HTMLCanvasElement | null;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = ref.current;
    if (!target || !canvas) return;
    target.width = canvas.width;
    target.height = canvas.height;
    target.getContext('2d')!.drawImage(canvas, 0, 0);
  }, [canvas]);
  return canvas ? (
    <canvas ref={ref} aria-label={label} role="img" />
  ) : (
    <div className="empty-portrait" aria-hidden="true">
      <div className="head" />
      <div className="shoulders" />
      <span>你的照片将在这里呈现</span>
    </div>
  );
}
