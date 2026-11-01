import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyticsRuntime } from '../site/src/lib/analytics-runtime.mjs';
import { browserAnalyticsConfig, tokenFingerprint } from '../scripts/analytics-config.mjs';
const contract = JSON.parse(readFileSync('.posthog-events.json', 'utf8'));
const events = Object.fromEntries(contract.events.map(e => [e.event_name, e.properties]));
function browser(overrides = {}) {
  const storage = new Map(); const scripts = []; const listeners = {};
  return Object.assign({
    location: new URL('https://awesome.pawel.in/search/?utm_source=github&email=private@example.com#q=PRIVATE_MARKER'),
    navigator: {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    document: { createElement: () => ({}), head: { appendChild: script => scripts.push(script) } },
    addEventListener: (name, callback) => { listeners[name] = callback; }, storage, scripts, listeners,
  }, overrides);
}
const settings = { enabled: true, apiKey: 'test-token', apiHost: 'https://a.awesome.pawel.in', uiHost: 'https://us.posthog.com', release: 'test', replayEnabled: true, errorsEnabled: true, events };

test('Trending routes preserve page context while unknown filters stay sanitized', () => {
  for (const pathname of ['/trending/', '/trending/weekly/cpp/']) {
    const api = analyticsRuntime(settings, browser({ location: new URL('https://awesome.pawel.in' + pathname) }));
    assert.equal(api.context().page_type, 'trending');
    assert.equal(api.sanitizeUrl(pathname + '?q=private'), 'https://awesome.pawel.in' + pathname);
  }
  const api = analyticsRuntime(settings, browser({ location: new URL('https://awesome.pawel.in/trending/weekly/private/') }));
  assert.equal(api.context().page_type, 'not_found');
  assert.equal(api.sanitizeUrl('/trending/weekly/private/'), 'https://awesome.pawel.in/404.html');
});

test('preview, wrong host, privacy signals, opt-out and blocked storage load no SDK', () => {
  for (const win of [browser({ location: new URL('http://localhost/') }), browser({ navigator: { doNotTrack: '1' } }), browser({ navigator: { globalPrivacyControl: true } }), browser({ localStorage: { getItem() { throw Error('blocked'); } } })]) {
    const api = analyticsRuntime(settings, win); api.capture('theme_changed', { theme: 'dark' }); assert.equal(win.scripts.length, 0); assert.equal(win.posthog, undefined);
  }
  const win = browser(); win.storage.set('awesome-analytics-opt-out', 'true'); analyticsRuntime(settings, win); assert.equal(win.scripts.length, 0);
  const preview = browser(); analyticsRuntime({ ...settings, enabled: false }, preview); assert.equal(preview.scripts.length, 0);
});

test('document pageviews are explicit and filters do not register history-based pageviews', () => {
  const win = browser(); const api = analyticsRuntime(settings, win);
  assert.equal(api.config.capture_pageview, true); assert.equal(api.config.autocapture, false);
  assert.equal(api.config.persistence, 'localStorage'); assert.equal(api.config.person_profiles, 'never');
  assert.equal(win.scripts[0].src, 'https://a.awesome.pawel.in/static/array.js');
  assert.equal(win.posthog._i.length, 1);
});

test('typed capture drops unregistered fields, validates canonical identities and bounds the slow-SDK queue', () => {
  const win = browser(); const api = analyticsRuntime(settings, win);
  api.capture('resource_opened', { resource_key: 'Rust-Lang/Book', source: 'resource_card', query: 'PRIVATE_MARKER' });
  api.capture('resource_opened', { resource_key: 'Go', source: 'resource_card' });
  api.capture('invented_event', { query: 'PRIVATE_MARKER' });
  assert.equal(win.posthog.length, 1);
  const payload = win.posthog[0][2]; assert.equal(payload.resource_key, 'rust-lang/book');
  assert.equal(payload.actor_type, 'visitor'); assert.equal(payload.query, undefined);
  for (let i = 0; i < 200; i++) api.capture('theme_changed', { theme: 'dark' });
  assert.equal(win.posthog.length, 100);
});

test('sanitization removes search markers, fragments, credentials and personal URL parameters', () => {
  const api = analyticsRuntime(settings, browser());
  const sanitized = api.beforeSend({ event: 'resource_searched', properties: { $current_url: 'https://user:pass@awesome.pawel.in/?q=PRIVATE_MARKER&utm_source=github#q=PRIVATE_MARKER', $initial_current_url: 'https://awesome.pawel.in/#q=PRIVATE_MARKER', $session_entry_url: 'https://awesome.pawel.in/?email=PRIVATE_MARKER', $referrer: 'https://google.com/?q=PRIVATE_MARKER', '$exception_list': [{ exception_message: 'PRIVATE_MARKER', stacktrace: { frames: [{ filename: 'https://awesome.pawel.in/a.js?q=PRIVATE_MARKER' }] } }], email: 'PRIVATE_MARKER', has_query: true } });
  assert.ok(!JSON.stringify(sanitized).includes('PRIVATE_MARKER')); assert.ok(!JSON.stringify(sanitized).includes('user:pass'));
  assert.equal(sanitized.properties.has_query, true);
  assert.equal(sanitized.properties.$current_url, 'https://awesome.pawel.in/?utm_source=github');
  assert.equal(api.config.session_recording.maskAttributeFn('href', '/search/#q=PRIVATE_MARKER'), 'https://awesome.pawel.in/search/');
  assert.equal(api.config.session_recording.maskAttributeFn('data-query', 'PRIVATE_MARKER'), '[masked]');
});

test('replay is fully masked and deterministically samples about ten percent of sessions', () => {
  const win = browser(); const api = analyticsRuntime(settings, win);
  let callback; const decisions = [];
  api.config.loaded({ register() {}, onSessionId(fn) { callback = fn; }, startSessionRecording(options) { decisions.push(options.sampling); }, stopSessionRecording() { decisions.push(false); } });
  const ids = Array.from({ length: 10000 }, (_, i) => '018f86a0-' + i.toString(16).padStart(12, '0'));
  const count = ids.filter(id => api.sampleSession(id)).length;
  assert.ok(count > 800 && count < 1200, String(count));
  for (const id of ids.slice(0, 100)) { callback(id); callback(id); assert.equal(decisions.at(-1), decisions.at(-2)); }
  assert.equal(api.config.disable_session_recording, true);
  assert.equal(api.config.session_recording.maskAllInputs, true); assert.equal(api.config.session_recording.maskTextSelector, '*');
  assert.equal(api.config.session_recording.recordHeaders, false); assert.equal(api.config.session_recording.recordBody, false);
  assert.equal(api.config.session_recording.maskNetworkRequestFn({ url: 'private' }), null);
  assert.equal(api.config.enable_recording_console_log, false);
});

test('errors are sanitized and capture failures cannot break actions', () => {
  const win = browser(); const api = analyticsRuntime(settings, win);
  win.listeners.error({ message: 'PRIVATE_MARKER', error: new Error('PRIVATE_MARKER') });
  const event = win.posthog[0]; assert.equal(event[0], 'captureException'); assert.ok(!event[1].message.includes('PRIVATE_MARKER'));
  win.posthog.capture = () => { throw Error('SDK failure'); };
  assert.doesNotThrow(() => api.capture('theme_changed', { theme: 'light' }));
  api.optOut(); assert.equal(api.beforeSend({ event: '$pageview', properties: {} }), null);
});

test('related repositories retain the clicked key rather than the current detail-page key', () => {
  const api = analyticsRuntime(settings, browser({ location: new URL('https://awesome.pawel.in/repositories/golang/go/') }));
  const payload = api.beforeSend({ event: 'resource_selected', properties: { resource_key: 'avelino/awesome-go' } });
  assert.equal(payload.properties.resource_key, 'avelino/awesome-go');
});

test('production analytics needs only a project token and host, with an optional kill switch', () => {
  const env = { PRODUCTION: 'true', PUBLIC_POSTHOG_PROJECT_TOKEN: 'test', PUBLIC_POSTHOG_HOST: settings.apiHost };
  const config = browserAnalyticsConfig(env);
  assert.equal(config.enabled, true);
  assert.equal(config.apiKey, 'test');
  assert.equal(config.apiHost, settings.apiHost);
  assert.equal(config.replayEnabled, false);
  assert.equal(config.errorsEnabled, false);
  assert.equal(browserAnalyticsConfig({ ...env, PUBLIC_POSTHOG_HOST: 'https://custom.example.com/' }).apiHost, 'https://custom.example.com');
  for (const changed of [{ PUBLIC_POSTHOG_PROJECT_TOKEN: '' }, { PUBLIC_POSTHOG_HOST: '' }, { ANALYTICS_ENABLED: 'false' }, { PRODUCTION: 'false' }]) {
    const disabled = browserAnalyticsConfig({ ...env, ...changed });
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.apiKey, '');
  }
  for (const key of ['PUBLIC_POSTHOG_PROJECT_TOKEN', 'PUBLIC_POSTHOG_HOST']) {
    assert.throws(() => browserAnalyticsConfig({ ...env, ANALYTICS_ENABLED: 'true', [key]: '' }), /PostHog requires/);
  }
});

test('optional provisioning controls diagnostic products without blocking basic analytics', () => {
  const env = { PRODUCTION: 'true', PUBLIC_POSTHOG_PROJECT_TOKEN: 'test', PUBLIC_POSTHOG_HOST: settings.apiHost };
  const manifest = { target: { organization_id: 'org', project_id: 123, token_sha256: tokenFingerprint('test') }, controls: { verified: true, products: { analytics: true, replay: true, errors: true } } };
  assert.equal(browserAnalyticsConfig(env, manifest).replayEnabled, true);
  assert.equal(browserAnalyticsConfig(env, manifest).errorsEnabled, true);
  const unprovisioned = browserAnalyticsConfig(env, { target: null, controls: { verified: false, products: {} } });
  assert.equal(unprovisioned.enabled, true);
  assert.equal(unprovisioned.replayEnabled, false);
  const otherToken = browserAnalyticsConfig({ ...env, PUBLIC_POSTHOG_PROJECT_TOKEN: 'other' }, manifest);
  assert.equal(otherToken.enabled, true);
  assert.equal(otherToken.replayEnabled, false);
});
