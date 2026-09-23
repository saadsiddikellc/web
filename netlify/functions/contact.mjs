/**
 * Contact form relay.
 *
 * Used when PUBLIC_FORM_PROVIDER=function. Receives the JSON payload from the
 * site form and forwards it server-side to CONTACT_WEBHOOK_URL (CRM, Zapier/Make,
 * email provider, internal API…), so secrets never reach the browser.
 */
const REQUIRED = ['name', 'email', 'automate'];
const MAX_FIELD = 5000;

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  // Honeypot: bots fill hidden fields.
  if (body && typeof body['bot-field'] === 'string' && body['bot-field'].length > 0) {
    return json({ ok: true }, 202);
  }

  const payload = {};
  for (const [key, value] of Object.entries(body ?? {})) {
    if (key === 'bot-field' || key === 'form-name') continue;
    payload[key] = String(value ?? '').slice(0, MAX_FIELD);
  }

  const missing = REQUIRED.filter((key) => !payload[key]);
  if (missing.length) {
    return json({ ok: false, error: `Missing: ${missing.join(', ')}` }, 422);
  }

  const target = process.env.CONTACT_WEBHOOK_URL;
  if (!target) {
    // Not configured yet — accept so the UX works, and log for the deploy owner.
    console.warn('[contact] CONTACT_WEBHOOK_URL is not set; submission not forwarded.');
    return json({ ok: true, forwarded: false }, 202);
  }

  const headers = { 'content-type': 'application/json' };
  if (process.env.CONTACT_WEBHOOK_SECRET) {
    headers.authorization = `Bearer ${process.env.CONTACT_WEBHOOK_SECRET}`;
  }

  const res = await fetch(target, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, source: 'xus.co', receivedAt: new Date().toISOString() }),
  });

  if (!res.ok) {
    console.error('[contact] upstream failed', res.status);
    return json({ ok: false, error: 'Upstream error' }, 502);
  }
  return json({ ok: true, forwarded: true }, 202);
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
