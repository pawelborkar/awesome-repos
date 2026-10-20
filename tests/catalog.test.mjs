import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseReadme,loadCatalog,annotationSchema,collectionSchema,collectionIndexable,slug} from '../scripts/catalog.mjs';
test('imports real catalog and preserves repeated membership',()=>{
 const data=loadCatalog();assert.ok(data.resources.length>=255);assert.ok(data.categories.length>=34);
 const duplicate=data.resources.find(r=>r.key==='ritikpatni/front-end-web-development-resources');assert.equal(duplicate.categories.length,1); // duplicate appears twice within the same category
 assert.ok(data.collections.length>=10);
 assert.ok(data.collections.every(c=>!c.indexable||(c.reviewed&&c.resources.length>=5)));
});
test('merges case-insensitive repository identities across categories',()=>{
 const data=parseReadme('### One\n| [Example](https://github.com/Owner/Repo) | Text | No License |\n### Two\n| [Example](https://github.com/owner/repo) | Text | No License |');
 assert.equal(data.resources.length,1);assert.deepEqual(data.resources[0].categories,['one','two']);
});
test('preserves escaped pipes, multiple licenses, and descriptions',()=>{
 const data=parseReadme('### Test\n| [Example](https://github.com/o/r) | A \\| B | [MIT](https://example.com/license) / [Apache](https://example.com/apache) |');
 assert.equal(data.resources[0].description,'A | B');assert.equal(data.resources[0].licenses.length,2);
});
test('fails empty and conflicting category inputs',()=>{
 assert.throws(()=>parseReadme('not a catalog'));
 assert.throws(()=>parseReadme('### A B\n### A-B'));
});
test('classification schema rejects invented levels and invalid sources',()=>{
 const annotation=JSON.parse(readFileSync('content/resources/annotations.json','utf8'))[0];
 assert.throws(()=>annotationSchema.parse({...annotation,level:'expert-only'}));
 assert.throws(()=>annotationSchema.parse({...annotation,sources:['javascript:alert(1)']}));
});
test('thin collection cannot satisfy the indexability gate',()=>{
 const c=loadCatalog().collections[0];assert.ok(collectionSchema.safeParse(c).success);
 assert.equal(collectionIndexable(true,['one/repo'],'Useful guidance. '.repeat(30)),false);
 assert.equal(collectionIndexable(false,c.resources,c.body),false);
 assert.equal(collectionIndexable(true,c.resources,'Too thin'),false);
 assert.equal(collectionIndexable(true,c.resources,c.body),true);
});
test('slugs are stable across punctuation and spacing',()=>assert.equal(slug('Courses & Certifications'),'courses-and-certifications'));
