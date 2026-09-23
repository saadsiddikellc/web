import { siteConfig } from './site';

/** Per-page SEO. Titles are kept under ~60 chars, descriptions under ~160. */
export const seoConfig = {
  titleTemplate: (title: string) => (title ? `${title} — XUS` : 'XUS — AI Agents & Autonomous AI Automation'),
  defaultImage: '/og/xus-og.png',
  twitterCard: 'summary_large_image' as const,

  pages: {
    home: {
      title: '',
      description:
        'XUS builds AI agents and autonomous AI automation for lead handling, follow-up, scheduling, renewals and admin. Your business keeps working when you are not there.',
    },
    services: {
      title: 'AI Agents & AI Automation Services',
      description:
        'AI agents and AI automation for lead qualification, email and follow-up automation, appointment scheduling, CRM updates, renewals and admin — built around your workflows.',
    },
    work: {
      title: 'Work — Autonomous Workflow Demonstrations',
      description:
        'Interactive demonstrations of XUS AI workflows: lead capture, AI email handling, automated follow-up, scheduling, insurance renewals, CRM operations and end-to-end AI agents.',
    },
    founders: {
      title: 'Founders',
      description: 'Two founders. One focused on production. One focused on sales. Building autonomous AI systems at XUS.',
    },
    about: {
      title: 'About',
      description:
        'XUS started with a simple belief: businesses should not spend their best hours repeating work a machine can handle. We build autonomous AI systems.',
    },
    contact: {
      title: 'Contact — Book a Call',
      description:
        'Tell us what you want to automate. Book a call with XUS to scope AI agents and automation for your leads, follow-ups, scheduling, renewals and admin.',
    },
    notFound: {
      title: 'Page not found',
      description: 'This page does not exist. Your workflows, however, can keep running.',
    },
  },

  organization: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icons/xus-512.png`,
    description: siteConfig.description,
    knowsAbout: [
      'AI agents',
      'AI automation',
      'Business process automation',
      'Insurance automation',
      'Lead automation',
      'Follow-up automation',
      'Autonomous workflows',
    ],
  },
} as const;

export type PageKey = keyof typeof seoConfig.pages;
