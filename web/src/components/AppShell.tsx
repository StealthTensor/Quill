import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboardIcon,
  PlayIcon,
  RefreshCwIcon,
  SettingsIcon,
  TerminalIcon,
  LogOutIcon } from
'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { ConnectionPill } from './ui/ConnectionPill';
import { Button } from './ui/Button';
import { courseProgress, pendingSlos } from '../utils/sessions';

const NAV = [
{ to: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
{ to: '/pipeline', label: 'Pipeline', icon: PlayIcon },
{ to: '/settings', label: 'Settings', icon: SettingsIcon }];


export function AppShell({ children }: {children: React.ReactNode;}) {
  const { student, courses, srm, drive, gateway, scanNow, scanning, running, signOut } = useQuill();
  const location = useLocation();
  const totalPending = courses.reduce((n, c) => n + pendingSlos(c).length, 0);

  return (
    <div className="flex h-full w-full bg-canvas font-sans">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-5">
          <span className="font-mono text-base font-bold tracking-tight text-ink">quill</span>
          <span className="font-mono text-2xs text-faint">v0.4.1</span>
        </div>

        <nav className="px-3 py-4" aria-label="Primary">
          <ul className="space-y-0.5">
            {NAV.map((item) =>
            <li key={item.to}>
                <NavLink
                to={item.to}
                className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out ${
                isActive ?
                'bg-raised font-medium text-ink' :
                'text-muted hover:bg-raised/60 hover:text-ink'}`

                }>
                
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                  {item.to === '/pipeline' && running &&
                <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                }
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="min-h-0 flex-1 px-3">
          <p className="px-2.5 pb-2 font-mono text-2xs text-faint">COURSES</p>
          <ul className="q-scroll max-h-full space-y-0.5 overflow-y-auto pb-4">
            {courses.map((c) => {
              const p = courseProgress(c);
              const active = location.pathname === `/courses/${c.code}`;
              return (
                <li key={c.code}>
                  <Link
                    to={`/courses/${c.code}`}
                    className={`block rounded-md px-2.5 py-1.5 transition-colors duration-150 ease-out ${
                    active ? 'bg-raised' : 'hover:bg-raised/60'}`
                    }>
                    
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`font-mono text-2xs ${active ? 'text-ink' : 'text-muted'}`}>
                        {c.code}
                      </span>
                      <span className="font-mono text-2xs text-faint">{p.pct}%</span>
                    </span>
                    <span className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.max(p.pct, 1)}%` }} />
                      
                    </span>
                  </Link>
                </li>);

            })}
          </ul>
        </div>

        <div className="space-y-1.5 border-t border-line px-5 py-4">
          <ConnectionPill label="srm" state={srm} detail={srm === 'connected' ? 'academia' : undefined} />
          <ConnectionPill label="drive" state={drive} detail={drive === 'connected' ? 'authorized' : undefined} />
          <ConnectionPill
            label="ai"
            state={gateway}
            detail={gateway === 'connected' ? 'ready' : 'ready'} />
          
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent-soft font-mono text-2xs font-bold text-accent">
              {(student?.name ?? '?')
              .split(' ')
              .map((w) => w[0])
              .join('')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-4 text-ink">{student?.name ?? 'Not logged in'}</p>
              <p className="truncate font-mono text-2xs text-faint">
                {student?.regNo ?? ''} {student?.department ? `· ${student.department}` : ''} {student?.semester ? `· Sem ${student.semester}` : ''} {student?.section ? `· ${student.section}` : ''}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-2xs text-faint sm:inline">
              {totalPending} pending
            </span>
            <Button size="sm" onClick={scanNow} disabled={scanning}>
              <RefreshCwIcon className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} aria-hidden />
              {scanning ? 'Scanning…' : 'Scan now'}
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sign out">
              <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </header>

        <main className="q-scroll min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>);

}