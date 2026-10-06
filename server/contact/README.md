# Superthoughts contact Worker

`POST /contact` accepts the frontend JSON fields `name`, `email`, `message`, `website` (empty honeypot), and `turnstileToken`. It sends plain text through Resend from `hello@superthoughts.com` to fixed `josh@superthoughts.com`, with the validated visitor address as Reply-To. Successful response means Resend returned a nonempty email ID; it does not prove inbox delivery.

Controls: exact-origin CORS for `https://superthoughts.com` and `https://www.superthoughts.com` without credentials, per-IP Cloudflare rate limit (five requests per 60 seconds), 20 KiB streamed request cap, field validation, honeypot, server-side Turnstile validation of success, action, and hostname, eight-second upstream timeouts, and no content or IP logging. Error responses disclose only generic codes. The rate limit is local to each Cloudflare location, so it is a spam reduction measure rather than a global quota.

## Verification

Run `npm test` and `npm run check` in this directory. These tests mock outbound fetch and do not contact Turnstile or Resend.

## Deployment and verification

1. Confirm `hello@superthoughts.com` is a verified sender in Resend and that mail to `josh@superthoughts.com` can be received.
2. Create a Turnstile widget for both `superthoughts.com` and `www.superthoughts.com`; configure the frontend site key and action `superthoughts-contact`.
3. Set `RESEND_API_KEY` and `TURNSTILE_SECRET` as Cloudflare Worker secrets. Never commit either secret or a `.dev.vars` file.
4. Review the Worker route/domain and deploy only with explicit release authorization. Set the frontend endpoint to that deployed Worker URL. The authorized deployment uses `https://superthoughts-contact.j-sundby.workers.dev/contact` with preview URLs disabled.
   The contact-specific rate-limit namespace is `638947021`.
5. Exercise one real form submission and verify receipt, then test invalid token, duplicate token, throttling, and mobile layout in the actual deployed environment. Local mocks cannot verify external service configuration or inbox delivery.
