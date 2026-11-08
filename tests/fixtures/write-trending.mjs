import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { trendingFixture } from './trending.mjs';

const destination = process.argv[2] || 'reports/trending-fixture.json';
mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(trendingFixture(Date.now() - 13 * 3600000), null, 2) + '\n');
console.log(`Wrote an isolated stale snapshot fixture to ${destination}`);
