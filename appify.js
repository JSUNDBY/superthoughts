/* "Keep it on your phone": shows how to add Superthoughts to the home screen.
   Fills any <section data-appify>. Hidden when already opened as an app. */
(() => {
  const mount = document.querySelector('[data-appify]');
  if (!mount) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;

  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|LinkedInApp/.test(ua);
  const iosSafari = ios && !inApp && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const safariMajor = +((ua.match(/Version\/(\d+)/) || [])[1] || 0);
  const android = /Android/.test(ua);
  const macSafari = !ios && /Macintosh/.test(ua) && /Version\/\d+.*Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);

  const badges = ['3', '12', '1', '47', '8', '', '99+', '2', '5', '21', '6', '14'];
  const tiles = badges.map((b, i) => b
    ? `<span class="app-tile" style="--i:${i}"><b>${b}</b></span>`
    : `<span class="app-tile is-ours"><img src="/images/app-icon-180.png" alt="" width="60" height="60"></span>`).join('');

  const ol = items => `<ol class="app-steps">${items.map(s => `<li>${s}</li>`).join('')}</ol>`;
  let how;
  if (inApp) how = `<p class="app-how">You are inside another app's browser, which can't do this. Tap <strong>···</strong> and choose <strong>Open in browser</strong>, then come back to this spot.</p>`;
  else if (iosSafari && ipad) how = ol(['Tap <strong>Share</strong> at the top of Safari.', 'Tap <strong>Add to Home Screen</strong>.']);
  else if (iosSafari && safariMajor >= 26) how = ol(['Tap <strong>···</strong> beside the address bar.', 'Tap <strong>Share</strong>.', 'Scroll down and tap <strong>Add to Home Screen</strong>. Leave <strong>Open as Web App</strong> on.']);
  else if (iosSafari) how = ol(['Tap <strong>Share</strong>, the square with an arrow, at the bottom of Safari.', 'Scroll down and tap <strong>Add to Home Screen</strong>.']);
  else if (ios) how = ol(['Tap <strong>Share</strong> in your browser.', 'Tap <strong>Add to Home Screen</strong>.']);
  else if (android) how = ol(['Open your browser menu (<strong>⋮</strong>).', 'Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.']);
  else if (macSafari) how = ol(['In the menu bar, choose <strong>File</strong>.', 'Choose <strong>Add to Dock</strong>.']);
  else how = `<p class="app-how">Open superthoughts.com on your phone, and this spot will show you how.</p>`;

  mount.innerHTML = `<div class="th-wrap app-grid">
    <div class="app-copy">
      <p class="th-label">On your phone</p>
      <h2 id="app-title">The one app that will never buzz.</h2>
      <p class="intro">Superthoughts can live on your home screen and open full screen, like an app. No app store, nothing to update. It will never send you a notification.</p>
      <button class="app-install" type="button" hidden>Add to home screen</button>
      <div class="app-manual">${how}</div>
    </div>
    <figure class="app-phone-wrap">
      <div class="app-phone" aria-hidden="true"><div class="app-screen">${tiles}</div></div>
      <figcaption><button class="app-hush" type="button" aria-pressed="false">Quiet the others</button><span class="app-after" aria-live="polite"></span></figcaption>
    </figure>
  </div>`;
  mount.hidden = false;

  const hush = mount.querySelector('.app-hush');
  const after = mount.querySelector('.app-after');
  hush.addEventListener('click', () => {
    const on = mount.classList.toggle('is-hushed');
    hush.setAttribute('aria-pressed', String(on));
    hush.textContent = on ? 'Let them back in' : 'Quiet the others';
    after.textContent = on ? 'There. That is the whole idea.' : '';
  });

  let prompt = null;
  const install = mount.querySelector('.app-install');
  const manual = mount.querySelector('.app-manual');
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); prompt = e;
    install.hidden = false; manual.hidden = true;
  });
  install.addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    prompt = null; install.hidden = true;
    if (outcome !== 'accepted') manual.hidden = false;
  });
  addEventListener('appinstalled', () => {
    install.hidden = true; manual.hidden = true;
    after.textContent = 'It is on your home screen now.';
  });
})();
