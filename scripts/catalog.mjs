import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const slug = value => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const plain = text => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[*_`]/g, '').replace(/\\\|/g, '|').replace(/&amp;/g, '&').trim();
export function parseReadme(markdown) {
  const resources = new Map(), categories = [];
  let category;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('### ')) {
      category = { name: line.slice(4).trim(), slug: slug(line.slice(4)) };
      if (categories.some(c => c.slug === category.slug)) throw Error('Duplicate category slug');
      categories.push(category);
    }
    if (!category || !line.startsWith('|')) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map(v => v.trim());
    const match = cells[0]?.match(/^\[([^\]]+)\]\(https:\/\/github\.com\/([^/\s]+)\/([^/\s)]+)\/?\)$/i);
    if (!match) continue;
    if (cells.length < 3) throw Error(`Malformed resource: ${line}`);
    const key = `${match[2]}/${match[3]}`.toLowerCase();
    const current = resources.get(key);
    if (current) { if (!current.categories.includes(category.slug)) current.categories.push(category.slug); continue; }
    const licenseText = cells.at(-1);
    const licenses = [...licenseText.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map(m => ({ name: m[1], url: m[2] }));
    resources.set(key, { key, owner: match[2], repository: match[3], name: plain(match[1]), description: plain(cells.slice(1, -1).join(' | ')), url: `https://github.com/${match[2]}/${match[3]}`, categories: [category.slug], licenses: licenses.length ? licenses : [{ name: plain(licenseText) || 'Unknown', url: null }] });
  }
  if (!categories.length || !resources.size) throw Error('README contains no catalog');
  return { categories, resources: [...resources.values()].sort((a,b) => a.name.localeCompare(b.name)) };
}
export const annotationSchema = z.object({
  key: z.string().regex(/^[^/\s]+\/[^/\s]+$/), reviewed: z.boolean().default(false),
  journey: z.enum(['learn','tools','both']), type: z.enum(['course','book','tutorial','exercises','list','library','framework','application','sdk','reference','unclassified']),
  technologies: z.array(z.string()).default([]), level: z.enum(['beginner','intermediate','advanced','all-levels','unclassified']).default('unclassified'),
  audience: z.string().default(''), value: z.string().default(''), limitations: z.string().default(''),
  sources: z.array(z.url().refine(url => /^https?:\/\//.test(url), "Source must use HTTP(S)")).default([]), updated: z.iso.date(),
});
export const collectionSchema = z.object({
  title: z.string().min(8), description: z.string().min(25), reviewed: z.boolean().default(false), updated: z.iso.date(),
  journey: z.enum(['learn','tools','both']), resources: z.array(z.string()).min(1), selection: z.string().min(40),
});
export const collectionIndexable = (reviewed, keys, body) => reviewed && new Set(keys).size>=5 && body.trim().length>=160;
export function loadCatalog() {
  const catalog = parseReadme(readFileSync(path.join(root, 'README.md'), 'utf8'));
  const categoryNotes=JSON.parse(readFileSync(path.join(root,'content/categories.json'),'utf8'));
  const categorySchema=z.object({title:z.string().min(10),intro:z.string().min(160),selection:z.string().min(40),reviewed:z.boolean(),updated:z.iso.date()});
  for(const [key,note] of Object.entries(categoryNotes)){if(!catalog.categories.some(c=>c.slug===key))throw Error(`Unknown category editorial: ${key}`);categorySchema.parse(note);}
  for(const category of catalog.categories)category.editorial=categoryNotes[category.slug]||null;
  const annotations = JSON.parse(readFileSync(path.join(root,'content/resources/annotations.json'),'utf8')).map(x => annotationSchema.parse(x));
  if (new Set(annotations.map(a=>a.key)).size !== annotations.length) throw Error('Duplicate resource annotation');
  const statsPath = path.join(root,'.cache/github-metadata.json');
  const snapshots = existsSync(statsPath) ? JSON.parse(readFileSync(statsPath,'utf8')) : {};
  const educationCategories = ['ai-learning','books','career','cheatsheets','competitive-programming','courses-and-certifications','education','reading-list','system-design','opportunities-and-programs'];
  for (const resource of catalog.resources) {
    const annotation = annotations.find(a => a.key === resource.key);
    resource.annotation = annotation || null;
    resource.journey = annotation?.reviewed ? annotation.journey : educationCategories.some(c=>resource.categories.includes(c)) ? 'learn' : 'both';
    resource.type = annotation?.reviewed ? annotation.type : 'unclassified';
    resource.technologies = annotation?.reviewed ? annotation.technologies : [];
    resource.level = annotation?.reviewed ? annotation.level : 'unclassified';
    resource.path = `/repositories/${resource.key}/`;
    const snapshot = snapshots[resource.key];
    resource.metrics = snapshot && Number.isSafeInteger(snapshot.stars) && snapshot.stars >= 0 && Number.isSafeInteger(snapshot.forks) && snapshot.forks >= 0 && !Number.isNaN(Date.parse(snapshot.fetchedAt)) ? snapshot : null;
    resource.indexable = !!(annotation?.reviewed && annotation.audience && annotation.value && annotation.limitations && annotation.sources.length);
  }
  for (const a of annotations) if (!catalog.resources.some(r=>r.key===a.key)) throw Error(`Unknown annotation: ${a.key}`);
  const collections = readdirSync(path.join(root,'content/collections')).filter(f=>f.endsWith('.md')).map(file=>{
    const {data,content}=matter(readFileSync(path.join(root,'content/collections',file),'utf8'));
    const parsed=collectionSchema.parse(data);
    const keys=[...new Set(parsed.resources)];
    for(const key of keys) if(!catalog.resources.some(r=>r.key===key)) throw Error(`Unknown collection resource: ${key}`);
    return {...parsed,resources:keys,slug:file.slice(0,-3),body:content,indexable:collectionIndexable(parsed.reviewed,keys,content)};
  });
  return {...catalog,collections};
}
export function generate() {
  const catalog=loadCatalog();
  mkdirSync(path.join(root,'site/src/generated'),{recursive:true});
  writeFileSync(path.join(root,'site/src/generated/catalog.json'),JSON.stringify(catalog));
  console.log(`Catalog: ${catalog.resources.length} repositories, ${catalog.categories.length} categories, ${catalog.collections.length} curated collections`);
  return catalog;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) generate();
