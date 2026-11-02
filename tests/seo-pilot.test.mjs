import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {loadCatalog, collectionSchema} from '../scripts/catalog.mjs';
import {validatePilot,planPromotion,reviewMarkdown,sha256} from '../scripts/seo-pilot.mjs';

const pilot=JSON.parse(readFileSync('content/seo-pilot.json','utf8'));
const catalog=loadCatalog();
const clone=()=>structuredClone(pilot);

test('pilot has complete source coverage without enabling its unapproved drafts',()=>{
  validatePilot(pilot,catalog);
  assert.equal(pilot.records.length,22);
  assert.equal(pilot.records.filter(r=>r.kind==='annotation').length,12);
  assert.equal(pilot.records.filter(r=>r.kind==='category').length,3);
  assert.equal(pilot.records.filter(r=>r.kind==='collection').length,7);
  assert.ok(pilot.records.every(r=>r.data.reviewed===false));
  // Approval lives in the published source files, never in this draft manifest.
  assert.ok(!catalog.collections.some(c=>c.slug==='choosing-github-learning-resources') || catalog.collections.find(c=>c.slug==='choosing-github-learning-resources').reviewed);
});

test('unverified inventory, duplicate destinations, and unsupported comparisons are rejected',()=>{
  const missing=clone();missing.source_checks=missing.source_checks.filter(s=>s.key!=='faif/python-patterns');
  assert.throws(()=>validatePilot(missing,catalog),/Missing source check/);
  const duplicate=clone();duplicate.records.push({...duplicate.records[0],id:'R99'});
  assert.throws(()=>validatePilot(duplicate,catalog),/Duplicate draft destination/);
  const outside=clone();outside.records.find(r=>r.id==='C01').data.comparison[0].key='rust-lang/book';
  assert.throws(()=>validatePilot(outside,catalog),/Invalid comparison/);
  const unsafe=clone();unsafe.records[0].data.sources=['javascript:alert(1)'];
  assert.throws(()=>validatePilot(unsafe,catalog));
});

test('promotion is selective and preserves unrelated annotation content',()=>{
  const data=clone();
  // An isolated pre-approval snapshot makes this test independent of later releases.
  const originals=catalog.resources.filter(r=>r.annotation && !pilot.records.some(p=>p.kind==='annotation'&&p.key===r.key)).map(r=>r.annotation);
  const read=(file,encoding)=>file==='content/resources/annotations.json'?JSON.stringify(originals):readFileSync(file,encoding);
  const before=JSON.stringify(originals);
  const {selected,changes}=planPromotion(data,catalog,['R01'],read);
  assert.equal(selected.length,1);assert.equal(changes.size,1);
  const written=JSON.parse(changes.get('content/resources/annotations.json'));
  assert.deepEqual(written.slice(0,-1),JSON.parse(before));
  assert.equal(written.at(-1).key,'microsoft/ai-agents-for-beginners');
  assert.equal(written.at(-1).reviewed,true);
  assert.equal(written.at(-1).level,'unclassified');
  assert.equal(data.records[0].data.reviewed,false);
});

test('a changed collection stops promotion before any writes are planned',()=>{
  const data=clone();const r=data.records.find(r=>r.id==='C01');r.base_sha256=sha256('older revision');
  assert.throws(()=>planPromotion(data,catalog,['C01']),/Collection changed since draft/);
  assert.throws(()=>planPromotion(data,catalog,[]),/Select unique/);
  assert.throws(()=>planPromotion(data,catalog,['R01','R01']),/Select unique/);
  assert.throws(()=>planPromotion(data,catalog,['R99']),/Unknown draft/);
});

test('comparison and question fields retain validated evidence and reject unsafe sources',()=>{
  const c=clone().records.find(r=>r.id==='C01').data;
  const parsed=collectionSchema.parse(c);
  assert.equal(parsed.comparison.length,5);
  assert.equal(parsed.questions.length,2);
  c.comparison[0].sources=['data:text/html,test'];
  assert.equal(collectionSchema.safeParse(c).success,false);
});

test('review identifies drafts and does not invent an author or hands-on test results',()=>{
  const markdown=reviewMarkdown(pilot);
  assert.match(markdown,/awaiting human review/);
  assert.match(markdown,/not human-approved reviews or hands-on test results/);
  assert.match(markdown,/R01: annotation/);
  assert.match(markdown,/C01: collection/);
  assert.match(markdown,/older environments/);
});

test('the CLI refuses promotion without review confirmation and leaves source files intact',()=>{
  const files=['content/resources/annotations.json','content/categories.json','content/collections/ai-for-beginners.md'];
  const before=files.map(file=>sha256(readFileSync(file)));
  const result=spawnSync(process.execPath,['scripts/seo-pilot.mjs','--apply'],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Human source review must be confirmed/);
  assert.deepEqual(files.map(file=>sha256(readFileSync(file))),before);
});
