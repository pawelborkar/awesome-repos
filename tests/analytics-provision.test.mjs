import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { provision, scopedApi, includedControls } from '../scripts/analytics-provision.mjs';
import { dashboards, alerts } from '../scripts/analytics-blueprint.mjs';

const env = { POSTHOG_ORGANIZATION_ID: '00000000-0000-0000-0000-000000000001', POSTHOG_PROJECT_ID: '77', POSTHOG_PERSONAL_API_KEY: 'private-test-key', PUBLIC_POSTHOG_PROJECT_TOKEN: 'public-test-token', PUBLIC_POSTHOG_HOST: 'https://a.awesome.pawel.in', PUBLIC_POSTHOG_UI_HOST: 'https://us.posthog.com' };
const emptyManifest = () => JSON.parse(readFileSync('config/analytics-manifest.json', 'utf8'));
function service(overrides = {}) {
  const calls = [], db = { dashboards: [{ id: 99, name: 'Existing dashboard', description: 'User-owned', is_shared: false }], insights: [], alerts: [], next: 100, team: {} };
  const productKeys = ['product_analytics', 'session_replay', 'error_tracking', 'logs'];
  const transport = async (input, options) => {
    const url = new URL(input), path = url.pathname, body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ path, method: options.method, body });
    const json = value => Response.json(value);
    if (path === `/api/organizations/${env.POSTHOG_ORGANIZATION_ID}/`) return json({ id: env.POSTHOG_ORGANIZATION_ID, name: overrides.organizationName || 'Awesome Repos' });
    if (path === '/api/projects/77/' && options.method === 'GET') return json({ id: overrides.project || 77, organization_id: overrides.organization || env.POSTHOG_ORGANIZATION_ID, api_token: overrides.token || env.PUBLIC_POSTHOG_PROJECT_TOKEN, ...db.team });
    if (path.endsWith('/billing/products/')) return json({ results: productKeys.map(key => ({ key, free_allocation: 1000 })) });
    if (path.endsWith('/billing/limits/')) return json({ results: productKeys.map(key => ({ key, limit_usd: overrides.paid ? 10 : 0, reached: false })) });
    if (path.endsWith('/data_catalog/metrics/')) return json({ results: [] });
    if (path === '/api/users/@me/') return json({ id: 7 });
    if (path.endsWith('/members/')) return json({ results: [{ user: { id: 7 } }] });
    if (path.endsWith('/query/')) return json({ results: [[null]] });
    if (path === '/api/projects/77/' && options.method === 'PATCH') { if (!overrides.ignoreSettings) Object.assign(db.team, body); return json(body); }
    if (/\/alerts\/[^/]+\/destinations\/$/.test(path)) return json({ results: [] });
    const match = path.match(/^\/api\/projects\/77\/(dashboards|insights|alerts)\/(?:([^/]+)\/)?$/);
    if (match) {
      const [, kind, id] = match;
      if (options.method === 'GET') return json({ results: db[kind] });
      if (options.method === 'POST') { const item = { id: db.next++, ...body, ...(kind === 'dashboards' ? { is_shared: false } : {}) }; db[kind].push(item); return json(item); }
      const item = db[kind].find(item => String(item.id) === id); assert.ok(item); Object.assign(item, body); return json(item);
    }
    throw new Error('Unexpected request: ' + options.method + ' ' + path);
  };
  return { calls, db, transport };
}

test('missing environment variables make no remote requests and never save a manifest', async () => {
  let requests = 0;
  await assert.rejects(provision({}, { transport: () => { requests++; }, save() { assert.fail('saved'); } }), /Missing required/);
  assert.equal(requests, 0);
});

test('wrong organization, project, parent organization and token cause zero writes', async () => {
  for (const overrides of [{ organizationName: 'Pomodoro.in' }, { project: 999 }, { organization: 'other' }, { token: 'different' }]) {
    const server = service(overrides);
    await assert.rejects(provision(env, { apply: true, transport: server.transport, manifest: emptyManifest(), save() { assert.fail('saved'); } }), /Organization|mismatch/);
    assert.equal(server.calls.filter(c => c.method !== 'GET').length, 0);
    assert.ok(server.calls.every(c => !c.path.includes('/999/')));
  }
});

test('dry run is read-only, included limits are required, pagination cannot escape target', async () => {
  const server = service(); const result = await provision(env, { transport: server.transport, manifest: emptyManifest(), save() { assert.fail('saved'); } });
  assert.equal(result.dashboards.length, 4); assert.equal(server.calls.filter(c => c.method !== 'GET').length, 0);
  const paid = service({ paid: true }); await assert.rejects(provision(env, { apply: true, transport: paid.transport, manifest: emptyManifest() }), /cost boundary/);
  assert.equal(paid.calls.filter(c => c.method !== 'GET').length, 0);
  const api = scopedApi(env, async () => Response.json({ results: [], next: 'https://us.posthog.com/api/projects/999/dashboards/' }));
  await assert.rejects(api.list('/api/projects/77/dashboards/'), /Cross-target/);
  await assert.rejects(api.request('/api/billing/'), /Cross-target/);
  await assert.rejects(api.request('/api/organizations/' + env.POSTHOG_ORGANIZATION_ID + '/', 'PATCH', {}), /write rejected/);
});

test('two apply runs are idempotent and preserve unrelated assets and the alert quota', async () => {
  const server = service(); let manifest = emptyManifest();
  const save = value => { manifest = structuredClone(value); };
  await provision(env, { apply: true, transport: server.transport, manifest, save });
  const counts = ['dashboards', 'insights', 'alerts'].map(k => server.db[k].length);
  await provision(env, { apply: true, transport: server.transport, manifest, save });
  assert.deepEqual(['dashboards', 'insights', 'alerts'].map(k => server.db[k].length), counts);
  assert.equal(counts[0], 5); assert.equal(counts[2], 5); assert.equal(server.db.dashboards[0].description, 'User-owned');
  assert.ok(!JSON.stringify(manifest).includes(env.POSTHOG_PERSONAL_API_KEY)); assert.ok(!JSON.stringify(manifest).includes(env.PUBLIC_POSTHOG_PROJECT_TOKEN));
  assert.ok(server.calls.filter(c => c.method !== 'GET').every(c => c.path.startsWith('/api/projects/77/')));
  assert.equal(server.db.alerts.find(a => a.name.includes('Audience decline')).enabled, false);
  assert.equal(server.db.alerts.find(a => a.name.includes('heartbeat')).enabled, false);
  for (const alert of server.db.alerts) { assert.deepEqual(alert.subscribed_users, [7]); assert.equal(alert.investigation_agent_enabled, false); }
});

test('missing limits and paid log-retention add-ons keep products disabled', () => {
  assert.equal(includedControls([], []).verified, false);
  const controls = includedControls([{ key: 'logs', free_allocation: 10, addons: [{ key: 'logs_retention', subscribed: true, unit_amount_usd: '1' }] }], [{ key: 'logs', limit_usd: 0 }]);
  assert.equal(controls.products.logs, false);
});

test('unapplied privacy settings keep capture disabled and create no assets', async () => {
  const server = service({ ignoreSettings: true });
  let manifest = emptyManifest();
  await assert.rejects(provision(env, { apply: true, transport: server.transport, manifest, save(value) { manifest = structuredClone(value); } }), /privacy settings did not verify/);
  assert.equal(manifest.controls.verified, false);
  assert.equal(server.db.dashboards.length, 1);
  assert.equal(server.db.insights.length, 0);
  assert.equal(server.db.alerts.length, 0);
});

test('compatible existing assets are reused while preserving annotations and associations', async () => {
  const server = service(); let manifest = emptyManifest();
  server.db.dashboards[0].name = dashboards[0].name;
  server.db.dashboards[0].tags = ['existing-tag'];
  const item = dashboards[0].insights[0];
  server.db.insights.push({ id: 600, name: item.name, query: item.query, description: 'Existing insight annotation', dashboard_tiles: [{ dashboard_id: 99 }, { dashboard_id: 98 }], tags: ['existing-tag'] });
  const save = value => { manifest = structuredClone(value); };
  for (let i = 0; i < 2; i++) await provision(env, { apply: true, transport: server.transport, manifest, save });
  assert.equal(server.db.dashboards.length, 4);
  assert.equal(manifest.assets.insights[item.key], 600);
  assert.ok(server.db.insights[0].description.startsWith('Existing insight annotation'));
  assert.ok(server.db.dashboards[0].description.startsWith('User-owned'));
  assert.ok(server.db.dashboards[0].tags.includes('existing-tag'));
  assert.deepEqual(server.db.insights[0].dashboards.sort(), [98, 99]);
});

test('a manifest for another target causes zero writes', async () => {
  const server = service();
  const manifest = { ...emptyManifest(), target: { organization_id: 'other', project_id: 999 } };
  await assert.rejects(provision(env, { apply: true, transport: server.transport, manifest }), /different target/);
  assert.equal(server.calls.filter(c => c.method !== 'GET').length, 0);
});

test('human insight definitions exclude automation and use stable repository keys', () => {
  for (const dashboard of dashboards.filter(d => d.key !== 'curation')) {
    for (const item of dashboard.insights) {
      const source = JSON.stringify(item.query); assert.ok(source.includes('visitor')); assert.ok(source.includes('production')); assert.ok(source.includes('awesome-repos'));
    }
  }
  assert.equal(alerts.length, 5);
  assert.ok(dashboards.find(d => d.key === 'discovery').insights.find(i => i.key === 'repositories').query.breakdownFilter.breakdown === 'resource_key');
});
