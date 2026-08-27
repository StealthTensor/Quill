import React from 'react';
import { TuiFrame } from '../components/TuiFrame';
import { cliCommands } from '../data/quill';

const GROUPS: Array<{id: string;label: string;}> = [
{ id: 'setup', label: 'Setup & auth' },
{ id: 'work', label: 'Work' },
{ id: 'pipeline', label: 'Pipeline' },
{ id: 'surfaces', label: 'Surfaces' },
{ id: 'config', label: 'Config' }];


const A = 'text-accent';
const W = 'text-warn';
const I = 'text-info';

export function Reference() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 lg:px-8">
      <header className="border-b border-line pb-5">
        <h1 className="text-xl font-semibold text-ink">TUI & CLI</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          The terminal surfaces subscribe to the same event stream as this dashboard, so a run started
          here shows up there and vice versa.
        </p>
      </header>

      <section className="space-y-6 py-7">
        <h2 className="font-mono text-2xs uppercase tracking-widest text-faint">tui screens</h2>

        <TuiFrame command="quill status">
          <span className="text-ink">
            {'┌ quill '}
            <span className={A}>R Trinai</span>
            {'  RA2311003010842  '}
            <span className={A}>● srm</span>
            {'  '}
            <span className={A}>● drive</span>
            {'  '}
            <span className={A}>● gateway</span>
            {' ─────────────┐\n'}
          </span>
          {'│ COURSES                  │ 21LEM202T · sessions                          │\n'}
          {'│ '}
          <span className={A}>21LEM202T  ▇▁▁▁▁▁▁▁   9%</span>
          {' │ #    mcq    slo1        slo2                   │\n'}
          {'│ 21CSC204J  ▇▇▇▇▁▁▁▁  40% │ 101  '}
          <span className={A}>80%</span>
          {'    '}
          <span className={A}>verified</span>
          {'    '}
          <span className={A}>verified</span>
          {'               │\n'}
          {'│ 21CSC203P  ▇▇▇▇▇▇▇▇  83% │ 102  '}
          <span className={A}>100%</span>
          {'   '}
          <span className={A}>verified</span>
          {'    '}
          <span className={W}>resubmission</span>
          {'           │\n'}
          {'│ 21MAB204T  ▇▇▁▁▁▁▁▁  24% │ 103  '}
          <span className={W}>40%</span>
          {'    '}
          <span className={I}>pending</span>
          {'     '}
          <span className={I}>pending</span>
          {'                │\n'}
          {'│ 21CSS201T  ▇▇▇▇▇▁▁▁  61% │ 104  '}
          <span className="text-faint">—</span>
          {'      not started  not started            │\n'}
          {'├──────────────────────────┴───────────────────────────────────┤\n'}
          {'│ '}
          <span className="text-faint">12:04:31</span>
          {' '}
          <span className={I}>slots.detected</span>
          {'   14 slots in APP_Worksheet.docx     │\n'}
          {'│ '}
          <span className="text-faint">12:04:33</span>
          {' '}
          <span className={A}>document.written</span>
          {' output/21LEM202T_104_SLO1.docx     │\n'}
          {'└──────────────────────────────────────────────────────────────┘\n'}
          <span className="text-faint">{'  ↑↓ course   ⇥ pane   r run pending   s scan   q quit'}</span>
        </TuiFrame>

        <div className="grid gap-6 xl:grid-cols-2">
          <TuiFrame command="quill run">
            {'  '}
            <span className={A}>SCAN</span>
            {' → '}
            <span className={A}>FILL</span>
            {' → '}
            <span className={W}>UPLOAD</span>
            {' → submit\n\n'}
            {'  ['}
            <span className={A}>{'████████████████░░░░░░'}</span>
            {']  17/24 jobs\n\n'}
            <span className="text-faint">{'  12:04:35 '}</span>
            <span className={I}>request.sent</span>
            {'      21MAB204T/112 SLO 1\n'}
            <span className="text-faint">{'  12:04:39 '}</span>
            <span className={A}>response.received</span>
            {' 1,284 tok · 3.9s\n'}
            <span className="text-faint">{'  12:04:40 '}</span>
            <span className={A}>document.written</span>
            {'  14 slots filled\n'}
            <span className="text-faint">{'  12:04:42 '}</span>
            <span className="text-danger">drive.error</span>
            {'       403 quotaExceeded (retry 1/2)\n'}
            <span className="text-faint">{'  12:04:48 '}</span>
            <span className={A}>submit.ok</span>
            {'         accepted → pending review\n\n'}
            {'  '}
            <span className="text-ink">summary</span>
            {'  '}
            <span className={A}>done 16</span>
            {'  '}
            <span className="text-danger">failed 1</span>
            {'  '}
            <span className="text-faint">skipped 0</span>
          </TuiFrame>

          <TuiFrame command="quill scan --course 21LEM202T">
            {'  course      session  mcq          slo1         slo2\n'}
            {'  ─────────────────────────────────────────────────────────\n'}
            {'  21LEM202T   101      '}
            <span className={A}>80%</span>
            {'          '}
            <span className={A}>verified</span>
            {'     '}
            <span className={A}>verified</span>
            {'\n'}
            {'  21LEM202T   102      '}
            <span className={A}>100%</span>
            {'         '}
            <span className={A}>verified</span>
            {'     '}
            <span className={W}>resubmit</span>
            {'\n'}
            {'  21LEM202T   103      '}
            <span className={W}>40%</span>
            {'          '}
            <span className={I}>pending</span>
            {'      '}
            <span className={I}>pending</span>
            {'\n'}
            {'  21LEM202T   104      '}
            <span className="text-faint">not attempted</span>
            {'  pending      —\n'}
            {'  21LEM202T   105      '}
            <span className="text-faint">not attempted</span>
            {'  —            —\n\n'}
            {'  '}
            <span className="text-ink">summary</span>
            {'  '}
            <span className={W}>83 pending worksheets</span>
            {'  '}
            <span className={W}>41 pending MCQs</span>
          </TuiFrame>
        </div>
      </section>

      <section className="border-t border-line py-7">
        <h2 className="font-mono text-2xs uppercase tracking-widest text-faint">cli</h2>
        <div className="mt-4 space-y-6">
          {GROUPS.map((g) =>
          <div key={g.id}>
              <p className="mb-2 text-xs font-medium text-ink">{g.label}</p>
              <ul className="divide-y divide-line border-y border-line">
                {cliCommands.
              filter((c) => c.group === g.id).
              map((c) =>
              <li key={c.cmd} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-6">
                      <code className="w-80 shrink-0 font-mono text-xs text-accent">{c.cmd}</code>
                      <span className="text-xs text-muted">{c.note}</span>
                    </li>
              )}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>);

}