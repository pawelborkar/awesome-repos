import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const origin = 'https://awesome.pawel.in';
const proxy = 'https://a.awesome.pawel.in';
const token = 'phc_analytics_test_000000000000000000000000000';

async function isolatedAnalytics(page: Page, blocked = false, replay = false) {
  const captured: any[] = [];
  await page.exposeFunction('__analyticsRecorded', (event: unknown) => captured.push(event));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === proxy) {
      const headers = { 'Access-Control-Allow-Origin': '*' };
      if (url.pathname === '/static/array.js') {
        if (blocked) { await route.abort(); return; }
        const instrument = `const testConfig=window.posthog._i[0][1];const testBefore=testConfig.before_send;testConfig.opt_out_useragent_filter=true;testConfig.disable_compression=true;testConfig.before_send=event=>{const clean=testBefore(event);if(clean)window.__analyticsRecorded(clean);return clean;};${replay ? `const actualLoaded=testConfig.loaded;testConfig.loaded=ph=>{const sessionListener=ph.onSessionId.bind(ph);ph.onSessionId=callback=>sessionListener(()=>{let n=0;while(!window.awesomeAnalytics.sampleSession('sample-'+n))n++;callback('sample-'+n);});actualLoaded(ph);};` : ''}`;
        await route.fulfill({ contentType: 'application/javascript', headers, body: instrument + readFileSync('node_modules/posthog-js/dist/array.full.js', 'utf8') });
      } else if (url.pathname.startsWith('/array/')) {
        const recording = replay ? JSON.stringify({ endpoint: '/s/', sampleRate: 1, scriptConfig: { script: 'posthog-recorder' }, consoleLogRecordingEnabled: false, recordCanvas: false, minimumDurationMilliseconds: 0, urlTriggers: [], eventTriggers: [], masking: null }) : 'null';
        await route.fulfill({ contentType: 'application/javascript', headers, body: `window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};window._POSTHOG_REMOTE_CONFIG['${token}']={config:{analytics:{endpoint:'/i/v0/e/'},autocapture_opt_out:true,errorTracking:{autocaptureExceptions:false},hasFeatureFlags:false,capturePerformance:false,sessionRecording:${recording},supportedCompression:[]},siteApps:[]};` });
      } else if (url.pathname.startsWith('/static/')) {
        const file = resolve('node_modules/posthog-js/dist', url.pathname.split('/').at(-1)!);
        if (existsSync(file)) await route.fulfill({ contentType: 'application/javascript', headers, body: readFileSync(file) });
        else await route.abort();
      } else await route.fulfill({ status: 200, contentType: 'application/json', headers, body: '{}' });
      return;
    }
    if (url.origin !== origin) { await route.abort(); return; }
    const pathname = decodeURIComponent(url.pathname);
    const filename = resolve('site/dist', '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!filename.startsWith(resolve('site/dist') + '/') || !existsSync(filename)) { await route.fulfill({ status: 404, body: 'Not found' }); return; }
    let body: Buffer | string = readFileSync(filename);
    if (extname(filename) === '.html') {
      // Enable only this intercepted artifact, using a dummy token and mock host. No production
      // build flag, environment file, credential or server setting is changed.
      body = body.toString().replace('"enabled":false', '"enabled":true').replace(/"apiKey":"[^"]*"/, `"apiKey":"${token}"`).replace(/"apiHost":"[^"]*"/, `"apiHost":"${proxy}"`).replace('"errorsEnabled":false', '"errorsEnabled":true');
      if (replay) body = body.replace('"replayEnabled":false', '"replayEnabled":true');
    }
    const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    await route.fulfill({ contentType: types[extname(filename)] || 'application/octet-stream', body });
  });
  return captured;
}

test('real SDK initializes once and filter state never leaks or inflates pageviews', async ({ page }) => {
  const events = await isolatedAnalytics(page);
  await page.goto(origin + '/?utm_source=github');
  await expect.poll(() => events.filter(e => e.event === '$pageview').length).toBe(1);
  await page.getByRole('searchbox', { name: 'Filter these resources' }).fill('PRIVATE_MARKER');
  await expect.poll(() => events.filter(e => e.event === 'resource_filter_changed').length).toBe(1);
  await page.getByRole('searchbox', { name: 'Filter these resources' }).blur();
  expect(events.filter(e => e.event === '$pageview')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain('PRIVATE_MARKER');
  expect(page.url()).toContain('utm_source=github');
  expect(events.find(e => e.event === 'resource_filter_changed').properties.has_query).toBe(true);
});

test('completed searches deduplicate submit and blur and retain canonical result metadata', async ({ page }) => {
  const events = await isolatedAnalytics(page);
  await page.goto(origin + '/search/?utm_campaign=launch');
  const input = page.getByRole('searchbox');
  await input.fill('Python'); await input.fill('Rust');
  await expect(page.locator('#search-results li').first()).toBeVisible();
  await expect.poll(() => events.filter(e => e.event === 'resource_searched').length).toBe(1);
  await input.press('Enter'); await input.blur();
  await expect(page.locator('#search-status')).toContainText('found');
  expect(events.filter(e => e.event === 'resource_searched')).toHaveLength(1);
  const result = page.locator('#search-results a').first();
  await result.evaluate(a => a.addEventListener('click', e => e.preventDefault()));
  await result.focus(); await result.press('Enter');
  await expect.poll(() => events.filter(e => e.event === 'resource_selected').length).toBe(1);
  const selected = events.find(e => e.event === 'resource_selected').properties;
  expect(selected.resource_key).toMatch(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/);
  expect(selected.source).toBe('search_results'); expect(selected.result_position).toBe(1);
  expect(selected.search_id).toBe(events.find(e => e.event === 'resource_searched').properties.search_id);
  expect(page.url()).toContain('utm_campaign=launch');
});

test('search failures capture sanitized diagnostics while stale searches produce no success event', async ({ page }) => {
  const events = await isolatedAnalytics(page);
  await page.route(origin + '/pagefind/pagefind.js', route => route.abort());
  await page.goto(origin + '/search/'); await page.getByRole('searchbox').fill('PRIVATE_MARKER');
  await expect(page.locator('#search-status')).toContainText('Search is unavailable');
  await expect.poll(() => events.filter(e => e.event === 'search_failed').length).toBe(1);
  expect(events.filter(e => e.event === 'resource_searched')).toHaveLength(0);
  expect(JSON.stringify(events)).not.toContain('PRIVATE_MARKER');
});

test('cancelled search responses are ignored and fragment restoration emits once', async ({ page }) => {
  const events = await isolatedAnalytics(page);
  await page.route(origin + '/pagefind/pagefind.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    export async function init() {}
    export async function filters() { return {}; }
    export async function search(q) {
      window.__searchStarted=q;
      if(q==='first') await new Promise(resolve=>window.__releaseSearch=resolve);
      return {results:[{data:async()=>({url:'/repositories/rust-lang/book/',meta:{title:q,resource_key:'rust-lang/book'},excerpt:'Result'})}]};
    }
  ` }));
  await page.goto(origin + '/search/?utm_source=github#q=restored');
  await expect.poll(() => events.filter(e => e.event === 'resource_searched').length).toBe(1);
  expect(events.find(e => e.event === 'resource_searched').properties.trigger).toBe('restore');
  const input = page.getByRole('searchbox');
  await input.fill('first');
  await expect.poll(() => page.evaluate(() => (window as any).__searchStarted)).toBe('first');
  await input.fill('second');
  await expect(page.locator('#search-results a')).toHaveText('second');
  await expect.poll(() => events.filter(e => e.event === 'resource_searched').length).toBe(2);
  await page.evaluate(() => (window as any).__releaseSearch());
  await input.press('Enter'); await input.blur();
  await expect(page.locator('#search-results a')).toHaveText('second');
  expect(events.filter(e => e.event === 'resource_searched')).toHaveLength(2);
  expect(events.filter(e => e.event === 'search_failed')).toHaveLength(0);
  expect(page.url()).toContain('utm_source=github');
});

test('ordinary, modified and middle-click tracking distinguishes repositories with the same name', async ({ page }) => {
  const events = await isolatedAnalytics(page); await page.goto(origin + '/');
  for (const key of ['golang/go', 'avelino/awesome-go']) {
    const link = page.locator(`[data-resource-key="${key}"] .card-source`);
    await link.evaluate(a => a.addEventListener('click', e => e.preventDefault()));
    await link.dispatchEvent('click', { button: 0, ctrlKey: true });
    await link.dispatchEvent('auxclick', { button: 1 });
  }
  await expect.poll(() => events.filter(e => e.event === 'resource_opened').length).toBe(4);
  expect(new Set(events.filter(e => e.event === 'resource_opened').map(e => e.properties.resource_key)).size).toBe(2);
});

test('blocked SDK does not break filtering, navigation, or the early exception queue', async ({ page }) => {
  await isolatedAnalytics(page, true); await page.goto(origin + '/');
  await page.getByRole('searchbox', { name: 'Filter these resources' }).fill('ripgrep');
  await expect(page.locator('[data-resource]:visible')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Filter these resources' }).blur();
  await page.keyboard.press('/'); await expect(page).toHaveURL(origin + '/search/');
  await page.getByRole('searchbox').fill('Rust'); await expect(page.locator('#search-results li').first()).toBeVisible();
  expect(await page.evaluate(() => typeof window.posthog?.captureException)).toBe('function');
});

test('recorded replay snapshots preserve their protocol and exclude search text', async ({ page }) => {
  const events = await isolatedAnalytics(page, false, true);
  await page.goto(origin + '/?q=PRIVATE_MARKER#q=PRIVATE_MARKER');
  await page.getByRole('searchbox', { name: 'Filter these resources' }).fill('PRIVATE_MARKER');
  // Flush actual rrweb/SDK snapshots through the locally intercepted before_send.
  await expect.poll(() => events.filter(e => e.event === '$snapshot').length, { timeout: 15000 }).toBeGreaterThan(0);
  expect(JSON.stringify(events)).not.toContain('PRIVATE_MARKER');
  expect(page.url()).not.toContain('?q=');
});

test('preview build does not request production analytics', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => { if (request.url().includes('posthog') || request.url().startsWith(proxy)) requests.push(request.url()); });
  await page.goto('/'); await page.getByRole('searchbox', { name: 'Filter these resources' }).fill('Rust');
  expect(requests).toEqual([]);
});
