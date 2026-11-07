import { fileURLToPath } from 'node:url';
import { readSnapshot } from '../../../scripts/trending.mjs';
import { snapshotSchema } from '../../../scripts/trending-data.mjs';
import type { z } from 'zod';

export { periods, periodLabels, languageSlugs, languageLabels, trendingPath, repositoryUrl, rankedRepositories, snapshotAgeHours } from '../../../scripts/trending-data.mjs';
export type TrendingSnapshot = z.infer<typeof snapshotSchema>;
export type TrendingPeriod = keyof TrendingSnapshot['repositories'][number]['gains'];
export type TrendingLanguage = typeof import('../../../scripts/trending-data.mjs').languageSlugs[number];

// Both page rendering and the JSON endpoint read the same validated offline input.
const snapshotFile = process.env.TRENDING_SNAPSHOT_PATH || fileURLToPath(new URL('../../../.cache/trending.json', import.meta.url));
export const trendingSnapshot: TrendingSnapshot | null = readSnapshot(snapshotFile);
