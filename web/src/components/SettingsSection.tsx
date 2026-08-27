import React from 'react';

export function SettingsSection({
  id,
  title,
  description,
  aside,
  children






}: {id: string;title: string;description: string;aside?: React.ReactNode;children: React.ReactNode;}) {
  return (
    <section id={id} className="scroll-mt-6 border-b border-line py-7 last:border-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
          {aside}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>);

}