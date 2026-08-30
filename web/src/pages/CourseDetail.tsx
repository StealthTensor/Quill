import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlayIcon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { Meter } from '../components/ui/Meter';
import { SessionRow } from '../components/SessionRow';
import { CourseCircle } from '../components/CourseCircle';
import { courseProgress, pendingMcqs, pendingSlos } from '../utils/sessions';

type Filter = 'all' | 'pending' | 'done';

export function CourseDetail() {
  const { courseCode } = useParams<{courseCode: string;}>();
  const { courses, student, startPipeline, startTargeted } = useQuill();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const course = courses.find((c) => c.code === courseCode);

  const rows = useMemo(() => {
    if (!course) return [];
    if (filter === 'pending')
    return course.sessions.filter(
      (s) => s.slo1 !== 'verified' || s.slo2 !== 'verified' || s.mcqScore === null
    );
    if (filter === 'done')
    return course.sessions.filter((s) => s.slo1 === 'verified' && s.slo2 === 'verified');
    return course.sessions;
  }, [course, filter]);

  if (!course) {
    return (
      <div className="px-8 py-16">
        <h1 className="text-sm font-semibold text-ink">Course not found</h1>
        <p className="mt-1 text-sm text-muted">
          <Link to="/" className="text-accent hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>);

  }

  const p = courseProgress(course);
  const pend = pendingSlos(course);

  const fill = (session: number, slo: 1 | 2) => {
    startTargeted(course.code, session, slo);
    navigate('/pipeline');
  };

  const fillAll = () => {
    startPipeline({ studentIds: [student.id], courseCodes: [course.code], limit: 20 });
    navigate('/pipeline');
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-2xs text-faint">
          <Link to="/" className="transition-colors duration-150 ease-out hover:text-ink">
            dashboard
          </Link>{' '}
          / courses / {course.code}
        </p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-baseline gap-3 text-xl font-semibold text-ink">
              <span className="font-mono text-accent">{course.code}</span>
              {course.name}
            </h1>
            <p className="mt-1.5 font-mono text-2xs text-muted">
              {course.faculty} · {course.batch} · semester {course.semester} · {course.sessions.length}{' '}
              sessions · {Math.ceil(course.sessions.length / 9)} units
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="w-52">
              <div className="mb-1 flex items-baseline justify-between font-mono text-2xs">
                <span className="text-muted">
                  {p.done}/{p.total} sessions verified
                </span>
                <span className="text-ink">{p.pct}%</span>
              </div>
              <Meter pct={p.pct} />
              <p className="mt-1.5 font-mono text-2xs text-faint">
                {pend.length} pending SLOs · {pendingMcqs(course)} pending MCQs
              </p>
            </div>
            <Button variant="primary" onClick={fillAll} disabled={!pend.length}>
              <PlayIcon className="h-4 w-4" aria-hidden />
              Fill all pending
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b border-line py-5" aria-label="Course map">
        <CourseCircle code={course.code} />
      </section>

      <div className="flex items-center gap-1 py-3">
        {(['all', 'pending', 'done'] as Filter[]).map((f) =>
        <button
          key={f}
          onClick={() => setFilter(f)}
          aria-pressed={filter === f}
          className={`rounded px-2 py-1 font-mono text-2xs transition-colors duration-150 ease-out ${
          filter === f ? 'bg-raised text-ink' : 'text-faint hover:text-muted'}`
          }>
          
            {f}
          </button>
        )}
        <span className="ml-auto font-mono text-2xs text-faint">
          {rows.length} row{rows.length === 1 ? '' : 's'} · click a row for questions & model answers
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {['Session', 'Unit', 'MCQ', 'SLO 1', 'SLO 2', 'SLO 1 file', 'SLO 2 file'].map((h) =>
              <th
                key={h}
                scope="col"
                className="px-2 py-2 font-mono text-2xs font-medium uppercase tracking-wide text-faint first:pl-3 last:pr-3">
                
                  {h}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) =>
            <SessionRow
              key={s.number}
              courseCode={course.code}
              session={s}
              expanded={expanded === s.number}
              onToggle={() => setExpanded(expanded === s.number ? null : s.number)}
              onFill={(slo) => fill(s.number, slo)} />

            )}
          </tbody>
        </table>
        {!rows.length && <p className="px-4 py-8 font-mono text-2xs text-faint">Nothing matches this filter.</p>}
      </div>
    </div>);

}