/**
 * Homepage scroll story. Each chapter is a scroll "beat": its copy is rendered as
 * semantic HTML and its index drives the 3D camera timeline (src/three/timeline.ts).
 * `height` is in viewport heights and controls how long the beat lasts.
 */

export type ChapterId =
  | 'vision'
  | 'headquarters'
  | 'enter'
  | 'office'
  | 'manual'
  | 'problem'
  | 'ai'
  | 'workflow'
  | 'autonomous';

export interface Chapter {
  id: ChapterId;
  height: number;
  align: 'left' | 'right' | 'center';
  eyebrow?: string;
  annotation?: string;
}

export const chapters: Chapter[] = [
  { id: 'vision', height: 140, align: 'left', annotation: 'GOALS' },
  { id: 'headquarters', height: 130, align: 'right', eyebrow: 'Headquarters', annotation: 'BUILD' },
  { id: 'enter', height: 100, align: 'left' },
  { id: 'office', height: 140, align: 'left', eyebrow: '09:00' },
  { id: 'manual', height: 170, align: 'right', eyebrow: '11:40' },
  { id: 'problem', height: 200, align: 'center' },
  { id: 'ai', height: 150, align: 'left', eyebrow: 'Introducing the system', annotation: 'AUTONOMOUS' },
  { id: 'workflow', height: 170, align: 'right', eyebrow: 'One agent · many workflows' },
  { id: 'autonomous', height: 170, align: 'right', eyebrow: '22:15', annotation: 'SCALE' },
];

export const hero = {
  title: ['Work that', 'keeps working.'],
  lede: 'XUS builds AI agents and autonomous workflows that handle the repetitive work behind your business — so it keeps moving, even when you are not there.',
};

export const manualTasks = [
  'Missed leads',
  'Unanswered emails',
  'Follow-ups',
  'Scheduling',
  'Paperwork',
  'Renewals',
  'Data entry',
  'Status updates',
];

export const problemLines = [
  'Leads get missed.',
  'Follow-ups get delayed.',
  'Repetitive work never stops.',
  'Your business shouldn’t depend on manual work.',
];

export const workflowSteps = [
  'Lead',
  'Qualification',
  'Email',
  'Follow-up',
  'Appointment',
  'CRM',
  'Renewal',
  'Team notification',
];

/** Illustrative activity for the “autonomous” beat. Sample events, not metrics. */
export const autonomousFeed = [
  { label: 'Lead processed', detail: 'Qualified · routed' },
  { label: 'Email sent', detail: 'Reply to quote request' },
  { label: 'Follow-up running', detail: 'Sequence step 2 of 3' },
  { label: 'Appointment scheduled', detail: 'Tue · 10:30' },
  { label: 'Renewal monitored', detail: 'Window opens in 60 days' },
  { label: 'CRM updated', detail: 'Notes & status synced' },
  { label: 'Team notified', detail: 'Summary posted' },
];
