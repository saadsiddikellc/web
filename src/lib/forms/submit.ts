import { formConfig, type FormProvider } from '@/config/forms';

/**
 * Transport-agnostic form submission. The UI calls `submitForm` and never needs to
 * know where data goes. Add a provider here (CRM API, email service…) without
 * touching the form markup.
 */
export type FormPayload = Record<string, string>;
export interface SubmitResult {
  ok: boolean;
  error?: string;
}

type Adapter = (payload: FormPayload) => Promise<Response>;

const encode = (data: FormPayload) => new URLSearchParams(data).toString();

const adapters: Record<FormProvider, Adapter> = {
  netlify: (payload) =>
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode({ 'form-name': formConfig.formName, ...payload }),
    }),
  function: (payload) =>
    fetch(formConfig.functionPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  endpoint: (payload) => {
    if (!formConfig.endpoint) throw new Error('PUBLIC_FORM_ENDPOINT is not configured');
    return fetch(formConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};

export async function submitForm(payload: FormPayload, provider: FormProvider = formConfig.provider): Promise<SubmitResult> {
  try {
    const res = await adapters[provider](payload);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Client-side validation mirroring the required fields in formConfig. */
export function validate(payload: FormPayload): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!payload.name?.trim()) errors.name = 'Please add your name.';
  if (!payload.email?.trim()) errors.email = 'Please add your business email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email.trim())) errors.email = 'That email doesn’t look right.';
  if (!payload.automate?.trim()) errors.automate = 'Choose what you’d like to automate.';
  return errors;
}
