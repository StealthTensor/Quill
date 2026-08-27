import React from 'react';

export function Meter({ pct, tone = 'accent' }: {pct: number;tone?: 'accent' | 'info';}) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line" role="presentation">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-out ${tone === 'accent' ? 'bg-accent' : 'bg-info'}`}
        style={{ width: `${Math.max(pct, 1)}%` }} />
      
    </div>);

}