import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoveryQueries, discoverCandidates, aggregateHistory, githubClient, GitHubError, RateLimitError, refreshTrending, fallbackSnapshot, refreshSummary } from '../scripts/trending.mjs';
import { snapshotSchema, parseSnapshot, rankedRepositories, trendingPath, snapshotAgeHours } from '../scripts/trending-data.mjs';
import { trendingFixture } from './fixtures/trending.mjs';

const DAY = 86400000;
const now = Date.parse('2026-10-27T08:00:00Z');
const created = '2020-01-01T00:00:00Z';
const candidate = (id = 1, overrides = {}) => ({ id, full_name: `example/repo-${id}`, description: null, language: 'Python', stargazers_count: 100, forks_count: 10, fork: false, archived: false, created_at: created, ...overrides });
function history(time = now, count = 2, offset = 0) {
  const date = new Date(time);
  const sunday = Math.floor(time / DAY) * DAY - date.getUTCDay() * DAY + offset;
  return Array.from({ length: 6 }, (_, i) => {
    const week = sunday - i * 7 * DAY;
    const days = Array.from({ length: 7 }, (_, day) => week + day * DAY <= time ? count : 0);
    return { week: week / 1000, total: days.reduce((sum, n) => sum + n, 0), days };
  });
}
const requestFor = (items, histories = async () => history()) => async endpoint => endpoint.startsWith('/search/') ? { incomplete_results: false, items } : histories(endpoint);

test('discovery issues sixteen bounded queries with language/date qualifiers', () => {
  const queries = discoveryQueries(now).map(q => new URL(q, 'https://api.github.com'));
  assert.equal(queries.length, 16);
  for (const query of queries) {
    assert.equal(query.searchParams.get('per_page'), '25');
    assert.equal(query.searchParams.get('sort'), 'stars');
    assert.equal(query.searchParams.get('order'), 'desc');
    assert.match(query.searchParams.get('q'), /is:public fork:false archived:false/);
  }
  assert.match(queries[0].searchParams.get('q'), /pushed:>=2026-09-27/);
  assert.match(queries[1].searchParams.get('q'), /created:>=2026-07-29/);
  assert.match(queries.at(-1).searchParams.get('q'), /language:"C\+\+"/);
});

test('discovery merges IDs across languages/queries and excludes forks/archives', async () => {
  let calls = 0;
  const repos = await discoverCandidates(async () => ({ incomplete_results: false, items: [candidate(1, { full_name: ++calls === 1 ? 'old/name' : 'new/name' }), candidate(2, { fork: true }), candidate(3, { archived: true })] }), now);
  assert.equal(calls, 16);
  assert.deepEqual(repos.map(r => r.full_name), ['new/name']);
});

test('aggregation crosses week/month/year boundaries and includes partial current day', () => {
  for (const time of [now, Date.parse('2027-01-01T05:00:00Z'), Date.parse('2026-11-01T12:00:00Z')]) {
    assert.deepEqual(aggregateHistory(history(time), created, time), { daily: 2, weekly: 14, monthly: 60 });
  }
  assert.deepEqual(aggregateHistory(history(now, 3, -3600000), created, now), { daily: 3, weekly: 21, monthly: 90 });
  const weeks = history(); weeks[0].days[2] = 11; weeks[0].total += 9;
  assert.deepEqual(aggregateHistory(weeks, created, now), { daily: 11, weekly: 23, monthly: 69 });
});

test('missing, stale, inconsistent and noncontiguous history is never zero growth', () => {
  assert.throws(() => aggregateHistory([], created, now));
  assert.throws(() => aggregateHistory(history().slice(0, 1), created, now));
  assert.throws(() => aggregateHistory(history(now - 7 * DAY), created, now));
  const gap = history(); gap.splice(2, 1); assert.throws(() => aggregateHistory(gap, created, now));
  const bad = history(); bad[0].total++; assert.throws(() => aggregateHistory(bad, created, now));
  const duplicate = history(); duplicate[1] = duplicate[0]; assert.throws(() => aggregateHistory(duplicate, created, now));
  const recent = history().slice(0, 1);
  assert.deepEqual(aggregateHistory(recent, '2026-10-25T00:00:00Z', now), { daily: 2, weekly: 6, monthly: 6 });
});

test('ranking uses gains, stars and stable names, exact primary languages, and 25-item cap', () => {
  const snapshot = trendingFixture(now);
  assert.deepEqual(rankedRepositories(snapshot).map(r => r.id), [2, 1, 4]);
  assert.deepEqual(rankedRepositories(snapshot, 'monthly').map(r => r.id), [1, 2, 4, 3]);
  assert.deepEqual(rankedRepositories(snapshot, 'weekly', 'cpp').map(r => r.id), [3]);
  assert.deepEqual(rankedRepositories(snapshot, 'daily', 'java'), []);
  assert.deepEqual(rankedRepositories(snapshot, 'unknown'), []);
  const many = { repositories: Array.from({ length: 30 }, (_, i) => ({ ...snapshot.repositories[0], id: i + 1, key: `owner/repo-${String(i).padStart(2, '0')}` })).reverse() };
  const ranked = rankedRepositories(many);
  assert.equal(ranked.length, 25); assert.equal(ranked[0].key, 'owner/repo-00');
  assert.equal(trendingPath('daily', 'all'), '/trending/');
  assert.equal(trendingPath('monthly', 'cpp'), '/trending/monthly/cpp/');
});

test('snapshot validation rejects duplicate/inconsistent inventory and future data', () => {
  const snapshot = trendingFixture(now);
  assert.ok(parseSnapshot(snapshot, now));
  assert.equal(snapshotAgeHours(snapshot, now + 13 * 3600000), 13);
  assert.equal(parseSnapshot({ ...snapshot, version: 2 }, now), null);
  assert.equal(parseSnapshot({ ...snapshot, fetchedAt: new Date(now + DAY).toISOString() }, now), null);
  assert.throws(() => snapshotSchema.parse({ ...snapshot, repositories: [...snapshot.repositories, snapshot.repositories[0]] }));
  assert.equal(parseSnapshot({ ...snapshot, coverage: { ...snapshot.coverage, candidateCount: 100 } }, now), null);
});

test('refresh records excluded histories, preserves zero daily growth and supports null metadata', async () => {
  const result = await refreshTrending({ now, request: requestFor([candidate(1), candidate(2), candidate(3), candidate(4)], async endpoint => {
    if (endpoint.includes('repo-2/')) throw new GitHubError(404);
    if (endpoint.includes('repo-3/')) return [];
    if (endpoint.includes('repo-4/')) {
      const weeks = history(); weeks[0].days[2] = 0; weeks[0].total -= 2; return weeks;
    }
    return history();
  }) });
  assert.equal(result.refreshed, true);
  assert.deepEqual(result.snapshot.coverage, { candidateCount: 4, successCount: 2, excludedCount: 2, searchCount: 16, failures: [{ id: 2, reason: 'history_unavailable' }, { id: 3, reason: 'invalid_history' }] });
  assert.equal(result.snapshot.repositories[1].gains.daily, 0);
  assert.equal(result.snapshot.repositories[0].description, '');
  assert.match(refreshSummary(result, now), /Excluded histories: 2/);
});

test('failed/incomplete discovery, rate limits, and unusable growth retain the original snapshot', async () => {
  const previous = trendingFixture(now - DAY);
  for (const request of [
    async () => { throw new GitHubError(401); },
    async () => ({ incomplete_results: true, items: [candidate()] }),
    requestFor([candidate()], async () => { throw new RateLimitError('rate limit'); }),
    requestFor([candidate()], async () => []),
    requestFor([candidate()], async () => history(now, 0)),
    requestFor([]),
  ]) {
    const result = await refreshTrending({ request, previous, now });
    assert.equal(result.refreshed, false);
    assert.deepEqual(result.snapshot, previous);
    assert.match(refreshSummary(result, now), /Snapshot age: 24.0 hours/);
  }
  const unavailable = await refreshTrending({ now, request: async () => { throw Error('offline'); } });
  assert.equal(unavailable.snapshot, null);
  assert.match(refreshSummary(unavailable, now), /Outcome: unavailable/);
});

test('fallback prefers the deployed snapshot and tolerates first-run/network/invalid data', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'trending-'));
  const localFile = path.join(dir, 'snapshot.json');
  try {
    const local = trendingFixture(now - DAY), published = trendingFixture(now - 3600000);
    writeFileSync(localFile, JSON.stringify(local));
    assert.deepEqual(await fallbackSnapshot({ localFile, now }), local);
    assert.deepEqual(await fallbackSnapshot({ localFile, production: true, now, fetchImpl: async () => Response.json(published) }), published);
    for (const fetchImpl of [async () => { throw Error('offline'); }, async () => Response.json(null), async () => new Response('', { status: 404 }), async () => Response.json({ ...published, version: 99 })])
      assert.deepEqual(await fallbackSnapshot({ localFile, production: true, now, fetchImpl }), local);
    writeFileSync(localFile, 'invalid json');
    assert.equal(await fallbackSnapshot({ localFile, now }), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function mockedClient(responses) {
  const calls = [], delays = [];
  let time = now;
  const request = githubClient({ token: 'test-secret', now: () => time, sleep: async ms => { delays.push(ms); time += ms; }, fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    if (!response) throw Error('Unexpected extra request');
    return response;
  } });
  return { request, calls, delays };
}

test('API client follows same-origin redirects, authenticates and paces search/history', async () => {
  const { request, calls, delays } = mockedClient([
    new Response(null, { status: 301, headers: { location: '/repositories/1/stargazers/history' } }), Response.json([]), Response.json([]),
  ]);
  await request('/search/repositories?q=example'); await request('/repos/o/r/stargazers/history');
  assert.equal(calls[1].url, 'https://api.github.com/repositories/1/stargazers/history');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-secret');
  assert.deepEqual(delays, [2100, 1000]);
  const unsafe = mockedClient([new Response(null, { status: 302, headers: { location: 'https://example.com/private' } })]);
  await assert.rejects(unsafe.request('/repos/o/r'), /redirect origin/); assert.equal(unsafe.calls.length, 1);
});

test('API client retries transient errors but stops on rate/access limits and exhausted headers', async () => {
  const transient = mockedClient([new Response('', { status: 502 }), new Error('timeout'), Response.json({ ok: true })]);
  assert.deepEqual(await transient.request('/repos/o/r'), { ok: true }); assert.equal(transient.calls.length, 3);
  for (const status of [403, 429]) {
    const limited = mockedClient([new Response('', { status, headers: { 'retry-after': '60', 'x-ratelimit-reset': '1234' } })]);
    await assert.rejects(limited.request('/repos/o/r'), error => error instanceof RateLimitError && /retry-after=60/.test(error.message));
    assert.equal(limited.calls.length, 1);
  }
  const exhausted = mockedClient([Response.json({ ok: true }, { headers: { 'x-ratelimit-remaining': '0' } })]);
  await exhausted.request('/repos/o/r');
  await assert.rejects(exhausted.request('/repos/o/r'), RateLimitError); assert.equal(exhausted.calls.length, 1);
  const malformed = mockedClient([new Response('invalid JSON', { status: 200 })]);
  await assert.rejects(malformed.request('/repos/o/r/stargazers/history'), GitHubError);
});
