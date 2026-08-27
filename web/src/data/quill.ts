import type { Course, Student } from '../types/quill';
import { buildSessions } from '../utils/sessions';

export const students: Student[] = [
{
  id: 'stu-1',
  name: 'R Trinai',
  regNo: 'RA2311003010842',
  branch: 'CSE — Core',
  section: 'K2',
  department: 'Computing Technologies',
  semester: 4,
  persona:
  'Writes in a plain, technically confident register. Prefers short declarative sentences, no filler, and always ties the answer back to the SLO wording.'
},
{
  id: 'stu-2',
  name: 'A Meenakshi',
  regNo: 'RA2311003010877',
  branch: 'CSE — Core',
  section: 'K2',
  department: 'Computing Technologies',
  semester: 4,
  persona: 'Slightly more descriptive tone, uses worked examples where the question allows it.'
}];


const courseMeta = [
{
  code: '21LEM202T',
  name: 'Professional Ethics',
  faculty: 'Dr. S Kavitha',
  batch: 'Batch 1',
  total: 45,
  completed: 4
},
{
  code: '21CSC204J',
  name: 'Design & Analysis of Algorithms',
  faculty: 'Dr. R Vignesh',
  batch: 'Batch 2',
  total: 45,
  completed: 18
},
{
  code: '21CSC203P',
  name: 'Advanced Programming Practice',
  faculty: 'Ms. P Anitha',
  batch: 'Batch 1',
  total: 36,
  completed: 30
},
{
  code: '21MAB204T',
  name: 'Probability & Queueing Theory',
  faculty: 'Dr. K Bhuvaneswari',
  batch: 'Batch 3',
  total: 45,
  completed: 11
},
{
  code: '21CSS201T',
  name: 'Computer Communications',
  faculty: 'Dr. M Sundaram',
  batch: 'Batch 2',
  total: 36,
  completed: 22
}];


export const courses: Course[] = courseMeta.map((c) => ({
  code: c.code,
  name: c.name,
  faculty: c.faculty,
  batch: c.batch,
  semester: 4,
  sessions: buildSessions(c.code, c.total, c.completed)
}));

export const cliCommands: Array<{cmd: string;note: string;group: string;}> = [
{ group: 'setup', cmd: 'quill init', note: 'interactive first-time setup' },
{ group: 'setup', cmd: 'quill login', note: 'test SRM connection' },
{ group: 'setup', cmd: 'quill auth google', note: 'run Google OAuth flow' },
{ group: 'work', cmd: 'quill scan', note: 'list all pending work (table output)' },
{ group: 'work', cmd: 'quill scan --course 21LEM202T', note: 'filter by course' },
{ group: 'work', cmd: 'quill fill', note: 'generate + fill all pending docx' },
{ group: 'work', cmd: 'quill fill --session 103 --slo 1', note: 'specific session' },
{ group: 'work', cmd: 'quill upload', note: 'upload filled docx to Google Drive' },
{ group: 'work', cmd: 'quill submit', note: 'submit Google Drive links to SRM' },
{ group: 'work', cmd: 'quill mcq', note: 'auto-answer all pending MCQs' },
{ group: 'work', cmd: 'quill mcq --course 21LEM202T', note: 'specific course' },
{ group: 'pipeline', cmd: 'quill run', note: 'full pipeline: scan→fill→upload→submit→mcq' },
{ group: 'pipeline', cmd: 'quill run --dry-run', note: "show what would happen, don't do it" },
{ group: 'pipeline', cmd: 'quill run --student "R Trinai"', note: 'specific student only' },
{ group: 'surfaces', cmd: 'quill status', note: 'launch TUI dashboard' },
{ group: 'surfaces', cmd: 'quill serve', note: 'start web dashboard on localhost:5001' },
{ group: 'config', cmd: 'quill config show', note: 'dump current config' },
{ group: 'config', cmd: 'quill config set api.model fusion', note: 'change config value' }];


export const seedLog: Array<{type: string;message: string;level: 'info' | 'success' | 'warn' | 'error';ago: number;details?: string;}> = [
{ type: 'scan.complete', message: '5 courses · 207 sessions · 129 pending worksheets', level: 'success', ago: 42 },
{ type: 'submit.ok', message: '21CSC203P/130 SLO 2 accepted by SRM', level: 'success', ago: 96 },
{ type: 'drive.upload', message: 'Uploaded 21CSC203P_130_SLO2.docx (48 KB)', level: 'info', ago: 118 },
{ type: 'document.written', message: 'output/21CSC203P_130_SLO2.docx — 14 slots filled', level: 'info', ago: 141, details: 'slots: title, reg_no, session, slo_text, answer_1..answer_9, signature' },
{ type: 'response.received', message: 'gateway/fusion · 1,284 tokens · 3.9s', level: 'info', ago: 149, details: 'finish_reason: stop\ntemperature: 0.4\nmax cell chars: 900' },
{ type: 'request.sent', message: 'prompt built for 21CSC203P/130 SLO 2', level: 'info', ago: 153, details: 'persona: R Trinai\nsystem: answer as the student, plain register, cite SLO wording' },
{ type: 'slots.detected', message: '14 fillable slots in APP_Worksheet_Template.docx', level: 'info', ago: 158 },
{ type: 'mcq.submitted', message: '21MAB204T/112 scored 4/5 (80%)', level: 'success', ago: 204 },
{ type: 'submit.rejected', message: '21LEM202T/104 SLO 2 — resubmission requested by faculty', level: 'warn', ago: 260, details: 'faculty note: "expand the case discussion in Q3"' },
{ type: 'auth.google', message: 'Drive token refreshed (expires in 59m)', level: 'info', ago: 315 }];