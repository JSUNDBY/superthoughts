import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';

const origin = 'https://superthoughts.com';
const valid = { name: 'Visitor', email: 'visitor@example.com', message: 'Hello there', website: '', turnstileToken: 'token' };
function setup({ challenge = { success: true, hostname: 'superthoughts.com', action: 'superthoughts-contact' }, provider = { id: 'email-id' }, limited = false } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('siteverify')) return Response.json(challenge);
    if (url.includes('resend')) return Response.json(provider);
    throw new Error('unexpected fetch');
  };
  const env = { RESEND_API_KEY: 'test-key', TURNSTILE_SECRET: 'test-secret', CONTACT_RATE_LIMIT: { limit: async ({ key }) => { assert.equal(key, '203.0.113.1'); return { success: !limited }; } } };
  return { calls, env };
}
function request(data = valid, headers = {}, method = 'POST') {
  return new Request('https://api.example.com/contact', {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1', ...headers },
    ...(method === 'POST' ? { body: JSON.stringify(data) } : {})
  });
}

test('accepts a valid message and fixes recipient, sender, and subject', async () => {
  const { calls, env } = setup();
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, code: 'sent' });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.equal(calls.length, 2);
  const sent = JSON.parse(calls[1].init.body);
  assert.deepEqual(sent.to, ['josh@superthoughts.com']);
  assert.equal(sent.from, 'Superthoughts <hello@superthoughts.com>');
  assert.equal(sent.reply_to, valid.email);
  assert.equal(sent.subject, 'Superthoughts contact form');
  assert.match(sent.text, /Hello there/);
});

test('rejects unapproved or absent origins before upstream calls', async () => {
  const { calls, env } = setup();
  for (const bad of ['https://evil.example', 'https://superthoughts.com.evil.example', '']) {
    const response = await worker.fetch(request(valid, { Origin: bad }), env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(calls.length, 0);
});

test('preflight permits only intended methods and header without credentials', async () => {
  const { env } = setup();
  const response = await worker.fetch(request(valid, {}, 'OPTIONS'), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
});

test('rejects honeypot, invalid fields, header injection, and oversized token', async () => {
  const { calls, env } = setup();
  const invalid = [
    { ...valid, website: 'spam' }, { ...valid, name: 'Bad\r\nBcc: spam' },
    { ...valid, email: 'x@example.com\r\nBcc: spam' }, { ...valid, message: '' },
    { ...valid, turnstileToken: 'x'.repeat(2049) }
  ];
  for (const data of invalid) assert.equal((await worker.fetch(request(data), env)).status, 400);
  assert.equal(calls.length, 0);
});

test('bounds streamed body without Content-Length', async () => {
  const { calls, env } = setup();
  const large = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(21000))); controller.close(); } });
  const req = new Request('https://api.example.com/contact', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
    body: large, duplex: 'half'
  });
  assert.equal((await worker.fetch(req, env)).status, 413);
  assert.equal(calls.length, 0);
});

test('rejects malformed UTF-8 without contacting upstream services', async () => {
  const { calls, env } = setup();
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([0x7b, 0xff, 0x7d])); controller.close(); } });
  const req = new Request('https://api.example.com/contact', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
    body, duplex: 'half'
  });
  assert.equal((await worker.fetch(req, env)).status, 400);
  assert.equal(calls.length, 0);
});

test('accepts a 120-character name and rejects a longer name', async () => {
  const { env } = setup();
  assert.equal((await worker.fetch(request({ ...valid, name: 'A'.repeat(120) }), env)).status, 200);
  assert.equal((await worker.fetch(request({ ...valid, name: 'A'.repeat(121) }), env)).status, 400);
});

test('fails closed when rate limited or missing client IP or secrets', async () => {
  const { calls, env } = setup({ limited: true });
  assert.equal((await worker.fetch(request(), env)).status, 429);
  assert.equal((await worker.fetch(request(valid, { 'CF-Connecting-IP': '' }), env)).status, 403);
  assert.equal((await worker.fetch(request(), { ...env, RESEND_API_KEY: undefined })).status, 503);
  assert.equal(calls.length, 0);
});

test('fails closed when the rate-limit binding errors', async () => {
  const { calls, env } = setup();
  env.CONTACT_RATE_LIMIT.limit = async () => { throw new Error('binding unavailable'); };
  assert.equal((await worker.fetch(request(), env)).status, 503);
  assert.equal(calls.length, 0);
});

test('rejects failed, replayed, wrong-action, and wrong-hostname challenges', async () => {
  for (const challenge of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'superthoughts.com', action: 'newsletter' },
    { success: true, hostname: 'evil.example', action: 'superthoughts-contact' }
  ]) {
    const { calls, env } = setup({ challenge });
    assert.equal((await worker.fetch(request(), env)).status, 400);
    assert.equal(calls.length, 1);
  }
});

test('returns failure when provider rejects or omits id', async () => {
  for (const provider of [{}, { id: '' }]) {
    const { env } = setup({ provider });
    assert.equal((await worker.fetch(request(), env)).status, 502);
  }
});
