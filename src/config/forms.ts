/**
 * Contact form configuration. The UI never changes when the transport changes —
 * switch PUBLIC_FORM_PROVIDER to route submissions elsewhere.
 */
export type FormProvider = 'netlify' | 'function' | 'endpoint';

const provider = ((import.meta.env.PUBLIC_FORM_PROVIDER as string | undefined) || 'netlify') as FormProvider;

export const formConfig = {
  provider,
  formName: 'contact',
  functionPath: '/.netlify/functions/contact',
  endpoint: (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined) || '',

  automateOptions: [
    'Lead handling & qualification',
    'Email & follow-up automation',
    'Appointment scheduling',
    'Insurance renewals & retention',
    'CRM automation',
    'Administrative work',
    'A custom autonomous workflow',
    'Not sure yet',
  ],

  fields: {
    name: { label: 'Name', autocomplete: 'name', required: true },
    company: { label: 'Company', autocomplete: 'organization', required: false },
    email: { label: 'Business email', autocomplete: 'email', required: true },
    automate: { label: 'What do you want to automate?', required: true },
    message: { label: 'Message', required: false },
  },

  copy: {
    submit: 'Book a call',
    sending: 'Sending…',
    success: 'Received. We will reply to schedule a call.',
    error: 'Something went wrong. Please try again in a moment.',
  },
} as const;
