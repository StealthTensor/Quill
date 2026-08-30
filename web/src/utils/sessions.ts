import type { Course, McqQuestion, QaPair, Session, SloStatus } from '../types/quill';

export function unitForSession(sessionNumber: number): number {
  return Math.floor((sessionNumber - 101) / 9) + 1;
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const SLO_VERBS = [
'Define and contrast the core terminology',
'Apply the governing equations to a worked case',
'Interpret the experimental data set',
'Evaluate the trade-offs between two approaches',
'Model the system behaviour under load',
'Summarise the standards that constrain the design'];


function mcqSet(rand: () => number, code: string, session: number): McqQuestion[] {
  const stems = [
  `Which of the following best describes the primary role of <code>${code}</code> unit ${unitForSession(session)} in the reference architecture?`,
  'A system operating at steady state receives an input step of <strong>2.5&nbsp;units</strong>. What is the expected settling behaviour?',
  'Identify the <em>incorrect</em> statement regarding the method introduced in this session.',
  'Given the tabulated coefficients, which expression yields the correct residual?',
  'Which constraint is relaxed first when the optimisation fails to converge?'];

  return stems.map((html, i) => {
    const correct = Math.floor(rand() * 4);
    const suggestedWrong = rand() > 0.82;
    return {
      id: `${code}-${session}-q${i + 1}`,
      html,
      options: ['A', 'B', 'C', 'D'].map((label, j) => ({
        label,
        html:
        j === correct ?
        'The formulation that preserves both boundary conditions' :
        [
        'A linear approximation that ignores the second-order term',
        'The empirical fit reported in the 1998 survey',
        'A closed form valid only for symmetric inputs',
        'None of the tabulated relations apply'][
        j]
      })),
      suggested: suggestedWrong ? (correct + 1) % 4 : correct,
      confidence: Math.round((suggestedWrong ? 0.52 + rand() * 0.2 : 0.78 + rand() * 0.21) * 100) / 100,
      correct
    };
  });
}

function qaSet(rand: () => number, kind: 'short' | 'long', code: string): QaPair[] {
  const count = kind === 'short' ? 3 : 2;
  return Array.from({ length: count }, (_, i) => ({
    question:
    kind === 'short' ?
    `State ${2 + Math.floor(rand() * 2)} distinguishing properties of the ${code} concept introduced in part ${i + 1}.` :
    `Derive the working expression used in ${code} and discuss its limiting cases with a labelled sketch. (${i === 0 ? '10' : '15'} marks)`,
    answer:
    kind === 'short' ?
    'Model answer supplied by SRM: the property set is bounded, order-preserving, and invariant under the stated transformation, which is what allows the shortcut used in the lab sheet.' :
    'Model answer supplied by SRM: begin from the conservation statement, non-dimensionalise, and note that the low-parameter limit collapses to the classical result while the high-parameter limit is dominated by the dissipative term.'
  }));
}

export function buildSessions(code: string, total: number, completed: number): Session[] {
  const rand = seeded(code);
  return Array.from({ length: total }, (_, i) => {
    const number = 101 + i;
    let slo1: SloStatus = 'not_started';
    let slo2: SloStatus = 'not_started';
    if (i < completed) {
      slo1 = 'verified';
      slo2 = rand() > 0.15 ? 'verified' : 'resubmission';
    } else if (i < completed + 2) {
      slo1 = 'pending_review';
      slo2 = i === completed ? 'pending_review' : 'not_started';
    }
    const attempted = i < completed + 1;
    return {
      number,
      unit: unitForSession(number),
      mcqScore: attempted ? [60, 80, 80, 100, 40][Math.floor(rand() * 5)] : null,
      slo1,
      slo2,
      slo1Link: slo1 === 'not_started' ? null : `https://drive.google.com/file/d/${code.toLowerCase()}-${number}-slo1/view`,
      slo2Link: slo2 === 'not_started' ? null : `https://drive.google.com/file/d/${code.toLowerCase()}-${number}-slo2/view`,
      slo1Desc: `${SLO_VERBS[i % SLO_VERBS.length]} for unit ${unitForSession(number)}.`,
      slo2Desc: `${SLO_VERBS[(i + 3) % SLO_VERBS.length]} and justify the chosen method.`,
      mcqs: mcqSet(rand, code, number),
      shortQuestions: qaSet(rand, 'short', code),
      longQuestions: qaSet(rand, 'long', code)
    };
  });
}

export function courseProgress(course: Course): {done: number;total: number;pct: number;} {
  const total = course.sessions.length;
  const done = course.sessions.filter((s) => s.slo1 === 'verified' && s.slo2 === 'verified').length;
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}

export function pendingSlos(course: Course): Array<{session: number;slo: 1 | 2;}> {
  const out: Array<{session: number;slo: 1 | 2;}> = [];
  for (const s of course.sessions) {
    if (s.slo1 === 'not_started' || s.slo1 === 'resubmission') out.push({ session: s.number, slo: 1 });
    if (s.slo2 === 'not_started' || s.slo2 === 'resubmission') out.push({ session: s.number, slo: 2 });
  }
  return out;
}

export function pendingMcqs(course: Course): number {
  return course.sessions.filter((s) => s.mcqScore === null).length;
}

export const SLO_LABEL: Record<SloStatus, string> = {
  not_started: 'not started',
  pending_review: 'pending review',
  verified: 'verified',
  resubmission: 'resubmission'
};

export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}