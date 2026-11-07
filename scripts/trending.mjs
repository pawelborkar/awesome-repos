import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { languageSlugs, languageLabels, parseSnapshot, snapshotSchema, snapshotAgeHours } from './trending-data.mjs';

const DAY = 86400000;
const API_VERSION = '2026-03-10';
const deployedSnapshot = 'https://awesome.pawel.in/data/trending.json';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export class GitHubError extends Error {
  constructor(status) { super(`GitHub request failed (${status})`); this.status = status; }
}
export class RateLimitError extends Error {}

// Never forward a credential to a redirect outside the GitHub API.
export function githubClient({ token, fetchImpl = fetch, sleep = wait, now = Date.now } = {}) {
  let nextRequest = 0;
  let requests = 0;
  let exhausted = false;
  return async endpoint => {
    let url = new URL(endpoint, 'https://api.github.com');
    for (let attempt = 0, redirects = 0; ;) {
      if (url.origin !== 'https://api.github.com') throw Error('Unexpected GitHub redirect origin');
      if (exhausted) throw new RateLimitError('GitHub rate limit exhausted; retaining the previous snapshot until the next run.');
      if (++requests > 500) throw Error('Trending request budget exhausted');
      const delay = nextRequest - now();
      if (delay > 0) await sleep(delay);
      nextRequest = now() + (url.pathname.startsWith('/search/') ? 2100 : 1000);
      let response;
      try {
        response = await fetchImpl(url, {
          headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION, 'User-Agent': 'awesome-repositories-trending', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          redirect: 'manual', signal: AbortSignal.timeout(15000),
        });
      } catch {
        if (attempt++ < 2) { await sleep(1000 * 2 ** attempt); continue; }
        throw new GitHubError(0);
      }
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || ++redirects > 3) throw Error('Invalid GitHub redirect');
        url = new URL(location, url); continue;
      }
      if ([403, 429].includes(response.status)) {
        // Leave the existing snapshot in place rather than retrying into a limit.
        const retry = response.headers.get('retry-after');
        const reset = response.headers.get('x-ratelimit-reset');
        throw new RateLimitError(`GitHub access or rate limit (${response.status}); retry-after=${retry || 'unspecified'}, reset=${reset || 'unspecified'}`);
      }
      if (response.status >= 500 && attempt++ < 2) { await sleep(1000 * 2 ** attempt); continue; }
      if (!response.ok) throw new GitHubError(response.status);
      if (response.headers.get('x-ratelimit-remaining') === '0') {
        exhausted = true;
      }
      try { return await response.json(); }
      catch { throw new GitHubError(0); }
    }
  };
}

export function discoveryQueries(now = Date.now()) {
  const date = days => new Date(now - days * DAY).toISOString().slice(0, 10);
  return languageSlugs.flatMap(language => ['pushed', 'created'].map(kind => {
    const q = `is:public fork:false archived:false ${kind}:>=${date(kind === 'pushed' ? 30 : 90)}${language === 'all' ? '' : ` language:"${languageLabels[language]}"`}`;
    return `/search/repositories?${new URLSearchParams({ q, sort: 'stars', order: 'desc', per_page: '25' })}`;
  }));
}

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const candidateSchema = z.object({
  id: integer.positive(), full_name: z.string().regex(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i),
  description: z.string().max(10000).nullable(), language: z.string().max(100).nullable(),
  stargazers_count: integer, forks_count: integer, fork: z.boolean(), archived: z.boolean(),
  created_at: z.iso.datetime(),
});
const searchSchema = z.object({ incomplete_results: z.literal(false), items: z.array(candidateSchema).max(25) });
const historySchema = z.array(z.object({ week: integer, total: integer, days: z.array(integer).length(7) })).min(1).max(6);

export async function discoverCandidates(request, now) {
  const candidates = new Map();
  for (const query of discoveryQueries(now)) {
    const result = searchSchema.parse(await request(query));
    for (const repo of result.items) if (!repo.fork && !repo.archived) candidates.set(repo.id, repo);
  }
  return [...candidates.values()];
}

export function aggregateHistory(value, createdAt, now = Date.now()) {
  const weeks = historySchema.parse(value).sort((a, b) => b.week - a.week);
  if (new Set(weeks.map(w => w.week)).size !== weeks.length || weeks.some(w => w.total !== w.days.reduce((sum, n) => sum + n, 0))) throw Error('Invalid star-history buckets');
  for (let i = 1; i < weeks.length; i++) if (weeks[i - 1].week - weeks[i].week !== 7 * DAY / 1000) throw Error('Missing star-history week');
  const anchor = weeks[0].week * 1000;
  if (anchor > now || now - anchor >= 7 * DAY) throw Error('Star history is not current');
  // Use the source's own week anchor, rather than assuming UTC midnight.
  const day = anchor + Math.floor((now - anchor) / DAY) * DAY;
  const counts = new Map(weeks.flatMap(w => w.days.map((n, i) => [w.week * 1000 + i * DAY, n])));
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created) || created > now) throw Error('Invalid repository creation date');
  const sum = days => {
    let total = 0;
    for (let i = 0; i < days; i++) {
      const bucket = day - i * DAY;
      if (!counts.has(bucket) && bucket + DAY > created) throw Error('Insufficient star history');
      total += counts.get(bucket) || 0;
    }
    return total;
  };
  return { daily: sum(1), weekly: sum(7), monthly: sum(30) };
}

export async function refreshTrending({ request, previous = null, now = Date.now() }) {
  try {
    const candidates = await discoverCandidates(request, now);
    const repositories = [], failures = [];
    for (const repo of candidates) {
      let history;
      try { history = await request(`/repos/${repo.full_name}/stargazers/history?per_page=6`); }
      catch (error) {
        if (!(error instanceof GitHubError) || error.status === 401) throw error;
        failures.push({ id: repo.id, reason: 'history_unavailable' }); continue;
      }
      try {
        const gains = aggregateHistory(history, repo.created_at, now);
        repositories.push({ id: repo.id, key: repo.full_name, description: repo.description || '', language: repo.language, stars: repo.stargazers_count, forks: repo.forks_count, gains });
      } catch { failures.push({ id: repo.id, reason: 'invalid_history' }); }
    }
    if (!repositories.some(r => r.gains.monthly > 0)) throw Error('Refresh produced no usable star-growth data');
    const snapshot = snapshotSchema.parse({ version: 1, fetchedAt: new Date(now).toISOString(), repositories, coverage: { candidateCount: candidates.length, successCount: repositories.length, excludedCount: failures.length, searchCount: 16, failures } });
    return { snapshot, refreshed: true, error: null };
  } catch (error) {
    return { snapshot: parseSnapshot(previous, now), refreshed: false, error: error instanceof RateLimitError ? error.message : 'Trending refresh failed; discovery or history data was unavailable or invalid.' };
  }
}

export function readSnapshot(file, now = Date.now()) {
  try { return parseSnapshot(JSON.parse(readFileSync(file, 'utf8')), now); } catch { return null; }
}

export async function fallbackSnapshot({ localFile, production = false, fetchImpl = fetch, now = Date.now() }) {
  if (production) {
    try {
      const response = await fetchImpl(deployedSnapshot, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (response.ok) {
        const published = parseSnapshot(await response.json(), now);
        if (published) return published;
      }
    } catch { /* The local cache is a secondary fallback. */ }
  }
  return readSnapshot(localFile, now);
}

export function refreshSummary(result, now = Date.now()) {
  const snapshot = result.snapshot;
  return `## Trending refresh\n\n- Outcome: ${result.refreshed ? 'refreshed' : snapshot ? 'retained previous snapshot' : 'unavailable'}\n- Candidates: ${snapshot?.coverage.candidateCount ?? 0}\n- Usable histories: ${snapshot?.coverage.successCount ?? 0}\n- Excluded histories: ${snapshot?.coverage.excludedCount ?? 0}\n- Snapshot: ${snapshot?.fetchedAt ?? 'none'}\n- Snapshot age: ${snapshot ? snapshotAgeHours(snapshot, now).toFixed(1) + ' hours' : 'unavailable'}\n${result.error ? `- Note: ${result.error}\n` : ''}`;
}

async function main() {
  const localFile = path.resolve('.cache/trending.json');
  const previous = await fallbackSnapshot({ localFile, production: process.argv.includes('--production') });
  const token = process.env.GITHUB_TOKEN;
  const result = token ? await refreshTrending({ request: githubClient({ token }), previous }) : { snapshot: previous, refreshed: false, error: 'GITHUB_TOKEN is absent; keeping previously fetched data.' };
  if (result.snapshot || existsSync(localFile)) {
    mkdirSync(path.dirname(localFile), { recursive: true });
    writeFileSync(localFile + '.tmp', JSON.stringify(result.snapshot, null, 2) + '\n');
    renameSync(localFile + '.tmp', localFile);
  }
  const summary = refreshSummary(result);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
