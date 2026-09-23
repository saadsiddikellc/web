/** Insurance use case — a primary audience for XUS. */
export const insurance = {
  eyebrow: 'Use case — Insurance',
  title: 'Missed lead = missed opportunity.',
  intro:
    'Agencies, brokers and carriers run on speed and follow-through. Quotes, callbacks, documents and renewals pile up on the same few people. An XUS agent takes that load — from the first inquiry to the next renewal — and keeps it moving.',
  audiences: ['Insurance agencies', 'Brokers', 'Carriers & MGAs', 'Service teams'],
  flow: [
    { id: 'arrive', label: 'Lead arrives', note: 'Web form, email, call-back request or referral.' },
    { id: 'capture', label: 'AI captures it', note: 'Logged instantly with source and context.' },
    { id: 'qualify', label: 'Qualifies it', note: 'Coverage needs, timing and fit — asked naturally.' },
    { id: 'respond', label: 'Responds', note: 'A clear, on-brand reply within moments.' },
    { id: 'follow', label: 'Follows up', note: 'Timed follow-ups until there is an answer.' },
    { id: 'schedule', label: 'Schedules appointment', note: 'Books time directly on an agent’s calendar.' },
    { id: 'organize', label: 'Organizes customer info', note: 'Details and documents filed to the CRM.' },
    { id: 'monitor', label: 'Monitors renewal', note: 'Watches upcoming policy dates.' },
    { id: 'renew', label: 'Starts renewal outreach', note: 'Begins the conversation early, not last-minute.' },
    { id: 'loop', label: 'Keeps following up', note: 'The loop continues — nothing falls through.' },
  ],
  note: 'Illustrative workflow. Every implementation is designed around your carriers, systems and compliance requirements.',
} as const;
