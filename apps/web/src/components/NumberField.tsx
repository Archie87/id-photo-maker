'use client';
import { useEffect, useState } from 'react';
/** 输入过程中保留草稿，失焦或回车时再按范围收敛，避免逐键钳制把 35 变成 100。 */
export function NumberField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const n = Number(draft);
    const next = draft.trim() && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : value;
    setDraft(String(next));
    if (next !== value) onCommit(next);
  }
  return (
    <label className="number-field">
      {label}
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        min={min}
        max={max}
        value={draft}
        onChange={(v) => setDraft(v.target.value)}
        onBlur={commit}
        onKeyDown={(v) => {
          if (v.key === 'Enter') commit();
        }}
      />
    </label>
  );
}
