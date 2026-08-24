/**
 * Contact form handler — Cloudflare Pages Function.
 *
 * POSTs from the site's contact form land here and are emailed to the
 * addresses in RECIPIENTS via Resend.
 *
 * Requires the secret RESEND_API_KEY to be set on the Pages project
 * (Settings -> Environment variables). Without it the handler returns 503
 * rather than silently dropping an enquiry.
 */

// WARNING (verified 2026-08-24): DreamHost currently rejects EVERY address at
// xn--troquia-9za.com with "554 5.7.1 Recipient address rejected: Access
// denied" — including postmaster@ and addresses that do not exist. No mailbox
// is provisioned there yet, so enquiries sent to these addresses will bounce.
// Create the mailboxes in the DreamHost panel (or switch to @troquinha.com,
// which has live Microsoft 365 MX records), then clear the Resend suppression
// list at https://resend.com/suppressions before relying on this.
const RECIPIENTS = ['info@xn--troquia-9za.com', 'tecnicos@xn--troquia-9za.com'];

// Resend only accepts a From address on a domain verified in that account.
// troquiña.com is not verified there, so we send from the verified domain and
// set reply_to to the visitor, which is what actually matters when replying.
// To send as @troquiña.com, verify it at https://resend.com/domains and change
// FROM — nothing else here needs to change.
const FROM = 'Web Troquiña <web@nga.miguelpuig.com>';
const MAX = { nombre: 120, email: 200, telefono: 40, mensaje: 5000 };

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function onRequestPost({ request, env }) {
  let f;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      f = await request.json();
    } else {
      f = Object.fromEntries(await request.formData());
    }
  } catch {
    return json(400, { ok: false, error: 'bad_request' });
  }

  // Honeypot: a real person never fills this in.
  if (f['bot-field']) return json(200, { ok: true });

  const nombre = String(f.nombre || '').trim().slice(0, MAX.nombre);
  const email = String(f.email || '').trim().slice(0, MAX.email);
  const telefono = String(f.telefono || '').trim().slice(0, MAX.telefono);
  const mensaje = String(f.mensaje || '').trim().slice(0, MAX.mensaje);

  if (!nombre || !email || !mensaje) return json(400, { ok: false, error: 'missing_fields' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { ok: false, error: 'bad_email' });

  const key = env.RESEND_API_KEY;
  if (!key) return json(503, { ok: false, error: 'not_configured' });

  const html = `
    <h2>Nuevo mensaje desde troquiña.com</h2>
    <p><strong>Nombre:</strong> ${esc(nombre)}</p>
    <p><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
    <p><strong>Teléfono:</strong> ${esc(telefono) || '—'}</p>
    <hr>
    <p style="white-space:pre-wrap">${esc(mensaje)}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: RECIPIENTS,
      reply_to: email,
      subject: `Web: ${nombre}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error('mail send failed', res.status, await res.text().catch(() => ''));
    return json(502, { ok: false, error: 'send_failed' });
  }
  return json(200, { ok: true });
}

// Anything other than POST.
export const onRequest = () => json(405, { ok: false, error: 'method_not_allowed' });
