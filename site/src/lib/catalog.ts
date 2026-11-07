import data from '../generated/catalog.json';
import type { z } from 'zod';
import type { annotationSchema, categorySchema, collectionSchema } from '../../../scripts/catalog.mjs';
interface Metrics { id: number; canonical: string; stars: number; forks: number; archived: boolean; fetchedAt: string }
export type Resource = Omit<typeof data.resources[number], 'metrics' | 'annotation'> & { metrics: Metrics | null; annotation: z.infer<typeof annotationSchema> | null };
export type Collection = z.infer<typeof collectionSchema> & { slug: string; body: string; indexable: boolean };
export type Category = Omit<typeof data.categories[number], 'editorial'> & { editorial: z.infer<typeof categorySchema> | null };
// The catalog generator validates enum values before serializing; JSON imports widen them to string.
export const resources = data.resources as Resource[];
export const categories: Category[] = data.categories;
export const collections = (data.collections as Collection[]).filter(c => c.reviewed);
export const categoryName = (slug: string) => categories.find(c=>c.slug===slug)?.name || slug;
export const compact = (n: number) => new Intl.NumberFormat('en', {notation:'compact', maximumFractionDigits:1}).format(n);
export const production = process.env.PRODUCTION === 'true';
export const origin = 'https://awesome.pawel.in';
export const matching = (journey: string) => resources.filter(r=>r.journey===journey || r.journey==='both');
