import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { tokenFingerprint } from './analytics-config.mjs';
import { OWNER, dashboards, alerts } from './analytics-blueprint.mjs';

export const manifestPath = fileURLToPath(new URL('../config/analytics-manifest.json', import.meta.url));
const names = new Set(['awesome repos', 'awesome repositories']);
const normalized = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const productKeys = { analytics: 'product_analytics', replay: 'session_replay', errors: 'error_tracking', logs: 'logs' };

export function requiredTarget(env) {
  const required = ['POSTHOG_ORGANIZATION_ID', 'POSTHOG_PROJECT_ID', 'POSTHOG_PERSONAL_API_KEY', 'PUBLIC_POSTHOG_PROJECT_TOKEN'];
  const missing = required.filter(key => !env[key]?.trim());
  if (missing.length) throw new Error('Missing required Awesome Repos configuration: ' + missing.join(', ') + '. No remote requests were made.');
  if (!/^[a-f0-9-]{36}$/i.test(env.POSTHOG_ORGANIZATION_ID) || !/^[1-9][0-9]*$/.test(env.POSTHOG_PROJECT_ID)) throw new Error('Explicit organization UUID and positive project ID required');
  if (env.PUBLIC_POSTHOG_HOST !== 'https://a.awesome.pawel.in' || env.PUBLIC_POSTHOG_UI_HOST !== 'https://us.posthog.com') throw new Error('Unexpected Awesome Repos proxy or UI host');
  return { organization: env.POSTHOG_ORGANIZATION_ID, project: env.POSTHOG_PROJECT_ID };
}

export function scopedApi(env, transport = fetch) {
  const target = requiredTarget(env);
  const project = `/api/projects/${target.project}/`;
  const organization = `/api/organizations/${target.organization}/`;
  let verified = false;
  async function request(path, method = 'GET', data) {
    const url = new URL(path, 'https://us.posthog.com');
    if (url.origin !== 'https://us.posthog.com' || !(url.pathname.startsWith(project) || url.pathname.startsWith(organization) || (method === 'GET' && url.pathname === '/api/users/@me/'))) throw new Error('Cross-target API request rejected');
    if (method !== 'GET' && (!verified || !url.pathname.startsWith(project))) throw new Error('Unverified or organization-wide write rejected');
    const response = await transport(url.href, {
      method, redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Authorization: 'Bearer ' + env.POSTHOG_PERSONAL_API_KEY, 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    if (!response.ok) { const error = new Error(`Scoped PostHog request failed (${response.status}) at ${url.pathname}`); error.status = response.status; throw error; }
    return response.status === 204 ? null : response.json();
  }
  async function verify() {
    const org = await request(organization);
    if (String(org.id) !== target.organization || !names.has(normalized(org.name))) throw new Error('Organization is not the explicitly authorized Awesome Repos organization');
    const team = await request(project);
    if (String(team.id) !== target.project || String(team.organization_id || team.organization?.id || team.organization) !== target.organization || team.api_token !== env.PUBLIC_POSTHOG_PROJECT_TOKEN) throw new Error('Awesome Repos project, organization, or token mismatch');
    verified = true;
    return { org, team };
  }
  async function list(path) {
    const rows = [];
    for (let page = 0; path && page < 100; page++) {
      const data = await request(path);
      if (Array.isArray(data)) return rows.concat(data);
      if (!Array.isArray(data.results)) throw new Error('Unexpected paginated response');
      rows.push(...data.results); path = data.next;
      if (!path) return rows;
    }
    throw new Error('Incomplete pagination refused');
  }
  return { target, project, organization, request, verify, list };
}

export function includedControls(products, limits) {
  const result = {};
  for (const [name, key] of Object.entries(productKeys)) {
    const product = products.find(p => p.key === key);
    const limit = limits.find(l => l.key === key);
    const paidRetention = product?.addons?.some(a => /retention/i.test(a.key || '') && a.subscribed);
    // A missing/unreadable limit is never interpreted as free or unlimited.
    result[name] = Boolean(product && product.free_allocation > 0 && limit?.limit_usd === 0 && !paidRetention);
  }
  return { verified: result.analytics, products: result, replay_sample_rate: 0.1, paid_usage_allowed: false, quota_reached: limits.some(l => l.key === productKeys.analytics && l.reached) };
}

function owned(rows, key, compatible = () => false) {
  const marker = `${OWNER}:${key}`;
  const managed = rows.filter(row => !row.deleted && (row.description || '').includes(marker));
  const matches = managed.length ? managed : rows.filter(row => !row.deleted && compatible(row));
  if (matches.length > 1) throw new Error('Ambiguous managed asset: ' + key);
  return matches[0];
}

export async function provision(env, { apply = false, transport, manifest = JSON.parse(readFileSync(manifestPath, 'utf8')), save = value => {
  writeFileSync(manifestPath + '.tmp', JSON.stringify(value, null, 2) + '\n'); renameSync(manifestPath + '.tmp', manifestPath);
} } = {}) {
  const api = scopedApi(env, transport);
  const { team } = await api.verify();
  const target = { organization_id: api.target.organization, project_id: Number(api.target.project), token_sha256: tokenFingerprint(env.PUBLIC_POSTHOG_PROJECT_TOKEN) };
  if (manifest.target && JSON.stringify(manifest.target) !== JSON.stringify(target)) throw new Error('Existing provisioning manifest belongs to a different target; refusing reuse');
  const [existingDashboards, existingInsights, existingAlerts, products, limits] = await Promise.all([
    api.list(api.project + 'dashboards/?limit=100'), api.list(api.project + 'insights/?limit=100'), api.list(api.project + 'alerts/?limit=100'),
    api.list(api.organization + 'billing/products/'), api.list(api.organization + 'billing/limits/'),
  ]);
  const controls = includedControls(products, limits);
  if (!controls.verified) throw new Error('Included analytics cost boundary is unverified. Set a $0 product limit in the verified Awesome Repos billing UI and retry. The scoped billing API is read-only; no default-organization billing endpoint will be used.');
  let catalog = [];
  try { catalog = await api.list(api.project + 'data_catalog/metrics/?limit=100'); }
  catch (error) { if (![403, 404].includes(error.status)) throw error; }
  // Preserve explicit, approved, non-drifted managed definitions where one exists.
  const definitions = structuredClone(dashboards);
  const replayUrl = `https://us.posthog.com/project/${api.target.project}/replay`;
  const replayTile = definitions.find(d => d.key === 'experience').insights.find(i => i.key === 'diagnostic-sessions');
  replayTile.description += ` [Open masked replay sample](${replayUrl}).`;
  for (const dashboard of definitions) for (const item of dashboard.insights) {
    const match = catalog.find(m => m.name === item.key && m.status === 'approved' && m.is_drifted === false);
    if (match) {
      const metric = await api.request(api.project + 'data_catalog/metrics/' + encodeURIComponent(match.name) + '/');
      if (!metric.source_insight_short_id) throw new Error('Approved metric requires explicit definition review: ' + item.key);
      const source = await api.list(api.project + 'insights/?short_id=' + encodeURIComponent(metric.source_insight_short_id));
      if (source.length !== 1 || !source[0].query) throw new Error('Approved metric source insight unavailable');
      item.query = source[0].query; item.description = `${OWNER}:${item.key}. Approved catalog metric: ${match.name}`;
    }
  }
  const planned = { target, controls, dashboards: definitions.map(d => ({ name: d.name, insight_count: d.insights.length })), alert_slots_available: Math.max(0, 5 - existingAlerts.length), apply };
  if (!apply) return planned;
  const me = await api.request('/api/users/@me/');
  const members = await api.list(api.organization + 'members/?limit=100');
  if (!members.some(member => Number(member.user?.id) === Number(me.id))) throw new Error('Alert subscriber is not a member of Awesome Repos');
  const queries = [...definitions.flatMap(d => d.insights), ...alerts];
  // Validate every query against the target before changing any assets or settings.
  for (const item of queries) await api.request(api.project + 'query/', 'POST', { query: item.query.kind === 'DataVisualizationNode' ? item.query.source : item.query });
  const state = structuredClone(manifest);
  state.target = target;
  state.controls = { ...controls, verified: false, verified_at: new Date().toISOString() };
  state.assets ||= { dashboards: {}, insights: {}, alerts: {} };
  save(state);
  await api.request(api.project, 'PATCH', {
    anonymize_ips: true, capture_console_log_opt_in: false, autocapture_exceptions_opt_in: false,
    session_recording_opt_in: controls.products.replay, session_recording_sample_rate: 0.1,
    session_recording_masking_config: { ...team.session_recording_masking_config, maskAllInputs: true, maskTextSelector: '*' },
    session_recording_network_payload_capture_config: { recordHeaders: false, recordBody: false },
  });
  const settings = await api.request(api.project);
  if (settings.anonymize_ips !== true || settings.capture_console_log_opt_in !== false || settings.autocapture_exceptions_opt_in !== false || settings.session_recording_opt_in !== controls.products.replay || settings.session_recording_sample_rate !== 0.1 || settings.session_recording_masking_config?.maskAllInputs !== true || settings.session_recording_masking_config?.maskTextSelector !== '*' || settings.session_recording_network_payload_capture_config?.recordHeaders !== false || settings.session_recording_network_payload_capture_config?.recordBody !== false) throw new Error('Remote privacy settings did not verify; capture remains disabled');
  state.controls.verified = true; save(state);
  const upsertInsight = async (item, dashboardId) => {
    const previous = owned(existingInsights, item.key, row => row.name === item.name && JSON.stringify(row.query) === JSON.stringify(item.query));
    const associations = new Set((previous?.dashboard_tiles || []).filter(t => !t.deleted).map(t => t.dashboard_id));
    if (dashboardId) associations.add(dashboardId);
    const description = item.description || `${OWNER}:${item.key}`;
    const annotation = previous?.description?.split(OWNER)[0].trim();
    const preserved = annotation ? annotation + '\n\n' : '';
    const body = { name: item.name, description: preserved + description, query: item.query, saved: true, tags: [...new Set([...(previous?.tags || []), OWNER])], ...(associations.size ? { dashboards: [...associations] } : {}) };
    const value = await api.request(api.project + 'insights/' + (previous ? previous.id + '/' : ''), previous ? 'PATCH' : 'POST', body);
    if (!previous) existingInsights.push(value);
    state.assets.insights[item.key] = value.id; save(state);
    return value;
  };
  for (const dashboard of definitions) {
    const previous = owned(existingDashboards, dashboard.key, row => row.name === dashboard.name);
    if (previous && previous.is_shared !== false) throw new Error('Managed dashboard has public sharing enabled; refusing to reuse it');
    const annotation = previous?.description?.split(OWNER)[0].trim();
    const preserved = annotation ? annotation + '\n\n' : '';
    const body = { name: dashboard.name, description: `${preserved}${OWNER}:${dashboard.key}. Production human traffic only except the automation dashboard. Browser retention is approximate; missing or quota-limited data is incomplete. [Open masked replay sample](${replayUrl}).`, tags: [...new Set([...(previous?.tags || []), OWNER])] };
    const value = await api.request(api.project + 'dashboards/' + (previous ? previous.id + '/' : ''), previous ? 'PATCH' : 'POST', body);
    if (value.is_shared !== false) throw new Error('Dashboard privacy could not be established');
    state.assets.dashboards[dashboard.key] = value.id; save(state);
    for (const item of dashboard.insights) await upsertInsight(item, value.id);
  }
  const baseline = await api.request(api.project + 'query/', 'POST', { query: { kind: 'HogQLQuery', query: "SELECT minOrNull(timestamp) FROM events WHERE properties.site='awesome-repos' AND properties.environment='production' AND properties.actor_type='visitor' AND properties.schema_version=2 AND event='$pageview' AND timestamp >= now()-INTERVAL 60 DAY" } });
  if (!state.baseline_started_at && baseline.results?.[0]?.[0]) state.baseline_started_at = baseline.results[0][0];
  const baselineDays = state.baseline_started_at ? (Date.now() - new Date(state.baseline_started_at).getTime()) / 86400000 : 0;
  let remaining = Math.max(0, 5 - existingAlerts.length);
  state.pending_alerts = [];
  for (const item of alerts) {
    const name = `${item.name} (${OWNER}:${item.key})`;
    const previous = existingAlerts.find(a => a.name === name);
    if (!previous && !remaining) { state.pending_alerts.push(item.key); continue; }
    const monitored = await upsertInsight(item);
    // Growth must remain disabled until complete historical quota evidence exists.
    const enabled = baselineDays >= (item.minimumDays || 0) && (!item.requiresCompleteBaseline || state.baseline_completeness_verified === true) && !controls.quota_reached;
    const body = { name, insight: monitored.id, subscribed_users: [me.id], threshold: { configuration: { type: 'absolute', bounds: { upper: 0 } } }, condition: { type: 'absolute_value' }, config: { type: 'HogQLAlertConfig', column: 'breach', evaluation: 'first_row' }, calculation_interval: item.interval, enabled: false, investigation_agent_enabled: false };
    const value = await api.request(api.project + 'alerts/' + (previous ? previous.id + '/' : ''), previous ? 'PATCH' : 'POST', body);
    const destinations = await api.list(api.project + 'alerts/' + value.id + '/destinations/');
    if (destinations.length) throw new Error('Owned alert has outbound destinations; left disabled');
    if (enabled) await api.request(api.project + 'alerts/' + value.id + '/', 'PATCH', { enabled: true });
    if (!previous) remaining--;
    state.assets.alerts[item.key] = value.id; save(state);
  }
  save(state);
  return { ...planned, assets: state.assets, pending_alerts: state.pending_alerts, baseline_started_at: state.baseline_started_at };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await provision(process.env, { apply: process.argv.includes('--apply') }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
