// An isolated test copy simulates approval to exercise templates. Never deploy this copy.
import {cpSync,mkdtempSync,symlinkSync,readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {loadCatalog} from '../../scripts/catalog.mjs';
import {planPromotion,sha256} from '../../scripts/seo-pilot.mjs';

const destination=mkdtempSync(path.join(tmpdir(),'awesome-seo-fixture-'));
for(const entry of ['package.json','package-lock.json','.posthog-events.json','README.md','content','config','scripts','tests','site','playwright.config.ts']){
 cpSync(entry,path.join(destination,entry),{recursive:true,filter:source=>!/(?:^|\/)(?:dist|\.astro|generated|__pycache__)(?:\/|$)/.test(source)});
}
symlinkSync(realpathSync('node_modules'),path.join(destination,'node_modules'),'dir');
const pilot=JSON.parse(readFileSync('content/seo-pilot.json','utf8'));
// Rebase only this simulation, including when the real checkout already has approved records.
const annotations=JSON.parse(readFileSync('content/resources/annotations.json','utf8'));
const categories=JSON.parse(readFileSync('content/categories.json','utf8'));
for(const record of pilot.records){
 if(record.kind==='annotation'){
  const current=annotations.find(a=>a.key===record.key);record.base_sha256=current?sha256(JSON.stringify(current)):null;
 }else if(record.kind==='category')record.base_sha256=categories[record.key]?sha256(JSON.stringify(categories[record.key])):null;
 else {const file=`content/collections/${record.key}.md`;record.base_sha256=existsSync(file)?sha256(readFileSync(file,'utf8')):null;}
}
const {changes}=planPromotion(pilot,loadCatalog(),pilot.records.map(r=>r.id));
for(const [file,text] of changes)writeFileSync(path.join(destination,file),text);
writeFileSync(path.join(destination,'SEO-TEST-FIXTURE.txt'),'SIMULATED APPROVAL FOR TESTING ONLY. DO NOT DEPLOY.\n');
console.log(destination);
