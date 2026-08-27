import React from 'react';

export function Field({
  label,
  hint,
  children




}: {label: string;hint?: string;children: React.ReactNode;}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-2xs text-muted">{label}</span>
        {hint && <span className="font-mono text-2xs text-faint">{hint}</span>}
      </span>
      {children}
    </label>);

}

export const inputClass =
'h-9 w-full rounded-md border border-line bg-raised px-3 font-mono text-xs text-ink placeholder:text-faint focus:border-accent/50';