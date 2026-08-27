import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, ExternalLinkIcon, PlayIcon } from 'lucide-react';
import type { Session, SloStatus } from '../types/quill';
import { ScoreBadge, SloBadge } from './ui/StatusBadge';
import { QuestionsPanel } from './QuestionsPanel';
import { Button } from './ui/Button';

function SloCell({
  status,
  onFill



}: {status: SloStatus;onFill: () => void;}) {
  const actionable = status === 'not_started' || status === 'resubmission';
  if (!actionable) return <SloBadge status={status} />;
  return (
    <button
      type="button"
      onClick={onFill}
      className="group/slo inline-flex items-center gap-1.5 rounded transition-opacity duration-150 ease-out hover:opacity-100"
      title="Fill, upload and submit this SLO">
      
      <SloBadge status={status} />
      <PlayIcon className="h-3 w-3 text-faint transition-colors duration-150 ease-out group-hover/slo:text-accent" aria-hidden />
    </button>);

}

function LinkCell({ href, label }: {href: string | null;label: string;}) {
  if (!href) return <span className="font-mono text-2xs text-faint">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-2xs text-info transition-colors duration-150 ease-out hover:text-ink">
      
      {label}
      <ExternalLinkIcon className="h-3 w-3" aria-hidden />
    </a>);

}

export function SessionRow({
  courseCode,
  session,
  expanded,
  onToggle,
  onFill






}: {courseCode: string;session: Session;expanded: boolean;onToggle: () => void;onFill: (slo: 1 | 2) => void;}) {
  return (
    <>
      <tr className={`border-b border-line/60 transition-colors duration-150 ease-out ${expanded ? 'bg-raised' : ''}`}>
        <td className="py-2 pl-3 pr-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 font-mono text-xs text-ink">
            
            <ChevronRightIcon
              className={`h-3.5 w-3.5 text-faint transition-transform duration-150 ease-out ${expanded ? 'rotate-90' : ''}`}
              aria-hidden />
            
            {session.number}
          </button>
        </td>
        <td className="px-2 py-2 font-mono text-2xs text-faint">U{session.unit}</td>
        <td className="px-2 py-2">
          {session.mcqScore === null ?
          <Link to={`/mcq/${courseCode}/${session.number}`} className="inline-block">
              <ScoreBadge score={null} />
            </Link> :

          <Link to={`/mcq/${courseCode}/${session.number}`} className="inline-block">
              <ScoreBadge score={session.mcqScore} />
            </Link>
          }
        </td>
        <td className="px-2 py-2">
          <SloCell status={session.slo1} onFill={() => onFill(1)} />
        </td>
        <td className="px-2 py-2">
          <SloCell status={session.slo2} onFill={() => onFill(2)} />
        </td>
        <td className="px-2 py-2">
          <LinkCell href={session.slo1Link} label="slo1.docx" />
        </td>
        <td className="px-2 py-2 pr-3">
          <LinkCell href={session.slo2Link} label="slo2.docx" />
        </td>
      </tr>

      {expanded &&
      <tr className="border-b border-line bg-raised/40">
          <td colSpan={7} className="px-3 py-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,320px)_1fr]">
              <div className="space-y-3">
                <div>
                  <p className="font-mono text-2xs uppercase tracking-wide text-faint">slo 1</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink">{session.slo1Desc}</p>
                </div>
                <div>
                  <p className="font-mono text-2xs uppercase tracking-wide text-faint">slo 2</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink">{session.slo2Desc}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => onFill(1)} disabled={session.slo1 === 'verified'}>
                    Fill SLO 1
                  </Button>
                  <Button size="sm" onClick={() => onFill(2)} disabled={session.slo2 === 'verified'}>
                    Fill SLO 2
                  </Button>
                  <Link to={`/mcq/${courseCode}/${session.number}`}>
                    <Button size="sm" variant="ghost">
                      Solve MCQ →
                    </Button>
                  </Link>
                </div>
              </div>
              <QuestionsPanel session={session} />
            </div>
          </td>
        </tr>
      }
    </>);

}