/** Services & capabilities. Edit copy here; pages render from this data. */

export interface Service {
  id: string;
  index: string;
  title: string;
  lede: string;
  body: string;
  points: string[];
}

export const services: Service[] = [
  {
    id: 'ai-agents',
    index: '01',
    title: 'AI Agents',
    lede: 'A digital operator that owns a workflow from first touch to done.',
    body:
      'An XUS AI agent reads incoming requests, decides what should happen next, takes the action in your tools, and keeps going until the task is complete — escalating to your team only when a human is genuinely needed.',
    points: [
      'Understands leads, emails and requests in context',
      'Acts inside your existing tools and CRM',
      'Escalates edge cases to the right person',
      'Runs around the clock without handoffs',
    ],
  },
  {
    id: 'ai-automation',
    index: '02',
    title: 'AI Automation',
    lede: 'The connective system that keeps every repetitive process moving.',
    body:
      'We map the repetitive work behind your operation — the copying, chasing, scheduling and updating — and rebuild it as reliable automated workflows with AI where judgement is needed and rules where it is not.',
    points: [
      'Workflow mapping and redesign',
      'Integrations between your systems',
      'Monitoring, logging and alerts',
      'Iterated as your business changes',
    ],
  },
];

export interface Capability {
  id: string;
  title: string;
  summary: string;
  tag: string;
}

export const capabilities: Capability[] = [
  { id: 'lead-handling', tag: 'LEADS', title: 'Lead Handling', summary: 'Every inbound lead is captured, logged and acknowledged the moment it arrives.' },
  { id: 'lead-qualification', tag: 'LEADS', title: 'Lead Qualification', summary: 'The agent asks the right questions and routes serious prospects first.' },
  { id: 'email-automation', tag: 'EMAIL', title: 'Email Automation', summary: 'Inbox triage, drafted replies and context-aware responses that sound like you.' },
  { id: 'follow-up', tag: 'FOLLOW UP', title: 'Follow-Up Automation', summary: 'Persistent, well-timed follow-up sequences that stop the moment someone replies.' },
  { id: 'scheduling', tag: 'CALENDAR', title: 'Appointment Scheduling', summary: 'Availability checks, bookings, reminders and reschedules — without the back-and-forth.' },
  { id: 'communication', tag: 'CLIENTS', title: 'Customer Communication', summary: 'Consistent updates across email and messaging so no customer waits in silence.' },
  { id: 'renewals', tag: 'RETENTION', title: 'Renewal & Retention Workflows', summary: 'Upcoming renewals are monitored and outreach begins well before the deadline.' },
  { id: 'crm', tag: 'CRM', title: 'CRM Automation', summary: 'Records created, updated and kept clean automatically after every interaction.' },
  { id: 'admin', tag: 'ADMIN', title: 'Administrative Automation', summary: 'Document intake, data entry, reminders and internal notifications handled quietly.' },
  { id: 'custom', tag: 'CUSTOM', title: 'Custom Autonomous Workflows', summary: 'If a process is repetitive and rules-driven, we can usually build an agent for it.' },
];

/** What shapes scope and pricing. No prices are published by design. */
export const scopeFactors = [
  { title: 'Business size', body: 'Team size, volume of leads, customers and requests.' },
  { title: 'Workflow complexity', body: 'How many decisions, branches and exceptions each process has.' },
  { title: 'Number of processes', body: 'One focused workflow, or several running together.' },
  { title: 'Integrations', body: 'The CRM, inbox, calendar, policy and document systems involved.' },
  { title: 'AI agent scope', body: 'How much the agent decides and acts on its own versus escalates.' },
];

export const processSteps = [
  { index: '01', title: 'Map', body: 'We walk through your day and find the repetitive work that slows the business down.' },
  { index: '02', title: 'Design', body: 'We design the workflow and the agent’s responsibilities, rules and escalation points.' },
  { index: '03', title: 'Build', body: 'We build, connect your tools and test against real scenarios before anything goes live.' },
  { index: '04', title: 'Run', body: 'The system goes live, is monitored, and is refined as your business evolves.' },
];
