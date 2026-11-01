// Versioned desired state. No credentials, IDs, invented baselines, or visitor data.
export const OWNER = 'awesome-repos-analytics:v2';
export const property = (key, value, operator = 'exact') => ({ key, value, operator, type: 'event' });
export const visitorFilters = [property('site', 'awesome-repos'), property('environment', 'production'), property('actor_type', 'visitor'), property('$host', 'awesome.pawel.in'), property('is_internal', false), property('$virt_is_bot', false)];
const automationFilters = [property('site', 'awesome-repos'), property('environment', 'production'), property('actor_type', 'automation')];
const event = (name, math = 'total', properties = []) => ({ kind: 'EventsNode', event: name, name, math, properties });
const trends = (series, { filters = visitorFilters, breakdown, breakdownType = 'event', format = 'numeric' } = {}) => ({
  kind: 'TrendsQuery', series, properties: filters, filterTestAccounts: true,
  dateRange: { date_from: '-28d', date_to: '-1d' }, interval: 'day', compareFilter: { compare: true },
  trendsFilter: { display: 'ActionsLineGraph', aggregationAxisFormat: format },
  ...(breakdown ? { breakdownFilter: { breakdown, breakdown_type: breakdownType, breakdown_limit: 10 } } : {}),
});
const sql = query => ({ kind: 'DataVisualizationNode', source: { kind: 'HogQLQuery', query, ...(query.includes('{filters}') ? { filters: { filterTestAccounts: true } } : {}) }, display: 'ActionsTable' });
const human = "properties.site = 'awesome-repos' AND properties.environment = 'production' AND properties.actor_type = 'visitor' AND properties.$host = 'awesome.pawel.in' AND properties.is_internal = false AND NOT isLikelyBot(coalesce(nullIf(properties.$raw_user_agent,''),properties.$user_agent)) AND {filters}";
const session = 'toString(properties.$session_id)';
const window = "timestamp >= toStartOfDay(now()) - INTERVAL 28 DAY AND timestamp < toStartOfDay(now())";
const auto = "properties.site = 'awesome-repos' AND properties.environment = 'production' AND properties.actor_type = 'automation'";
// Attribution is session-entry data, not the last page or campaign seen before a click.
// A session can begin up to 24 hours before its first event inside this window.
const sessionConversion = dimension => sql(`SELECT attribution.${dimension} AS segment, count() AS sessions, countIf(traffic.converted=1) AS converted_sessions, converted_sessions / nullIf(sessions,0) AS conversion_rate FROM (SELECT ${session} AS session_id, max(if(event='resource_opened',1,0)) AS converted FROM events WHERE ${window} AND ${human} AND event IN ('$pageview','resource_opened') AND notEmpty(${session}) GROUP BY session_id HAVING countIf(event='$pageview')>0) AS traffic LEFT JOIN (SELECT session_id, $channel_type AS channel, $entry_referring_domain AS referrer, $entry_utm_campaign AS campaign, $entry_pathname AS landing_page FROM sessions WHERE $start_timestamp >= toStartOfDay(now())-INTERVAL 29 DAY AND $start_timestamp < toStartOfDay(now())) AS attribution ON traffic.session_id=toString(attribution.session_id) GROUP BY segment ORDER BY sessions DESC LIMIT 20`);
const insight = (key, name, query, note = '') => ({ key, name, query, description: `${OWNER}:${key}. Browser estimates; not identified people. Derived, not catalog-certified. ${note}`.slice(0, 400) });
export const dashboards = [
  { key: 'audience', name: 'Awesome Repos — Audience Growth', insights: [
    insight('weekly-audience', 'Weekly unique browser visitors', trends([event('$pageview', 'weekly_active')])),
    insight('qualified-audience', 'Weekly visitors opening repositories', trends([event('resource_opened', 'weekly_active')])),
    insight('new-returning', 'New and returning browser visitors', trends([event('$pageview', 'dau')], { breakdown: 'visitor_status' })),
    insight('channels', 'Acquisition channels', trends([event('$pageview', 'dau')], { breakdown: '$channel_type', breakdownType: 'session' })),
    insight('referrers', 'Acquisition by referring domain', trends([event('$pageview', 'dau')], { breakdown: '$entry_referring_domain', breakdownType: 'session' })),
    insight('campaigns', 'Campaign audience', trends([event('$pageview', 'dau')], { breakdown: '$entry_utm_campaign', breakdownType: 'session' })),
    insight('landing-pages', 'Session landing pages', trends([event('$pageview', 'unique_session')], { breakdown: '$session_entry_pathname' })),
    ...['channel', 'referrer', 'campaign', 'landing_page'].map(dimension => insight('session-conversion-' + dimension, 'Repository-click conversion by ' + dimension.replace('_',' '), sessionConversion(dimension))),
    insight('weekly-retention', 'Week-one and week-four browser retention', { kind: 'RetentionQuery', properties: visitorFilters, filterTestAccounts: true, dateRange: { date_from: '-8w', date_to: '-1d' }, retentionFilter: { targetEntity: { id: '$pageview', type: 'events' }, returningEntity: { id: '$pageview', type: 'events' }, period: 'Week', totalIntervals: 5, retentionType: 'retention_first_time' } }, 'Immature W1/W4 cohorts are insufficient data, not zero retention.'),
  ] },
  { key: 'discovery', name: 'Awesome Repos — Discovery & Content', insights: [
    insight('search-adoption', 'Sessions using search', trends([event('resource_searched', 'unique_session')])),
    insight('zero-results', 'Search outcomes', trends([event('resource_searched')], { breakdown: 'result_count' })),
    insight('zero-result-rate', 'Zero-result search rate', { ...trends([event('resource_searched', 'total', [property('result_count', 0)]), event('resource_searched')], { format: 'percentage_scaled' }), trendsFilter: { display: 'ActionsLineGraph', formula: 'A/B', aggregationAxisFormat: 'percentage_scaled' } }),
    insight('search-selection', 'Search to repository selection', { kind: 'FunnelsQuery', properties: visitorFilters, filterTestAccounts: true, dateRange: { date_from: '-28d', date_to: '-1d' }, series: [event('resource_searched'), event('resource_selected')], funnelsFilter: { funnelWindowInterval: 30, funnelWindowIntervalUnit: 'minute', funnelAggregateByHogQL: 'properties.$session_id' } }),
    insight('search-success', 'Search session success within 30 minutes', sql(`SELECT count() AS searched_sessions, countIf(success=1) AS successful_sessions, successful_sessions / nullIf(searched_sessions, 0) AS success_rate FROM (SELECT searches.session_id AS session_id, max(if(conversions.timestamp >= searches.timestamp AND conversions.timestamp <= searches.timestamp + INTERVAL 30 MINUTE, 1, 0)) AS success FROM (SELECT ${session} AS session_id,timestamp FROM events WHERE ${window} AND ${human} AND event='resource_searched' AND notEmpty(${session})) AS searches LEFT JOIN (SELECT ${session} AS session_id,timestamp FROM events WHERE ${window} AND ${human} AND event IN ('resource_selected','resource_opened') AND notEmpty(${session})) AS conversions ON searches.session_id=conversions.session_id GROUP BY searches.session_id)`)),
    insight('collections', 'Selected collections', trends([event('collection_opened')], { breakdown: 'collection_slug' })),
    insight('repositories', 'Original repository clicks', trends([event('resource_opened')], { breakdown: 'resource_key' })),
    insight('contributions', 'Contribution-guide interest', trends([event('contribution_guide_opened', 'dau')]), 'Guide clicks do not establish submitted or accepted contributions.'),
  ] },
  { key: 'experience', name: 'Awesome Repos — Experience & Reliability', insights: [
    insight('browser-errors', 'Sanitized browser exceptions', trends([event('$exception')], { breakdown: 'flow' })),
    insight('affected-sessions', 'Sessions affected by browser errors', trends([event('$exception', 'unique_session')])),
    insight('search-errors', 'Search failures by phase', trends([event('search_failed')], { breakdown: 'failure_type' })),
    insight('not-found', '404 pageviews', trends([event('$pageview', 'total', [property('page_type', 'not_found')])])),
    ...['LCP', 'INP', 'CLS'].map(metric => insight('vital-' + metric.toLowerCase(), metric + ' p75', trends([{ ...event('$web_vitals', 'p75'), math_property: '$web_vitals_' + metric + '_value' }], { breakdown: 'page_type', format: metric === 'CLS' ? 'numeric' : 'duration_ms' }))),
    insight('diagnostic-sessions', 'Visitor sessions available for replay inspection', trends([event('$pageview', 'unique_session')]), 'Open native Session Replay for the 10% masked sample. This tile counts all visitor sessions, not recorded sessions.'),
  ] },
  { key: 'curation', name: 'Awesome Repos — Curation & AI', insights: [
    insight('runs', 'Curation and editorial run outcomes', trends([event('automation_run_completed'), event('automation_run_failed')], { filters: automationFilters, breakdown: 'workflow' })),
    insight('candidates', 'Candidate progression', trends(['candidate_count', 'screened_count', 'qualified_count', 'proposal_count'].map(field => ({ ...event('automation_run_completed', 'sum'), math_property: field })), { filters: automationFilters })),
    insight('run-duration', 'Run duration p95', trends([{ ...event('automation_run_completed', 'p95'), math_property: 'duration_ms' }], { filters: automationFilters, format: 'duration_ms' })),
    insight('ai-attempts', 'Generation attempts and failures', trends([event('$ai_generation'), event('$ai_generation', 'total', [property('$ai_is_error', true)])], { filters: automationFilters, breakdown: '$ai_model' })),
    insight('ai-retries', 'Retried generation attempts', trends([event('$ai_generation', 'total', [property('attempt', 1, 'gt')])], { filters: automationFilters })),
    insight('ai-tokens', 'Provider-reported token usage', trends(['$ai_input_tokens', '$ai_output_tokens'].map(field => ({ ...event('$ai_generation', 'sum'), math_property: field })), { filters: automationFilters })),
    insight('ai-latency', 'Provider attempt latency p95', trends([{ ...event('$ai_generation', 'p95'), math_property: '$ai_latency' }], { filters: automationFilters, format: 'duration' })),
    insight('ai-cost', 'Cost estimate availability', trends([event('$ai_generation')], { filters: automationFilters, breakdown: 'cost_status' }), 'Unknown cost is not zero. Native AI Observability may calculate estimates for supported models.'),
  ] },
];

const hour = 'timestamp >= toStartOfHour(now()) - INTERVAL 1 HOUR AND timestamp < toStartOfHour(now())';
export const alerts = [
  { key: 'search-failure-alert', name: 'Awesome Repos — Search failures', interval: 'hourly', query: sql(`SELECT if(countIf(event='search_failed') >= 3 AND count() >= 20 AND countIf(event='search_failed') / count() > 0.05, 1, 0) AS breach FROM events WHERE ${hour} AND ${human} AND event IN ('search_failed','resource_searched')`) },
  { key: 'browser-error-alert', name: 'Awesome Repos — Browser exceptions', interval: 'hourly', query: sql(`SELECT if(count() >= 5 AND uniqExact(${session}) >= 3,1,0) AS breach FROM events WHERE ${hour} AND ${human} AND event='$exception' AND notEmpty(${session})`) },
  { key: 'curation-failure-alert', name: 'Awesome Repos — Curation failure', interval: 'hourly', query: sql(`SELECT if(count()>0,1,0) AS breach FROM events WHERE ${hour} AND ${auto} AND event='automation_run_failed'`) },
  { key: 'heartbeat-alert', name: 'Awesome Repos — Missing curation heartbeat', interval: 'daily', minimumDays: 8, query: sql(`SELECT if(count()=0,1,0) AS breach FROM events WHERE timestamp >= now() - INTERVAL 8 DAY AND ${auto} AND event='automation_run_completed' AND properties.workflow='curation' AND properties.scheduled=true`) },
  { key: 'audience-decline-alert', name: 'Awesome Repos — Audience decline', interval: 'daily', minimumDays: 14, requiresCompleteBaseline: true, query: sql(`SELECT if(previous >= 100 AND current < previous*0.5,1,0) AS breach FROM (SELECT uniqExactIf(distinct_id,timestamp >= toStartOfDay(now())-INTERVAL 7 DAY) AS current, uniqExactIf(distinct_id,timestamp < toStartOfDay(now())-INTERVAL 7 DAY) AS previous FROM events WHERE timestamp >= toStartOfDay(now())-INTERVAL 14 DAY AND timestamp < toStartOfDay(now()) AND ${human} AND event='$pageview')`) },
];
