import test from 'node:test';
import assert from 'node:assert/strict';
import { createListeningAnalytics } from '../pilot-analytics-core.mjs';
import { createAnalyticsController, canonicalPageUrl, sanitizedReferrer, approvedCampaign } from '../pilot-analytics.js';

class Audio extends EventTarget {
  src = 'https://example.test/audio/a.mp3';
  currentSrc = this.src;
  currentTime = 0;
  duration = 100;
  playbackRate = 1;
  paused = true;
  ended = false;
  fire(type) { this.dispatchEvent(new Event(type)); }
}
const catalog = [{ id: 'a', title: 'A', category: 'reset', type: 'guided', duration: 100, src: 'audio/a.mp3' }];
function harness() {
  const audio = new Audio();
  const events = [];
  let now = 0;
  const tracker = createListeningAnalytics({ audio, catalog, baseUrl: 'https://example.test/', now: () => now, emit: (name, params) => events.push({ name, params }) });
  const advance = seconds => { now += seconds * 1000; audio.currentTime += seconds; audio.fire('timeupdate'); };
  const play = () => { audio.paused = false; audio.fire('playing'); };
  const pause = () => { audio.paused = true; audio.fire('pause'); };
  return { audio, events, tracker, advance, play, pause };
}

test('consent gate on tracker sends nothing before enable or after disable', () => {
  const h = harness();
  h.play(); h.advance(30); h.pause();
  assert.equal(h.events.length, 0);
  h.tracker.enable(); h.play(); h.advance(10); h.pause();
  assert.equal(h.events.filter(e => e.name === 'listen_start').length, 1);
  h.tracker.disable(); h.play(); h.advance(40); h.pause();
  assert.equal(h.events.filter(e => e.name === 'listen_time').length, 1);
  assert.equal(h.events.find(e => e.name === 'listen_time').params.listening_seconds, 10);
});

test('seeks, stalls and pauses do not earn coverage; time deltas do not double count', () => {
  const h = harness();
  h.tracker.enable(); h.play(); h.advance(20); h.pause();
  h.audio.currentTime = 90; h.audio.fire('seeking'); h.audio.fire('seeked');
  h.play(); h.advance(5); h.audio.fire('waiting');
  h.audio.currentTime += 10; // simulated clock progression without playback
  h.audio.fire('timeupdate');
  h.audio.fire('canplay'); h.play(); h.advance(5); h.pause();
  assert.equal(h.tracker.snapshot().playedSeconds, 30);
  assert.equal(h.events.some(e => e.name === 'listen_complete'), false);
  assert.deepEqual(h.events.filter(e => e.name === 'listen_milestone').map(e => e.params.milestone_percent), [25]);
  assert.equal(h.events.filter(e => e.name === 'listen_time').reduce((sum, e) => sum + e.params.listening_seconds, 0), 30);
});

test('milestones and completion require unique listened coverage and emit once', () => {
  const h = harness(); h.tracker.enable(); h.play();
  h.advance(30); h.advance(30); h.advance(30); h.advance(10); h.pause();
  assert.deepEqual(h.events.filter(e => e.name === 'listen_milestone').map(e => e.params.milestone_percent), [25, 50, 75]);
  assert.equal(h.events.filter(e => e.name === 'listen_complete').length, 1);
  assert.equal(h.events.filter(e => e.name === 'listen_time').reduce((sum, e) => sum + e.params.listening_seconds, 0), 100);
  h.audio.currentTime = 0; h.audio.fire('seeking'); h.audio.fire('seeked'); h.play(); h.advance(30); h.pause();
  assert.equal(h.events.filter(e => e.name === 'listen_complete').length, 1);
  assert.equal(h.events.filter(e => e.name === 'listen_start').length, 1);
  assert.equal(h.events.filter(e => e.name === 'listen_time').reduce((sum, e) => sum + e.params.listening_seconds, 0), 130);
});

class Element extends EventTarget {
  children = [];
  dataset = {};
  hidden = false;
  append(...children) { this.children.push(...children); }
  remove() { this.removed = true; }
  focus() {}
  setAttribute() {}
  set innerHTML(value) {
    this._html = value;
    if (value.includes('data-choice')) {
      this.buttons = ['granted', 'denied'].map(choice => { const button = new Element(); button.dataset.choice = choice; return button; });
    }
  }
  querySelectorAll(selector) { return selector === '[data-choice]' ? this.buttons || [] : []; }
  querySelector(selector) { return selector === 'button' ? this.buttons?.[0] : null; }
}
function browserHarness(gpc = false, existingButton = false, href = 'https://example.test/session.html?session=secret', withAudio = false) {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const head = new Element(), body = new Element();
  const existing = existingButton ? new Element() : null;
  const audio = withAudio ? new Audio() : null;
  const doc = {
    head, body, baseURI: href, title: 'A · Superthoughts', referrer: 'https://search.test/search?q=private',
    cookie: '', createElement: () => new Element(), getElementById: id => id === 'pilot-audio' ? audio : null, querySelector: () => null, querySelectorAll: selector => selector === '[data-analytics-settings]' && existing ? [existing] : []
  };
  const win = new EventTarget();
  win.location = { href, hostname: 'example.test' };
  win.performance = { now: () => 0 };
  win.navigator = { globalPrivacyControl: gpc };
  const controller = createAnalyticsController({ win, doc, storage, catalog });
  return { controller, win, doc, head, body, storage, existing, audio };
}

test('no Google script or transmission before explicit opt-in; decline remains silent', () => {
  const h = browserHarness();
  assert.equal(h.head.children.filter(e => e.src?.includes('googletagmanager')).length, 0);
  assert.equal(h.win.dataLayer, undefined);
  h.controller.setPreference('denied');
  assert.equal(h.head.children.filter(e => e.src?.includes('googletagmanager')).length, 0);
  assert.equal(h.win.dataLayer, undefined);
  h.controller.setPreference('granted');
  const script = h.head.children.find(e => e.src?.includes('googletagmanager'));
  assert.ok(script);
  assert.equal(h.win.dataLayer.filter(args => args[0] === 'event').length, 0);
  script.dispatchEvent(new Event('load'));
  assert.equal(h.win.dataLayer.filter(args => args[0] === 'event' && args[1] === 'page_view').length, 1);
  const page = h.win.dataLayer.find(args => args[0] === 'event' && args[1] === 'page_view')[2];
  assert.equal(page.page_location, 'https://example.test/session.html');
  assert.equal(page.page_referrer, 'https://search.test');
});

test('withdrawal disables tag and updates consent; GPC starts declined', () => {
  const h = browserHarness(true);
  assert.equal(h.controller.preference, 'denied');
  assert.equal(h.head.children.filter(e => e.src?.includes('googletagmanager')).length, 0);
  h.controller.setPreference('granted');
  h.head.children.find(e => e.src?.includes('googletagmanager')).dispatchEvent(new Event('load'));
  h.controller.setPreference('denied');
  assert.equal(h.win['ga-disable-G-93YX918L19'], true);
  assert.equal(h.win.dataLayer.at(-1)[0], 'consent');
  assert.equal(h.win.dataLayer.at(-1)[2].analytics_storage, 'denied');
  assert.equal(h.storage.getItem('st_analytics_consent_v1'), 'denied');
});

test('canonical URLs and referrers strip queries, fragments, and cross-site paths', () => {
  assert.equal(canonicalPageUrl('https://example.test/practice.html?practice=reset#x'), 'https://example.test/practice.html');
  assert.equal(sanitizedReferrer('https://example.test/index.html?token=secret', 'https://example.test/session.html'), 'https://example.test/index.html');
  assert.equal(sanitizedReferrer('https://external.test/private/path?token=secret', 'https://example.test/session.html'), 'https://external.test');
});

test('only exact approved YouTube campaign bundles survive; no other query data is copied', () => {
  const prefix = 'https://example.test/session.html?session=reset&private=secret&utm_source=youtube&utm_medium=organic_video';
  for (const content of ['reset_full', 'begin_day_full', 'whole_body_full', 'reset_short', 'begin_day_short', 'whole_body_short']) {
    const medium = content.endsWith('_short') ? 'organic_short' : 'organic_video';
    const url = `${prefix.replace('organic_video', medium)}&utm_campaign=pilot_launch_three&utm_content=${content}`;
    assert.deepEqual(approvedCampaign(url), {
      campaign_source: 'youtube', campaign_medium: medium,
      campaign_name: 'pilot_launch_three', campaign_content: content
    });
  }
  assert.equal(approvedCampaign('https://example.test/?utm_source=youtube&utm_medium=organic_video&utm_campaign=channel_relaunch&utm_content=profile').campaign_content, 'profile');
  assert.equal(approvedCampaign(`${prefix}&utm_campaign=relaunch_8wk&utm_content=w01_reset`).campaign_content, 'w01_reset');
  for (const unsafe of [
    `${prefix}&utm_campaign=pilot_launch_three&utm_content=unknown`,
    `${prefix}&utm_campaign=pilot_launch_three&utm_content=reset_short`,
    `${prefix.replace('organic_video', 'organic_short')}&utm_campaign=pilot_launch_three&utm_content=reset_full`,
    `${prefix.replace('organic_video', 'organic_short')}&utm_campaign=pilot_launch_three&utm_content=reset_short%40private.test`,
    `${prefix.replace('organic_video', 'organic_short')}&utm_campaign=pilot_launch_three&utm_content=reset_short&utm_content=secret`,
    `${prefix}&utm_campaign=channel_relaunch&utm_content=reset_short`,
    `${prefix.replace('utm_source=youtube', 'utm_source=other')}&utm_campaign=pilot_launch_three&utm_content=reset_short`,
    `${prefix.replace('utm_medium=organic_video', 'utm_medium=email')}&utm_campaign=pilot_launch_three&utm_content=reset_short`
  ]) assert.deepEqual(approvedCampaign(unsafe), {});
});

test('consent panel privacy link resolves from nested session pages', () => {
  const h = browserHarness(false, false, 'https://example.test/sessions/reset/');
  const panel = h.body.children.find(child => child.className === 'analytics-choice');
  assert.ok(panel._html.includes('href="/privacy.html"'));
});

test('consented page and listening events carry approved campaign fields with path-only location', () => {
  const href = 'https://example.test/session.html?session=a&private=secret&utm_source=youtube&utm_medium=organic_video&utm_campaign=pilot_launch_three&utm_content=reset_full';
  const h = browserHarness(false, false, href, true);
  assert.equal(h.win.dataLayer, undefined);
  h.controller.setPreference('granted');
  const script = h.head.children.find(e => e.src?.includes('googletagmanager'));
  script.dispatchEvent(new Event('load'));
  h.audio.paused = false;
  h.audio.fire('playing');
  const config = h.win.dataLayer.find(args => args[0] === 'config')[2];
  const events = h.win.dataLayer.filter(args => args[0] === 'event').map(args => args[2]);
  assert.deepEqual(events.map(event => event.page_location), ['https://example.test/session.html', 'https://example.test/session.html']);
  for (const params of [config, ...events]) {
    assert.equal(params.campaign_source, 'youtube');
    assert.equal(params.campaign_medium, 'organic_video');
    assert.equal(params.campaign_name, 'pilot_launch_three');
    assert.equal(params.campaign_content, 'reset_full');
    assert.equal(JSON.stringify(params).includes('secret'), false);
  }
});

test('existing settings control reopens hidden choices; withdrawal before script load sends no page view', () => {
  const h = browserHarness(false, true);
  assert.equal(h.body.children.length, 1); // choice panel only; no extra floating control
  const panel = h.body.children[0];
  assert.equal(panel.hidden, false);
  h.controller.setPreference('denied');
  assert.equal(panel.hidden, true);
  h.existing.dispatchEvent(new Event('click'));
  assert.equal(panel.hidden, false);
  h.controller.setPreference('granted');
  const script = h.head.children.find(e => e.src?.includes('googletagmanager'));
  h.controller.setPreference('denied');
  script.dispatchEvent(new Event('load'));
  assert.equal(h.win.dataLayer.filter(args => args[0] === 'event').length, 0);
  assert.equal(h.win['ga-disable-G-93YX918L19'], true);
});

test('sleep launch links are attributed only with their matching medium', async () => {
  const { approvedCampaign } = await import('../pilot-analytics.js');
  const base = 'https://example.test/sessions/letting-go-into-sleep/?utm_source=youtube';
  assert.equal(approvedCampaign(`${base}&utm_medium=organic_video&utm_campaign=sleep_launch&utm_content=letting_go_full`).campaign_content, 'letting_go_full');
  assert.equal(approvedCampaign(`${base}&utm_medium=organic_short&utm_campaign=sleep_launch&utm_content=letting_go_short`).campaign_content, 'letting_go_short');
  assert.deepEqual(approvedCampaign(`${base}&utm_medium=organic_short&utm_campaign=sleep_launch&utm_content=letting_go_full`), {});
});

test('abundance launch links are attributed only with their matching medium', async () => {
  const { approvedCampaign } = await import('../pilot-analytics.js');
  const base = 'https://example.test/sessions/frequency-of-abundance/?utm_source=youtube';
  assert.equal(approvedCampaign(`${base}&utm_medium=organic_video&utm_campaign=abundance_launch&utm_content=abundance_full`).campaign_content, 'abundance_full');
  assert.equal(approvedCampaign(`${base}&utm_medium=organic_short&utm_campaign=abundance_launch&utm_content=abundance_short`).campaign_content, 'abundance_short');
  assert.deepEqual(approvedCampaign(`${base}&utm_medium=organic_video&utm_campaign=abundance_launch&utm_content=abundance_short`), {});
});
