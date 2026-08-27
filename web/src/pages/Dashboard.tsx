import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon, ExternalLinkIcon, PlayIcon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { Meter } from '../components/ui/Meter';
import { LogStream } from '../components/LogStream';
import { courseProgress, pendingMcqs, pendingSlos } from '../utils/sessions';

export function Dashboard() {
  const { courses, log, drive, gateway, startPipeline, student, students } = useQuill();
  const navigate = useNavigate();

  const totalSessions = courses.reduce((n, c) => n + c.sessions.length, 0);
  const completed = courses.reduce((n, c) => n + courseProgress(c).done, 0);
  const pendingWork = courses.reduce((n, c) => n + pendingSlos(c).length, 0);
  const pendingMcq = courses.reduce((n, c) => n + pendingMcqs(c), 0);

  const runAll = () => {
    startPipeline({
      studentIds: [student.id],
      courseCodes: courses.map((c) => c.code),
      limit: 24
    });
    navigate('/pipeline');
  };

  const runCourse = (code: string) => {
    startPipeline({ studentIds: [student.id], courseCodes: [code], limit: 12 });
    navigate('/pipeline');
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
      <section className="flex flex-col gap-6 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-2xs uppercase tracking-widest text-faint">pending worksheets</p>
          <div className="mt-1 flex items-end gap-4">
            <span className="font-mono text-6xl font-bold leading-none text-ink">{pendingWork}</span>
            <span className="pb-1 text-sm text-muted">
              SLO submissions waiting
              <br />
              <span className="text-faint">plus {pendingMcq} unattempted MCQ sets</span>
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={runAll} disabled={pendingWork === 0}>
              <PlayIcon className="h-4 w-4" aria-hidden />
              Run all pending
            </Button>
            <Button onClick={() => navigate('/pipeline')}>Open pipeline</Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-x-8 gap-y-1 lg:text-right">
          {[
          { k: 'courses', v: courses.length },
          { k: 'sessions', v: totalSessions },
          { k: 'completed', v: completed }].
          map((s) =>
          <div key={s.k}>
              <dd className="font-mono text-2xl font-semibold text-ink">{s.v}</dd>
              <dt className="font-mono text-2xs uppercase tracking-wide text-faint">{s.k}</dt>
            </div>
          )}
        </dl>
      </section>

      <section className="pt-7" aria-labelledby="courses-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="courses-heading" className="text-sm font-semibold text-ink">
            Courses
          </h2>
          <span className="font-mono text-2xs text-faint">
            {students.length} student profile{students.length === 1 ? '' : 's'} configured
          </span>
        </div>

        <ul className="divide-y divide-line border-y border-line">
          {courses.map((c) => {
            const p = courseProgress(c);
            const pend = pendingSlos(c).length;
            return (
              <li key={c.code} className="group">
                <div className="flex flex-col gap-3 py-3.5 md:flex-row md:items-center md:gap-6">
                  <Link
                    to={`/courses/${c.code}`}
                    className="flex min-w-0 flex-1 items-baseline gap-3 rounded transition-colors duration-150 ease-out">
                    
                    <span className="font-mono text-sm text-accent">{c.code}</span>
                    <span className="min-w-0 truncate text-sm text-ink group-hover:underline">{c.name}</span>
                    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-faint opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" aria-hidden />
                  </Link>

                  <p className="w-44 shrink-0 truncate font-mono text-2xs text-muted">{c.faculty}</p>

                  <div className="w-48 shrink-0">
                    <div className="mb-1 flex items-baseline justify-between font-mono text-2xs">
                      <span className="text-muted">
                        {p.done}/{p.total} sessions
                      </span>
                      <span className="text-faint">{p.pct}%</span>
                    </div>
                    <Meter pct={p.pct} />
                  </div>

                  <div className="flex w-36 shrink-0 items-center justify-end gap-3">
                    <span className={`font-mono text-2xs ${pend ? 'text-warn' : 'text-faint'}`}>
                      {pend ? `${pend} pending` : 'clear'}
                    </span>
                    <Button size="sm" onClick={() => runCourse(c.code)} disabled={!pend}>
                      Run pending
                    </Button>
                  </div>
                </div>
              </li>);

          })}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-6 pt-8 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold text-ink">Recent pipeline events</h2>
            <Link
              to="/pipeline"
              className="font-mono text-2xs text-faint transition-colors duration-150 ease-out hover:text-ink">
              
              full stream →
            </Link>
          </div>
          <LogStream events={log.slice(0, 10)} />
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Integrations</h2>
          <ul className="mt-3 space-y-3">
            <li>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${drive === 'connected' ? 'bg-accent' : 'bg-danger'}`} />
                <span className="text-sm text-ink">Google Drive</span>
                {drive === 'connected' && <CheckIcon className="h-3.5 w-3.5 text-accent" aria-hidden />}
              </div>
              <p className="mt-0.5 pl-3.5 font-mono text-2xs text-faint">/Quill/2026-odd · token valid 59m</p>
            </li>
            <li>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${gateway === 'connected' ? 'bg-accent' : 'bg-danger'}`} />
                <span className="text-sm text-ink">AI Connection</span>
              </div>
              <p className="mt-0.5 pl-3.5 font-mono text-2xs text-faint">Ready</p>
            </li>
          </ul>
          <Link
            to="/settings"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-2xs text-muted transition-colors duration-150 ease-out hover:text-ink">
            
            Manage configuration
            <ExternalLinkIcon className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </section>
    </div>);

}