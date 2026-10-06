(() => {
  const form = document.getElementById('contact-form');
  const unavailable = document.getElementById('contact-unavailable');
  const status = document.getElementById('contact-status');
  const submit = document.getElementById('contact-submit');
  const widget = document.getElementById('contact-turnstile');
  const endpoint = document.querySelector('meta[name="contact-endpoint"]')?.content.trim();
  const sitekey = document.querySelector('meta[name="turnstile-sitekey"]')?.content.trim();
  if (!form || !unavailable || !status || !submit || !widget) return;
  if (!endpoint || !sitekey) { unavailable.hidden = false; return; }

  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint, location.href);
    if (!['http:', 'https:'].includes(endpointUrl.protocol) || !(endpointUrl.origin === location.origin || endpointUrl.href === 'https://superthoughts-contact.j-sundby.workers.dev/contact')) throw new Error('Invalid endpoint');
  } catch { unavailable.hidden = false; return; }

  const fields = {
    name: document.getElementById('contact-name'),
    email: document.getElementById('contact-email'),
    message: document.getElementById('contact-message')
  };
  const errors = {
    name: document.getElementById('contact-name-error'),
    email: document.getElementById('contact-email-error'),
    message: document.getElementById('contact-message-error')
  };
  if (Object.values(fields).some(field => !field) || Object.values(errors).some(error => !error)) { unavailable.hidden = false; return; }
  let widgetId = null;
  let sending = false;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.setAttribute('role', isError ? 'alert' : 'status');
  }
  function setError(key, message) {
    fields[key].setAttribute('aria-invalid', message ? 'true' : 'false');
    errors[key].textContent = message;
    errors[key].hidden = !message;
  }
  function validate() {
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const message = fields.message.value.trim();
    setError('name', !name ? 'Please enter your name.' : name.length > 120 ? 'Please use 120 characters or fewer.' : '');
    setError('email', !email ? 'Please enter your email address.' : !fields.email.validity.valid ? 'Please enter a valid email address.' : '');
    setError('message', !message ? 'Please write a message.' : message.length > 5000 ? 'Please use 5,000 characters or fewer.' : '');
    const firstInvalid = Object.keys(fields).find(key => fields[key].getAttribute('aria-invalid') === 'true');
    if (firstInvalid) { setStatus('Please check the highlighted fields.', true); fields[firstInvalid].focus(); return null; }
    return { name, email, message };
  }
  for (const [key, field] of Object.entries(fields)) field.addEventListener('input', () => {
    if (field.getAttribute('aria-invalid') === 'true') setError(key, '');
  });

  const turnstileScript = document.createElement('script');
  turnstileScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  turnstileScript.async = true;
  turnstileScript.defer = true;
  turnstileScript.addEventListener('load', () => {
    if (!window.turnstile) { unavailable.hidden = false; return; }
    try {
      widgetId = window.turnstile.render(widget, { sitekey, theme: 'dark', action: 'superthoughts-contact', size: matchMedia('(max-width: 374px)').matches ? 'compact' : 'normal' });
      form.hidden = false;
    } catch { unavailable.hidden = false; }
  }, { once: true });
  turnstileScript.addEventListener('error', () => { unavailable.hidden = false; }, { once: true });
  document.head.append(turnstileScript);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const values = validate();
    if (!values) return;
    const token = widgetId === null ? '' : window.turnstile?.getResponse(widgetId);
    if (!token) { setStatus('Please complete the bot check before sending.', true); return; }
    sending = true;
    submit.disabled = true;
    submit.textContent = 'Sending';
    setStatus('Sending your message.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpointUrl.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ...values, website: document.getElementById('contact-website').value, turnstileToken: token }),
        credentials: 'omit',
        signal: controller.signal
      });
      let result = null;
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) result = await response.json();
      if (response.ok && result?.ok === true) {
        form.reset();
        for (const key of Object.keys(fields)) setError(key, '');
        window.turnstile?.reset(widgetId);
        setStatus('Thanks for writing. Your message was submitted.');
      } else {
        setStatus(response.status === 429
          ? 'Too many messages were sent recently. Please wait and try again, or email josh@superthoughts.com.'
          : 'Your message could not be sent. Please try again, or email josh@superthoughts.com.', true);
        window.turnstile?.reset(widgetId);
      }
    } catch (error) {
      setStatus(error?.name === 'AbortError'
        ? 'We could not confirm whether your message was sent. Please wait before retrying, or email josh@superthoughts.com.'
        : 'Your message could not be sent. Check your connection and try again, or email josh@superthoughts.com.', true);
      window.turnstile?.reset(widgetId);
    } finally {
      clearTimeout(timeout);
      sending = false;
      submit.disabled = false;
      submit.textContent = 'Send message';
    }
  });
})();
