import data from '../generated/catalog.json';
interface Metrics { id: number; canonical: string; stars: number; forks: number; archived: boolean; fetchedAt: string }
export type Resource = Omit<typeof data.resources[number], 'metrics'> & { metrics: Metrics | null };
export const resources: Resource[] = data.resources;
export const categories = data.categories;
export const collections = data.collections.filter(c => c.reviewed);
export const categoryName = (slug: string) => categories.find(c=>c.slug===slug)?.name || slug;
export const compact = (n: number) => new Intl.NumberFormat('en', {notation:'compact', maximumFractionDigits:1}).format(n);
export const production = process.env.PRODUCTION === 'true';
export const origin = 'https://awesome.pawel.in';
export const matching = (journey: string) => resources.filter(r=>r.journey===journey || r.journey==='both');
