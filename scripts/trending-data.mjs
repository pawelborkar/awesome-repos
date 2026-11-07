import { z } from 'zod';

/** @type {readonly ['daily', 'weekly', 'monthly']} */
export const periods = ['daily', 'weekly', 'monthly'];
export const periodDays = { daily: 1, weekly: 7, monthly: 30 };
export const periodLabels = { daily: 'Today', weekly: 'Last 7 days', monthly: 'Last 30 days' };
/** @type {readonly ['all', 'python', 'javascript', 'typescript', 'rust', 'go', 'java', 'cpp']} */
export const languageSlugs = ['all', 'python', 'javascript', 'typescript', 'rust', 'go', 'java', 'cpp'];
export const languageLabels = { all: 'All languages', python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', rust: 'Rust', go: 'Go', java: 'Java', cpp: 'C++' };
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identity = z.string().regex(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i);
export const snapshotSchema = z.object({
  version: z.literal(1),
  fetchedAt: z.iso.datetime(),
  repositories: z.array(z.object({
    id: count.positive(), key: identity, description: z.string().max(10000),
    language: z.string().max(100).nullable(), stars: count, forks: count,
    gains: z.object({ daily: count, weekly: count, monthly: count }),
  })).max(400),
  coverage: z.object({
    candidateCount: count.max(400), successCount: count.max(400), excludedCount: count.max(400),
    searchCount: z.literal(16),
    failures: z.array(z.object({ id: count.positive(), reason: z.enum(['history_unavailable', 'invalid_history']) })).max(400),
  }),
}).superRefine((snapshot, ctx) => {
  const { repositories, coverage } = snapshot;
  if (new Set(repositories.map(r => r.id)).size !== repositories.length || new Set(repositories.map(r => r.key.toLowerCase())).size !== repositories.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate repository identity' });
  if (coverage.successCount !== repositories.length || coverage.excludedCount !== coverage.failures.length || coverage.candidateCount !== coverage.successCount + coverage.excludedCount)
    ctx.addIssue({ code: 'custom', message: 'Coverage does not match repository inventory' });
  if (new Set(coverage.failures.map(f => f.id)).size !== coverage.failures.length || coverage.failures.some(f => repositories.some(r => r.id === f.id)))
    ctx.addIssue({ code: 'custom', message: 'Invalid excluded repository inventory' });
  if (repositories.some(r => r.gains.daily > r.gains.weekly || r.gains.weekly > r.gains.monthly))
    ctx.addIssue({ code: 'custom', message: 'Inconsistent period gains' });
});

export const trendingPath = (period, language) => period === 'daily' && language === 'all' ? '/trending/' : `/trending/${period}/${language}/`;
export const repositoryUrl = key => `https://github.com/${key}`;
/**
 * @param {import('zod').infer<typeof snapshotSchema> | null} snapshot
 * @param {typeof periods[number]} [period]
 * @param {typeof languageSlugs[number]} [language]
 */
export function rankedRepositories(snapshot, period = 'daily', language = 'all') {
  if (!snapshot || !periods.includes(period) || !languageSlugs.includes(language)) return [];
  return snapshot.repositories.filter(r => r.gains[period] > 0 && (language === 'all' || r.language?.toLowerCase() === languageLabels[language].toLowerCase()))
    .sort((a, b) => b.gains[period] - a.gains[period] || b.stars - a.stars || (a.key.toLowerCase() < b.key.toLowerCase() ? -1 : a.key.toLowerCase() > b.key.toLowerCase() ? 1 : 0)).slice(0, 25);
}
export const snapshotAgeHours = (snapshot, now = Date.now()) => snapshot ? Math.max(0, (now - Date.parse(snapshot.fetchedAt)) / 3600000) : null;

export function parseSnapshot(value, now = Date.now()) {
  const result = snapshotSchema.safeParse(value);
  return result.success && Date.parse(result.data.fetchedAt) <= now + 300000 && result.data.repositories.some(r => r.gains.monthly > 0) ? result.data : null;
}
