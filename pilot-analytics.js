import { createListeningAnalytics } from './pilot-analytics-core.mjs';

const MEASUREMENT_ID = 'G-93YX918L19';
const CONSENT_KEY = 'st_analytics_consent_v1';
const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
const GRANTED = { ...DENIED, analytics_storage: 'granted' };
const APPROVED_CAMPAIGNS = {
  channel_relaunch: new Set(['profile']),
  relaunch_8wk: new Set(['w01_reset']),
  pilot_launch_three: new Set([
    'reset_full', 'begin_day_full', 'whole_body_full',
    'reset_short', 'begin_day_short', 'whole_body_short'
  ]),
  sleep_launch: new Set(['letting_go_full', 'letting_go_short']),
  abundance_launch: new Set(['abundance_full', 'abundance_short'])
};

export function canonicalPageUrl(raw, base = raw) {
  try { const url = new URL(raw, base); return `${url.origin}${url.pathname}`; } catch { return ''; }
}
export function sanitizedReferrer(raw, current = raw) {
  try {
    const ref = new URL(raw), here = new URL(current);
    if (!['http:', 'https:'].includes(ref.protocol)) return '';
    return ref.origin === here.origin ? canonicalPageUrl(ref.href) : ref.origin;
  } catch { return ''; }
}
export function approvedCampaign(raw, base = raw) {
  try {
    const query = new URL(raw, base).searchParams;
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    if (keys.some(key => query.getAll(key).length !== 1)) return {};
    const [source, medium, name, content] = keys.map(key => query.get(key));
    if (source !== 'youtube' || !APPROVED_CAMPAIGNS[name]?.has(content) ||
        medium !== (content.endsWith('_short') ? 'organic_short' : 'organic_video')) return {};
    return {
      campaign_source: source,
      campaign_medium: medium,
      campaign_name: name,
      campaign_content: content
    };
  } catch { return {}; }
}

export function createAnalyticsController({ win = window, doc = document, storage = null, catalog = win.STCatalog || [] } = {}) {
  if (storage === null) { try { storage = win.localStorage; } catch {} }
  let preference = null;
  try { const stored = storage?.getItem(CONSENT_KEY); if (stored === 'granted' || stored === 'denied') preference = stored; } catch {}
  const gpcOverride = win.navigator?.globalPrivacyControl === true;
  if (gpcOverride) { preference = 'denied'; try { storage?.setItem(CONSENT_KEY, 'denied'); } catch {} }
  let tagReady = false;
  let script = null;
  let pendingEvents = [];
  let tracker = null;
  let destroyed = false;
  const pageLocation = canonicalPageUrl(win.location.href);
  const pageReferrer = sanitizedReferrer(doc.referrer, win.location.href);
  const campaign = approvedCampaign(win.location.href);
  const pageParams = { page_location: pageLocation, page_referrer: pageReferrer, ...campaign };
  function gtag() { win.dataLayer = win.dataLayer || []; win.dataLayer.push(arguments); }
  const isGranted = () => preference === 'granted' && !destroyed;
  const sendEvent = (name, params) => {
    if (!isGranted()) return;
    const event = [name, { ...params, send_to: MEASUREMENT_ID, ...pageParams }];
    if (!tagReady) { if (pendingEvents.length < 32) pendingEvents.push(event); return; }
    gtag('event', ...event);
  };
  const audio = doc.getElementById('pilot-audio');
  if (audio) tracker = createListeningAnalytics({ audio, catalog, baseUrl: doc.baseURI, now: () => win.performance.now(), emit: sendEvent });
  const clearGaCookies = () => {
    try {
      const names = doc.cookie.split(';').map(part => part.trim().split('=')[0]).filter(name => /^(_ga|_gid|_gat)(_|$)/.test(name));
      const host = win.location.hostname;
      for (const name of names) {
        for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) doc.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain}`;
      }
    } catch {}
  };
  if (gpcOverride) { win[`ga-disable-${MEASUREMENT_ID}`] = true; clearGaCookies(); }
  const configureTag = () => {
    if (!isGranted() || tagReady) return;
    win[`ga-disable-${MEASUREMENT_ID}`] = false;
    gtag('consent', 'update', GRANTED);
    gtag('set', { allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true, ...pageParams });
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...pageParams
    });
    tagReady = true;
    gtag('event', 'page_view', { send_to: MEASUREMENT_ID, ...pageParams, page_title: doc.title });
    for (const [name, params] of pendingEvents) gtag('event', name, params);
    pendingEvents = [];
  };
  const loadTag = () => {
    if (!isGranted() || tagReady || script) return;
    // Consent defaults to denied before the tag is requested; no denied-consent ping is sent.
    gtag('consent', 'default', DENIED);
    script = doc.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    const loadingScript = script;
    script.addEventListener('load', () => { if (script === loadingScript) configureTag(); }, { once: true });
    script.addEventListener('error', () => { script = null; pendingEvents = []; }, { once: true });
    doc.head.append(script);
  };
  const setPreference = choice => {
    if (destroyed || !['granted', 'denied'].includes(choice)) return;
    const previous = preference;
    const withdrawing = previous === 'granted' && choice === 'denied';
    preference = choice;
    try { storage?.setItem(CONSENT_KEY, choice); } catch {}
    if (choice === 'granted') {
      tracker?.enable();
      if (script && !tagReady) { render(); return; }
      if (tagReady) { win[`ga-disable-${MEASUREMENT_ID}`] = false; gtag('consent', 'update', GRANTED); if (previous !== 'granted') gtag('event', 'page_view', { send_to: MEASUREMENT_ID, ...pageParams, page_title: doc.title }); }
      else loadTag();
    } else {
      tracker?.disable();
      pendingEvents = [];
      if (withdrawing || tagReady) {
        win[`ga-disable-${MEASUREMENT_ID}`] = true;
        gtag('consent', 'update', DENIED);
        clearGaCookies();
      }
      if (script && !tagReady) { script.remove(); script = null; }
    }
    render();
  };

  const style = doc.createElement('style');
  style.textContent = `
    .analytics-choice[hidden]{display:none!important}
    .analytics-choice{position:fixed;inset:auto 16px 16px;z-index:100;max-width:430px;padding:22px;background:#222a26;color:#f6f0e6;border:1px solid #738173;box-shadow:0 12px 40px #0009;font:14px/1.5 system-ui,sans-serif}
    .analytics-choice h2{font-size:19px;line-height:1.25;margin:0 0 9px;font-weight:600}
    .analytics-choice p{margin:0 0 17px;color:#d7ddd3}
    .analytics-choice-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .analytics-choice button,.analytics-settings-button{min-height:44px;padding:9px 14px;border:1px solid #b8c9b6;border-radius:4px;background:#dce8d8;color:#172019;font:600 13px system-ui,sans-serif;cursor:pointer}
    .analytics-choice button[data-choice="denied"]{background:transparent;color:#f6f0e6}
    .analytics-choice button:focus-visible,.analytics-settings-button:focus-visible{outline:2px solid #f6d09e;outline-offset:3px}
    .analytics-settings-button{position:fixed;bottom:12px;left:12px;z-index:80;min-height:36px;padding:6px 10px;background:#222a26;color:#f6f0e6;font-weight:400;font-size:11px}
    .session-toolbar .analytics-settings-button{position:static;min-height:0;background:#101916aa;color:#f6f0e6}
    @media(max-width:520px){.analytics-choice{left:10px;right:10px;bottom:55px;max-width:none}.analytics-settings-button{bottom:9px;left:9px}}
  `;
  doc.head.append(style);
  const panel = doc.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Analytics preference');
  panel.innerHTML = '<h2>Help improve this listening space?</h2><p>With your choice, Google Analytics measures page visits and how much of each session is actually heard. You can listen without analytics and change this choice anytime. <a href="/privacy.html">Privacy details</a></p><div class="analytics-choice-actions"><button type="button" data-choice="granted">Accept analytics</button><button type="button" data-choice="denied">Decline analytics</button></div>';
  const existingSettings = [...doc.querySelectorAll('[data-analytics-settings]')];
  const settings = existingSettings[0] || doc.createElement('button');
  const generatedSettings = existingSettings.length === 0;
  if (generatedSettings) {
    settings.type = 'button';
    settings.className = 'analytics-settings-button';
    settings.textContent = 'Privacy choices';
    settings.setAttribute('aria-label', 'Change analytics preference');
    const toolbar = doc.querySelector('.session-toolbar');
    (toolbar || doc.body).append(settings);
  }
  doc.body.append(panel);
  const render = () => { panel.hidden = preference !== null; };
  const open = () => { panel.hidden = false; panel.querySelector('button')?.focus(); };
  for (const button of existingSettings.length ? existingSettings : [settings]) button.addEventListener('click', open);
  for (const button of panel.querySelectorAll('[data-choice]')) button.addEventListener('click', () => {
    setPreference(button.dataset.choice);
    const returnTo = doc.body.classList?.contains('page-session') ? doc.getElementById('session-back') : settings;
    returnTo?.focus();
  });
  render();
  if (preference === 'granted') { tracker?.enable(); loadTag(); }
  const pagehide = () => tracker?.flush();
  win.addEventListener('pagehide', pagehide);
  return {
    get preference() { return preference; },
    setPreference,
    open,
    destroy() { if (destroyed) return; tracker?.destroy(); destroyed = true; win.removeEventListener('pagehide', pagehide); panel.remove(); if (generatedSettings) settings.remove(); style.remove(); },
    tracker
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') createAnalyticsController();
