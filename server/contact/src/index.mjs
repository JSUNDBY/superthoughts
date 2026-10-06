const ALLOWED_ORIGINS = new Set(['https://superthoughts.com', 'https://www.superthoughts.com']);
const ALLOWED_HOSTNAMES = new Set(['superthoughts.com', 'www.superthoughts.com']);
const MAX_BODY_BYTES = 20 * 1024;
const FROM = 'Superthoughts <hello@superthoughts.com>';
const TO = 'josh@superthoughts.com';

function reply(status, code, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  };
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify({ ok: status === 200, code }), { status, headers });
}

async function readBounded(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function validText(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value) &&
    !/[\r\n]/.test(value);
}

function validInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  if (typeof input.website !== 'string' || input.website.length > 0) return false;
  return validText(input.name, 1, 120) && !/[\r\n]/.test(input.name) &&
    validEmail(input.email) && validText(input.message, 1, 5000) &&
    typeof input.turnstileToken === 'string' && input.turnstileToken.length > 0 && input.turnstileToken.length <= 2048;
}

async function verifyTurnstile(token, secret, ip) {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  form.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: form, signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return { available: false, valid: false };
  const result = await response.json();
  return {
    available: true,
    valid: result?.success === true && result.action === 'superthoughts-contact' && ALLOWED_HOSTNAMES.has(result.hostname)
  };
}

async function sendEmail(input, apiKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: input.email,
      subject: 'Superthoughts contact form',
      text: `Name: ${input.name.trim()}\nEmail: ${input.email}\n\n${input.message.trim()}`
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return false;
  const result = await response.json();
  return typeof result?.id === 'string' && result.id.length > 0;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);
    if (url.pathname !== '/contact') return reply(404, 'not_found', origin);
    if (!ALLOWED_ORIGINS.has(origin)) return reply(403, 'forbidden', origin);
    if (request.method === 'OPTIONS') {
      const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        'Cache-Control': 'no-store',
        'Vary': 'Origin'
      };
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') return reply(405, 'method_not_allowed', origin);
    if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('Content-Type') || '')) return reply(415, 'unsupported_media_type', origin);
    if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET || !env.CONTACT_RATE_LIMIT) return reply(503, 'unavailable', origin);
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return reply(403, 'forbidden', origin);
    try {
      const limit = await env.CONTACT_RATE_LIMIT.limit({ key: ip });
      if (!limit.success) return reply(429, 'rate_limited', origin);
    } catch {
      return reply(503, 'unavailable', origin);
    }
    const declaredLength = request.headers.get('Content-Length');
    if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_BODY_BYTES) return reply(413, 'too_large', origin);
    let input;
    try {
      const body = await readBounded(request);
      if (body === null) return reply(413, 'too_large', origin);
      input = JSON.parse(body);
    } catch {
      return reply(400, 'invalid_request', origin);
    }
    if (!validInput(input)) return reply(400, 'invalid_request', origin);
    let challenge;
    try { challenge = await verifyTurnstile(input.turnstileToken, env.TURNSTILE_SECRET, ip); }
    catch { return reply(502, 'verification_unavailable', origin); }
    if (!challenge.available) return reply(502, 'verification_unavailable', origin);
    if (!challenge.valid) return reply(400, 'invalid_challenge', origin);
    try {
      const accepted = await sendEmail(input, env.RESEND_API_KEY);
      return accepted ? reply(200, 'sent', origin) : reply(502, 'delivery_unavailable', origin);
    } catch {
      return reply(502, 'delivery_unavailable', origin);
    }
  }
};
