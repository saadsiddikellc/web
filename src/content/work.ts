/**
 * Work — interactive demonstrations.
 * These are product demonstrations of what XUS builds, NOT client case studies.
 * Node coordinates are on a 100 × 60 grid used by the WorkflowDemo renderer.
 */

export interface DemoNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: 'source' | 'agent' | 'action' | 'store' | 'human';
}

export interface WorkItem {
  id: string;
  index: string;
  title: string;
  kicker: string;
  summary: string;
  bullets: string[];
  nodes: DemoNode[];
  /** Ordered path the signal travels; consecutive ids are connected. */
  path: string[];
  /** Extra non-path connections drawn faintly. */
  links?: [string, string][];
  /** Simulated event log shown while the demo runs (sample data). */
  log: string[];
  annotation: string;
  /** Uses the 3D AI core visual instead of the flat diagram. */
  feature?: boolean;
}

export const workItems: WorkItem[] = [
  {
    id: 'lead-capture',
    index: '01',
    title: 'Lead Capture',
    kicker: 'Every inquiry, caught.',
    summary: 'Leads from forms, inboxes and call-back requests land in one place, instantly logged and acknowledged — no tab-switching, no sticky notes.',
    bullets: ['Multi-source intake', 'Instant acknowledgement', 'Deduplication & source tracking'],
    nodes: [
      { id: 'web', label: 'Web form', x: 10, y: 12, kind: 'source' },
      { id: 'mail', label: 'Inbox', x: 10, y: 30, kind: 'source' },
      { id: 'call', label: 'Call-back', x: 10, y: 48, kind: 'source' },
      { id: 'agent', label: 'XUS agent', x: 48, y: 30, kind: 'agent' },
      { id: 'ack', label: 'Acknowledge', x: 86, y: 16, kind: 'action' },
      { id: 'crm', label: 'CRM record', x: 86, y: 44, kind: 'store' },
    ],
    path: ['web', 'agent', 'ack', 'crm'],
    links: [['mail', 'agent'], ['call', 'agent'], ['agent', 'crm']],
    log: ['New inquiry · web form', 'Duplicate check · clear', 'Source tagged · “website”', 'Acknowledgement sent', 'CRM record created'],
    annotation: 'LEADS',
  },
  {
    id: 'email-handling',
    index: '02',
    title: 'AI Email Handling',
    kicker: 'An inbox that answers itself.',
    summary: 'The agent reads each message, understands intent, drafts or sends the right reply, and routes anything sensitive to a person.',
    bullets: ['Intent classification', 'Context-aware replies', 'Human review where needed'],
    nodes: [
      { id: 'in', label: 'Incoming', x: 10, y: 30, kind: 'source' },
      { id: 'read', label: 'Understand', x: 34, y: 30, kind: 'agent' },
      { id: 'reply', label: 'Reply', x: 62, y: 14, kind: 'action' },
      { id: 'route', label: 'Route to team', x: 62, y: 46, kind: 'human' },
      { id: 'log', label: 'Thread logged', x: 88, y: 30, kind: 'store' },
    ],
    path: ['in', 'read', 'reply', 'log'],
    links: [['read', 'route'], ['route', 'log']],
    log: ['Email received · “Quote question”', 'Intent · pricing inquiry', 'Reply drafted from knowledge base', 'Reply sent', 'Thread logged to contact'],
    annotation: 'EMAIL',
  },
  {
    id: 'follow-up',
    index: '03',
    title: 'Automated Follow-Up',
    kicker: 'Persistence, without the effort.',
    summary: 'Timed, personal follow-ups that continue until there is a response — and stop the moment there is one.',
    bullets: ['Timed sequences', 'Stops on reply', 'Tone adapts to context'],
    nodes: [
      { id: 'lead', label: 'Open lead', x: 10, y: 30, kind: 'source' },
      { id: 'd1', label: 'Day 1', x: 32, y: 14, kind: 'action' },
      { id: 'd3', label: 'Day 3', x: 52, y: 46, kind: 'action' },
      { id: 'd7', label: 'Day 7', x: 72, y: 14, kind: 'action' },
      { id: 'reply', label: 'Reply → stop', x: 90, y: 38, kind: 'human' },
    ],
    path: ['lead', 'd1', 'd3', 'd7', 'reply'],
    log: ['Lead quiet for 24h', 'Follow-up #1 sent', 'Follow-up #2 sent · new angle', 'Follow-up #3 sent', 'Reply detected · sequence stopped'],
    annotation: 'FOLLOW UP',
  },
  {
    id: 'scheduling',
    index: '04',
    title: 'Appointment Scheduling',
    kicker: 'From “interested” to booked.',
    summary: 'The agent checks real availability, offers times, books the meeting, sends reminders and handles reschedules.',
    bullets: ['Live calendar availability', 'Reminders & reschedules', 'Assigned to the right person'],
    nodes: [
      { id: 'ask', label: 'Request', x: 10, y: 30, kind: 'source' },
      { id: 'cal', label: 'Check calendar', x: 36, y: 14, kind: 'store' },
      { id: 'offer', label: 'Offer times', x: 36, y: 46, kind: 'agent' },
      { id: 'book', label: 'Booked', x: 66, y: 30, kind: 'action' },
      { id: 'remind', label: 'Reminder', x: 90, y: 30, kind: 'action' },
    ],
    path: ['ask', 'cal', 'offer', 'book', 'remind'],
    log: ['Meeting requested', 'Availability checked · 3 slots', 'Options offered', 'Slot confirmed · invite sent', 'Reminder scheduled'],
    annotation: 'SCHEDULE',
  },
  {
    id: 'insurance-renewal',
    index: '05',
    title: 'Insurance Renewal Workflow',
    kicker: 'Renewals that start early.',
    summary: 'Upcoming renewals are monitored continuously. Outreach begins ahead of time, follow-ups continue, and the account manager is looped in when it matters.',
    bullets: ['Renewal date monitoring', 'Early, staged outreach', 'Manager alerts on risk'],
    nodes: [
      { id: 'policy', label: 'Policy data', x: 10, y: 30, kind: 'store' },
      { id: 'watch', label: 'Monitor dates', x: 32, y: 30, kind: 'agent' },
      { id: 'reach', label: 'Outreach', x: 56, y: 14, kind: 'action' },
      { id: 'follow', label: 'Follow-up', x: 56, y: 46, kind: 'action' },
      { id: 'mgr', label: 'Notify manager', x: 86, y: 30, kind: 'human' },
    ],
    path: ['policy', 'watch', 'reach', 'follow', 'mgr'],
    log: ['Renewal window opened · 60 days', 'Renewal outreach sent', 'No response · follow-up queued', 'Follow-up sent', 'Account manager notified'],
    annotation: 'RENEWAL',
  },
  {
    id: 'crm-ops',
    index: '06',
    title: 'CRM & Operations Automation',
    kicker: 'Records that keep themselves clean.',
    summary: 'After every call, email and booking, the right records are created, updated and linked — and the team is notified of what changed.',
    bullets: ['Auto-created records', 'Field updates & notes', 'Team notifications'],
    nodes: [
      { id: 'event', label: 'Activity', x: 10, y: 30, kind: 'source' },
      { id: 'agent', label: 'XUS agent', x: 36, y: 30, kind: 'agent' },
      { id: 'crm', label: 'CRM update', x: 64, y: 14, kind: 'store' },
      { id: 'docs', label: 'Documents', x: 64, y: 46, kind: 'store' },
      { id: 'team', label: 'Team notified', x: 90, y: 30, kind: 'human' },
    ],
    path: ['event', 'agent', 'crm', 'team'],
    links: [['agent', 'docs'], ['docs', 'team']],
    log: ['Call summary received', 'Contact matched', 'Fields & notes updated', 'Document filed', 'Team channel notified'],
    annotation: 'OPS',
  },
  {
    id: 'autonomous-agent',
    index: '07',
    title: 'End-to-End Autonomous AI Agent',
    kicker: 'One agent. Every step.',
    summary: 'A single agent running the full loop — lead, qualification, email, follow-up, appointment, CRM, renewal and team notification — continuously, day and night.',
    bullets: ['One agent, many workflows', 'Runs 24/7', 'Escalates only when needed'],
    nodes: [
      { id: 'lead', label: 'Lead', x: 8, y: 30, kind: 'source' },
      { id: 'qual', label: 'Qualify', x: 22, y: 12, kind: 'agent' },
      { id: 'email', label: 'Email', x: 36, y: 48, kind: 'action' },
      { id: 'fu', label: 'Follow-up', x: 50, y: 12, kind: 'action' },
      { id: 'appt', label: 'Appointment', x: 64, y: 48, kind: 'action' },
      { id: 'crm', label: 'CRM', x: 78, y: 12, kind: 'store' },
      { id: 'renew', label: 'Renewal', x: 92, y: 48, kind: 'action' },
    ],
    path: ['lead', 'qual', 'email', 'fu', 'appt', 'crm', 'renew'],
    log: ['Lead captured', 'Qualified · good fit', 'Reply sent', 'Follow-up running', 'Appointment booked', 'CRM updated', 'Renewal monitored', 'Team notified'],
    annotation: 'AUTONOMOUS',
    feature: true,
  },
];

export const workDisclaimer =
  'These are demonstrations of workflows XUS builds — not client case studies. Event logs use sample data.';
