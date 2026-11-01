// Self-contained so Astro can run this in the head before any interactive scripts.
// Also executed against isolated browser doubles in the privacy tests.
export function analyticsRuntime(settings, win) {
  let visitorStatus = 'unknown';
  const campaigns = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);
  const resourceKey = value => typeof value === 'string' && /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(value) ? value.toLowerCase() : undefined;
  const safeLabel = value => typeof value === 'string' && /^[a-zA-Z0-9 _.:/-]{1,100}$/.test(value) ? value : undefined;
  const sanitizeUrl = value => {
    try {
      const url = new URL(value, 'https://awesome.pawel.in');
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      url.username = ''; url.password = ''; url.hash = '';
      if (url.hostname !== 'awesome.pawel.in') url.pathname = '/';
      else if (!/^\/(?:$|(?:search|learn|tools|contribute|about|404\.html)\/?$|trending(?:\/(?:daily|weekly|monthly)\/(?:all|python|javascript|typescript|rust|go|java|cpp))?\/?$|(?:categories|discover)(?:\/[a-z0-9-]+)?\/?$|repositories\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/?$)/i.test(url.pathname)) url.pathname = '/404.html';
      for (const [key, value] of [...url.searchParams]) {
        if (!campaigns.has(key) || !safeLabel(value)) url.searchParams.delete(key);
      }
      return url.href;
    } catch { return ''; }
  };
  const context = () => {
    const path = win.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const validSlug = value => /^[a-z0-9-]+$/.test(value || '');
    const trending = /^\/trending(?:\/(?:daily|weekly|monthly)\/(?:all|python|javascript|typescript|rust|go|java|cpp))?\/$/.test(path);
    const type = trending ? 'trending' : path === '/' ? 'home' : parts[0] === 'repositories' && parts.length === 3 && resourceKey(parts.slice(1).join('/')) ? 'resource' : parts[0] === 'categories' && parts.length <= 2 && (!parts[1] || validSlug(parts[1])) ? 'category' : parts[0] === 'discover' && parts.length <= 2 && (!parts[1] || validSlug(parts[1])) ? (parts[1] ? 'collection' : 'collections') : parts.length === 1 && ['search', 'learn', 'tools', 'contribute', 'about'].includes(parts[0]) ? parts[0] : 'not_found';
    return {
      schema_version: 2, site: 'awesome-repos', environment: 'production', actor_type: 'visitor',
      release: settings.release, page_type: type, page_path: type === 'not_found' ? '/404.html' : path,
      visitor_status: visitorStatus,
      is_internal: (() => { try { return win.localStorage.getItem('awesome-analytics-internal') === 'true'; } catch { return false; } })(),
      ...(type === 'resource' && resourceKey(parts.slice(1).join('/')) ? { resource_key: resourceKey(parts.slice(1).join('/')) } : {}),
      ...(type === 'collection' ? { collection_slug: safeLabel(parts[1]) } : {}),
      ...(type === 'category' && parts[1] ? { category_slug: safeLabel(parts[1]) } : {}),
    };
  };
  const privacySignal = () => win.navigator.globalPrivacyControl === true || ['1', 'yes'].includes(win.navigator.doNotTrack);
  const optedOut = () => {
    try { return privacySignal() || win.localStorage.getItem('awesome-analytics-opt-out') === 'true'; }
    catch { return true; }
  };
  const permitted = () => settings.enabled && win.location.hostname === 'awesome.pawel.in' && !optedOut();
  const scrub = (value, key = '', depth = 0) => {
    if (depth > 8) return undefined;
    if (/^(?:query|raw_query|query_hash)$|password|secret|authorization|cookie|email|token|console|body|headers|exception_message/i.test(key)) return undefined;
    if (Array.isArray(value)) return value.slice(0, 100).map(v => scrub(v, key, depth + 1));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, k, depth + 1)]).filter(([, v]) => v !== undefined));
    if (typeof value === 'string') {
      if (/url|href|referrer|filename/i.test(key)) return sanitizeUrl(value);
      if (/[?&]q=|#|@|\b(?:ph[cp]_|sk-)[a-z0-9]/i.test(value)) return '[redacted]';
      return value.slice(0, 500);
    }
    return typeof value === 'number' && !Number.isFinite(value) ? undefined : value;
  };
  const properties = (name, values) => {
    const fields = settings.events[name];
    if (!fields) return null;
    const result = {};
    for (const field of fields) {
      const value = values[field];
      if (field === 'resource_key') { const key = resourceKey(value); if (key) result[field] = key; }
      else if (typeof value === 'boolean') result[field] = value;
      else if (typeof value === 'number' && Number.isFinite(value) && value >= 0) result[field] = value;
      else if (typeof value === 'string' && safeLabel(value)) result[field] = value;
    }
    if (['resource_opened', 'resource_selected'].includes(name) && !result.resource_key) return null;
    return { ...context(), ...result };
  };
  let sent = 0;
  const capture = (name, values = {}) => {
    try {
      if (!permitted() || sent >= 100) return;
      const data = properties(name, values);
      if (!data) return;
      win.posthog?.capture(name, data); sent++;
    } catch { /* Analytics must never break a user action. */ }
  };
  const exception = (flow = 'browser', kind = 'runtime_error') => {
    try {
      if (!permitted() || !settings.errorsEnabled || sent >= 100) return;
      // Do not forward arbitrary exception messages, frames, or rejected values.
      win.posthog?.captureException(new Error('Awesome Repos ' + (safeLabel(kind) || 'runtime_error')), { ...context(), flow: safeLabel(flow) || 'browser' });
      sent++;
    } catch { /* Optional diagnostics. */ }
  };
  const sampleSession = (id, rate = 0.1) => {
    let hash = 2166136261;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return hash / 4294967296 < rate;
  };
  const beforeSend = event => {
    if (!event || !permitted()) return null;
    if (event.event === '$exception' && !settings.errorsEnabled) return null;
    if (event.event === '$snapshot') {
      if (!settings.replayEnabled) return null;
      // The SDK has already masked DOM text/inputs and removed URL hashes. Preserve
      // its snapshot protocol (including long arrays and compressed payloads).
      return event;
    }
    if (!settings.events[event.event] && !['$pageview', '$pageleave', '$web_vitals', '$exception'].includes(event.event)) return null;
    const cleaned = scrub(event.properties || {});
    return { ...event, properties: { ...cleaned, ...context(),
      ...(['resource_selected', 'resource_opened'].includes(event.event) ? { resource_key: resourceKey(cleaned.resource_key) } : {}),
      ...(event.properties?.token === settings.apiKey ? { token: settings.apiKey } : {}),
    } };
  };
  const api = {
    capture, exception, sanitizeUrl, scrub, beforeSend, sampleSession, context,
    optOut() {
      try { win.localStorage.setItem('awesome-analytics-opt-out', 'true'); } catch {}
      try { win.posthog?.stopSessionRecording?.(); win.posthog?.opt_out_capturing?.(); } catch {}
    },
    isOptedOut: optedOut,
  };
  win.awesomeAnalytics = api;
  if (!permitted()) return api;
  // Search state belongs in the existing fragment. Remove unapproved URL query
  // parameters before the recorder sees its initial page metadata.
  try {
    const safe = new URL(sanitizeUrl(win.location.href));
    win.history?.replaceState(null, '', win.location.pathname + safe.search + win.location.hash);
  } catch {}

  // A bounded compatible queue also captures exceptions before the async SDK arrives.
  const queue = [];
  queue._i = [];
  queue.__SV = 1;
  for (const method of ['capture', 'captureException', 'register', 'set_config', 'opt_out_capturing', 'stopSessionRecording']) {
    queue[method] = (...args) => { if (queue.length < 100) queue.push([method, ...args]); };
  }
  queue.people = [];
  win.posthog = queue;
  const config = {
    api_host: settings.apiHost, ui_host: settings.uiHost, defaults: '2025-11-30',
    capture_pageview: true, capture_pageleave: true, autocapture: false,
    person_profiles: 'never', persistence: 'localStorage', cross_subdomain_cookie: false,
    respect_dnt: true, disable_capture_url_hashes: true, capture_exceptions: false,
    capture_performance: { web_vitals: true, web_vitals_allowed_metrics: ['LCP', 'INP', 'CLS'], network_timing: false },
    enable_recording_console_log: false, recordCanvas: false,
    disable_session_recording: true,
    session_recording: {
      sampleRate: 0.1, maskAllInputs: true, maskTextSelector: '*',
      maskAttributeFn: (name, value) => /^(?:href|src|action)$/i.test(name) ? sanitizeUrl(value) : /^(?:value|title|placeholder|aria-label|data-)/i.test(name) ? '[masked]' : value,
      recordHeaders: false, recordBody: false, recordCanvas: false,
      maskNetworkRequestFn: () => null,
    },
    before_send: beforeSend,
    loaded: ph => {
      if (!permitted()) { ph.opt_out_capturing(); return; }
      // Capture a safe landing URL before directory scripts update shareable filters.
      ph.register(context());
      ph.onSessionId?.(id => {
        try {
          const first = win.localStorage.getItem('awesome-analytics-first-session');
          if (!first) win.localStorage.setItem('awesome-analytics-first-session', id);
          visitorStatus = !first || first === id ? 'new' : 'returning';
          ph.register({ visitor_status: visitorStatus });
        } catch { visitorStatus = 'unknown'; }
        if (permitted() && context().page_type !== 'not_found' && settings.replayEnabled && sampleSession(id)) ph.startSessionRecording({ sampling: true });
        else ph.stopSessionRecording();
      });
    },
  };
  queue._i.push([settings.apiKey, config, 'posthog']);
  api.config = config;
  const script = win.document.createElement('script');
  script.async = true; script.crossOrigin = 'anonymous'; script.src = settings.apiHost + '/static/array.js';
  win.document.head.appendChild(script);
  win.addEventListener('error', () => exception('browser', 'runtime_error'));
  win.addEventListener('unhandledrejection', () => exception('browser', 'unhandled_rejection'));
  return api;
}
