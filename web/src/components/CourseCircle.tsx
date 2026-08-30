import React, { useEffect, useState } from 'react';

type Node = {
  name?: string;
  Status?: number;
  key?: string;
  course?: { SESSION?: number };
  children?: Node[];
};

const SLO_COLOR: Record<number, string> = {
  0: '#ef4444', // not started
  1: '#f59e0b', // in progress
  2: '#10b981'  // completed
};
const UNIT_FILL = '#4b5563';
const SESS_FILL = '#6b7280';

const TAU = Math.PI * 2;
const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [
  cx + r * Math.cos(a),
  cy + r * Math.sin(a)
];

function arc(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, ro, a0);
  const [x1, y1] = polar(cx, cy, ro, a1);
  const [x2, y2] = polar(cx, cy, ri, a1);
  const [x3, y3] = polar(cx, cy, ri, a0);
  return `M${x0} ${y0} A${ro} ${ro} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function CourseCircle({ code }: { code: string }) {
  const [flare, setFlare] = useState<Node | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let ok = true;
    setFlare(null);
    setErr(false);
    fetch(`/api/circle/${code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => ok && setFlare(d.flare))
      .catch(() => ok && setErr(true));
    return () => {
      ok = false;
    };
  }, [code]);

  if (err) return <p className="py-8 text-center font-mono text-2xs text-faint">Couldn't load the course map.</p>;
  if (!flare) return <p className="py-8 text-center font-mono text-2xs text-faint">Loading course map…</p>;

  const units = flare.children ?? [];
  const totalLeaves = units.reduce(
    (n, u) => n + (u.children ?? []).reduce((m, s) => m + (s.children?.length ?? 0), 0),
    0
  );
  if (!totalLeaves) return <p className="py-8 text-center font-mono text-2xs text-faint">No sessions yet.</p>;

  const SIZE = 520;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = { u0: 60, u1: 138, s1: 200, o1: 248 };
  const start = -Math.PI / 2;
  const step = TAU / totalLeaves;

  const arcs: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  let leaf = 0;

  for (const unit of units) {
    const uStart = start + leaf * step;
    let uLeaves = 0;
    for (const sess of unit.children ?? []) {
      const slos = sess.children ?? [];
      if (!slos.length) continue;
      const sStart = start + leaf * step;
      slos.forEach((slo, i) => {
        const a0 = start + (leaf + i) * step;
        const a1 = a0 + step;
        const st = slo.Status ?? 0;
        arcs.push(
          <path key={`slo-${slo.key}-${leaf}-${i}`} d={arc(cx, cy, R.s1, R.o1, a0, a1)} fill={SLO_COLOR[st] ?? SLO_COLOR[0]} stroke="#0b0f14" strokeWidth={0.75} />
        );
      });
      const sEnd = start + (leaf + slos.length) * step;
      arcs.push(
        <path key={`sess-${sStart}`} d={arc(cx, cy, R.u1, R.s1, sStart, sEnd)} fill={SESS_FILL} stroke="#0b0f14" strokeWidth={0.75} />
      );
      const mid = (sStart + sEnd) / 2;
      const [lx, ly] = polar(cx, cy, (R.u1 + R.s1) / 2, mid);
      labels.push(
        <text key={`sl-${sStart}`} x={lx} y={ly} fontSize={7} fill="#e5e7eb" textAnchor="middle" dominantBaseline="central">
          {(sess.name ?? '').replace(/\s+/g, '')}
        </text>
      );
      leaf += slos.length;
      uLeaves += slos.length;
    }
    if (!uLeaves) continue;
    const uEnd = uStart + uLeaves * step;
    arcs.push(
      <path key={`unit-${uStart}`} d={arc(cx, cy, R.u0, R.u1, uStart, uEnd)} fill={UNIT_FILL} stroke="#0b0f14" strokeWidth={1} />
    );
    const mid = (uStart + uEnd) / 2;
    const [lx, ly] = polar(cx, cy, (R.u0 + R.u1) / 2, mid);
    labels.push(
      <text key={`ul-${uStart}`} x={lx} y={ly} fontSize={9} fontWeight={600} fill="#f9fafb" textAnchor="middle" dominantBaseline="central">
        {unit.name}
      </text>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[520px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="img" aria-label={`${code} learning map`}>
          {arcs}
          {labels}
          <circle cx={cx} cy={cy} r={R.u0 - 2} fill="none" />
          <text x={cx} y={cy} fontSize={13} fontWeight={700} fill="var(--ink, #e5e7eb)" textAnchor="middle" dominantBaseline="central">
            {code}
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-4 font-mono text-2xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLO_COLOR[0] }} /> Not started</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLO_COLOR[1] }} /> In progress</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLO_COLOR[2] }} /> Completed</span>
      </div>
    </div>
  );
}
