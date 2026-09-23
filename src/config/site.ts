/**
 * Global, editable site configuration.
 * Change brand details, navigation and CTAs here — components read from this file.
 */
const bookingUrl = (import.meta.env.PUBLIC_BOOKING_URL as string | undefined)?.trim();

export const siteConfig = {
  name: 'XUS',
  legalName: 'XUS',
  domain: 'xus.co',
  url: 'https://xus.co',
  tagline: 'Work that keeps working.',
  description:
    'XUS builds AI agents and autonomous AI automation that handle repetitive business workflows — leads, follow-ups, scheduling, renewals and admin — so your business keeps working even when you are not there.',
  locale: 'en_US',

  nav: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Work', href: '/work' },
    { label: 'Founders', href: '/founders' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],

  cta: {
    primary: {
      label: 'Book a call',
      href: bookingUrl || '/contact',
      external: Boolean(bookingUrl),
    },
    secondary: { label: 'See how it works', href: '/#how-it-works' },
  },

  /** Social profiles — add URLs when they exist. Empty entries are not rendered. */
  social: [] as { label: string; href: string }[],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
