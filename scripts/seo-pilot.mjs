import {readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {marked} from 'marked';
import sanitize from 'sanitize-html';
import {loadCatalog, annotationSchema, categorySchema, collectionSchema, collectionIndexable} from './catalog.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
const httpUrl = value => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePilot(pilot, catalog) {
  if(pilot.version!==1 || !Array.isArray(pilot.records) || !Array.isArray(pilot.source_checks))throw Error('Invalid SEO pilot manifest');
  const checked=new Map();
  for(const item of pilot.source_checks){
    if(checked.has(item.key) || !httpUrl(item.url) || !/^[a-f0-9]{64}$/.test(item.sha256) || !/^\d{4}-\d{2}-\d{2}$/.test(item.checked_at))throw Error(`Invalid source check: ${item.key}`);
    checked.set(item.key,item);
  }
  const ids=new Set(), destinations=new Set();
  for(const record of pilot.records){
    if(!/^[A-Z]\d{2}$/.test(record.id) || ids.has(record.id))throw Error(`Invalid/duplicate draft ID: ${record.id}`);
    ids.add(record.id);
    if(record.base_sha256!==null && !/^[a-f0-9]{64}$/.test(record.base_sha256))throw Error(`Invalid base digest: ${record.id}`);
    const destination=`${record.kind}:${record.key}`;
    if(destinations.has(destination))throw Error(`Duplicate draft destination: ${destination}`);
    destinations.add(destination);
    if(record.data.reviewed!==false)throw Error(`Draft must remain unreviewed: ${record.id}`);
    let required;
    if(record.kind==='annotation'){
      const a=annotationSchema.parse(record.data);
      if(a.key!==record.key || !catalog.resources.some(r=>r.key===record.key))throw Error(`Unknown annotation: ${record.id}`);
      if(![a.audience,a.value,a.limitations,a.prerequisites,a.service_costs,a.first_step].every(v=>v.trim().length>=20) || !a.sources.length)throw Error(`Incomplete annotation: ${record.id}`);
      required=[record.key];
    } else if(record.kind==='category'){
      categorySchema.parse(record.data);
      const members=catalog.resources.filter(r=>r.categories.includes(record.key));
      if(!catalog.categories.some(c=>c.slug===record.key) || members.length<5)throw Error(`Unknown/thin category: ${record.id}`);
      required=members.map(r=>r.key);
    } else if(record.kind==='collection'){
      const c=collectionSchema.parse(record.data);
      if(!slugPattern.test(record.key) || !collectionIndexable(true,c.resources,record.body||''))throw Error(`Invalid/thin collection: ${record.id}`);
      if(new Set(c.resources).size!==c.resources.length || c.resources.some(key=>!catalog.resources.some(r=>r.key===key)))throw Error(`Invalid collection members: ${record.id}`);
      if(new Set(c.comparison.map(r=>r.key)).size!==c.comparison.length || c.comparison.some(r=>!c.resources.includes(r.key)))throw Error(`Invalid comparison: ${record.id}`);
      required=c.resources;
    } else throw Error(`Unknown draft kind: ${record.kind}`);
    if(!record.data.source_checked || !record.data.sources?.length || record.data.sources.some(url=>!httpUrl(url)))throw Error(`Missing source evidence: ${record.id}`);
    for(const key of required)if(!checked.has(key) || checked.get(key).checked_at!==record.data.source_checked)throw Error(`Missing source check for ${record.id}: ${key}`);
  }
  return pilot;
}

const cell = value => String(value).replaceAll('\\','\\\\').replaceAll('|','\\|').replace(/\r?\n/g,' ');
const list = values => values.map(value=>`- <${value}>`).join('\n');
export function reviewMarkdown(pilot) {
  const sections=pilot.records.map(r=>{
    const d=r.data;
    const heading=`## ${r.id}: ${r.kind} — ${r.key}\n\nStatus: **awaiting human review**. Release group: ${r.group}. Sources checked: ${d.source_checked}.\n`;
    if(r.kind==='annotation')return heading+`\n### Who it is for\n\n${d.audience}\n\n### Practical use\n\n${d.value}\n\n### Before starting\n\n${d.limitations}\n\n### Prerequisites\n\n${d.prerequisites}\n\n### Costs and external services\n\n${d.service_costs}\n\n### First step\n\n${d.first_step}\n\nClassification: ${d.type}; experience level: ${d.level}.\n\n${list(d.sources)}`;
    if(r.kind==='category')return heading+`\nProposed title: **${d.title}**\n\n${d.description}\n\n${d.intro}\n\n${d.selection}\n\n### Sources for the visible inventory\n\n${list(d.sources)}`;
    const table=d.comparison.length?`\n### Comparison\n\n| Resource | Use it for | Prerequisites | Before starting |\n| --- | --- | --- | --- |\n${d.comparison.map(row=>`| [${cell(row.key)}](${row.sources[0]}) | ${cell(row.use)} | ${cell(row.prerequisites)} | ${cell(row.limitations)} |`).join('\n')}\n`:'';
    const questions=d.questions.map(q=>`\n### ${q.question}\n\n${q.answer}\n\n${list(q.sources)}`).join('\n');
    return heading+`\nProposed title: **${d.title}**\n\n${d.description}\n\n${r.body}\n${table}\n${questions}\n### Selection\n\n${d.selection}\n\n### Original sources\n\n${list(d.sources)}`;
  });
  return `# SEO pilot: editorial review\n\nPrepared ${pilot.prepared_at}. ${pilot.records.length} drafts; ${pilot.source_checks.length} source-check records.\n\nThese are source-checked AI-assisted drafts, not human-approved reviews or hands-on test results. Existing approved content remains published. New content is excluded from the ordinary site build until approved. Source snapshot hashes identify the locally inspected content; they are not Git commit IDs. Some long list snapshots are explicitly recorded as excerpts.\n\nThe project requires human examination of sources before setting reviewed status (docs/OPERATIONS.md, Catalog and editorial content). Review claims, source links, classifications, cost notes, and limitations. The apply command accepts only explicitly selected IDs and detects changes to their original content before writing. Batch 2 remains a later cohort decision.\n\n${sections.join('\n\n---\n\n')}\n`;
}

export function planPromotion(pilot, catalog, ids, read=readFileSync) {
  validatePilot(pilot,catalog);
  if(!ids.length || new Set(ids).size!==ids.length)throw Error('Select unique draft IDs explicitly');
  const selected=ids.map(id=>{const r=pilot.records.find(r=>r.id===id);if(!r)throw Error(`Unknown draft: ${id}`);return r;});
  const annotationText=read('content/resources/annotations.json','utf8');
  const categoryText=read('content/categories.json','utf8');
  const annotations=JSON.parse(annotationText);
  const categories=JSON.parse(categoryText);
  const originals=new Map();
  const changes=new Map();
  const today=new Date().toISOString().slice(0,10);
  for(const r of selected){
    const approved={...r.data,reviewed:true,updated:today};
    if(r.kind==='annotation'){
      const existing=annotations.find(a=>a.key===r.key);
      if((existing?sha256(JSON.stringify(existing)):null)!==r.base_sha256)throw Error(`Annotation changed since draft: ${r.id}`);
      if(existing)annotations[annotations.indexOf(existing)]=approved;else annotations.push(approved);
    }else if(r.kind==='category'){
      const existing=categories[r.key];
      if((existing?sha256(JSON.stringify(existing)):null)!==r.base_sha256)throw Error(`Category changed since draft: ${r.id}`);
      categories[r.key]=approved;
    }else{
      const file=`content/collections/${r.key}.md`;
      let original=null;
      try{original=read(file,'utf8')}catch(error){if(error.code!=='ENOENT')throw error;}
      if((original===null?null:sha256(original))!==r.base_sha256)throw Error(`Collection changed since draft: ${r.id}`);
      originals.set(file,original);
      changes.set(file,`---\n${JSON.stringify(approved,null,2)}\n---\n\n${r.body.trim()}\n`);
    }
  }
  if(selected.some(r=>r.kind==='annotation')){changes.set('content/resources/annotations.json',JSON.stringify(annotations,null,2)+'\n');originals.set('content/resources/annotations.json',annotationText);}
  if(selected.some(r=>r.kind==='category')){changes.set('content/categories.json',JSON.stringify(categories,null,2)+'\n');originals.set('content/categories.json',categoryText);}
  return {selected,changes,originals};
}

// Preflight every file before the first write. Restore only our own content on failure.
function writeChanges(changes, originals) {
  const completed=[];
  try{
    for(const file of changes.keys()){
      const current=existsSync(file)?readFileSync(file,'utf8'):null;
      if(current!==originals.get(file))throw Error(`Concurrent edit: ${file}`);
    }
    for(const [file,text] of changes){
      const current=existsSync(file)?readFileSync(file,'utf8'):null;
      if(current!==originals.get(file))throw Error(`Concurrent edit: ${file}`);
      const temporary=`${file}.seo-tmp`;
      if(existsSync(temporary))throw Error(`Temporary file already exists: ${temporary}`);
      try{writeFileSync(temporary,text,{flag:'wx'});renameSync(temporary,file)}finally{if(existsSync(temporary))unlinkSync(temporary)}
      completed.push(file);
    }
  }catch(error){
    for(const file of completed.reverse())if(readFileSync(file,'utf8')===changes.get(file)){
      const before=originals.get(file);if(before===null)unlinkSync(file);else writeFileSync(file,before);
    }
    throw error;
  }
}

function main() {
  const args=process.argv.slice(2);
  if(args.some(arg=>arg!=='--apply' && arg!=='--confirm-reviewed' && !arg.startsWith('--ids=')))throw Error('Usage: seo-pilot.mjs [--apply --confirm-reviewed --ids=C01,R01]');
  const pilot=validatePilot(JSON.parse(readFileSync('content/seo-pilot.json','utf8')),loadCatalog());
  if(args.includes('--apply')){
    if(!args.includes('--confirm-reviewed'))throw Error('Human source review must be confirmed with --confirm-reviewed');
    const ids=(args.find(arg=>arg.startsWith('--ids='))?.slice(6)||'').split(',').filter(Boolean);
    const {selected,changes,originals}=planPromotion(pilot,loadCatalog(),ids);
    const logFile='content/seo-release-log.json';
    const logText=existsSync(logFile)?readFileSync(logFile,'utf8'):null;
    const log=logText===null?[]:JSON.parse(logText);
    for(const r of selected)log.push({id:r.id,path:r.kind==='annotation'?`/repositories/${r.key}/`:r.kind==='category'?`/categories/${r.key}/`:`/discover/${r.key}/`,group:r.group,source_checked:r.data.source_checked,draft_sha256:sha256(JSON.stringify(r)),approved_at:new Date().toISOString(),published_at:null,status:'approved-locally-awaiting-deployment'});
    changes.set(logFile,JSON.stringify(log,null,2)+'\n');
    originals.set(logFile,logText);
    writeChanges(changes,originals);
    console.log(`Applied approved drafts: ${ids.join(', ')}. This did not deploy the website.`);
  }else{
    if(args.length)throw Error('Approval options require --apply');
    mkdirSync('reports',{recursive:true});
    const log=existsSync('content/seo-release-log.json')?JSON.parse(readFileSync('content/seo-release-log.json','utf8')):[];
    const pending={...pilot,records:pilot.records.filter(r=>!log.some(entry=>entry.id===r.id && entry.draft_sha256===sha256(JSON.stringify(r))))};
    const markdown=reviewMarkdown(pending);
    const html=sanitize(marked.parse(markdown),{allowedTags:['h1','h2','h3','p','strong','em','ul','ol','li','a','table','thead','tbody','tr','th','td','hr','code'],allowedAttributes:{a:['href']},allowedSchemes:['http','https'],allowProtocolRelative:false});
    writeFileSync('reports/seo-editorial-review.md',markdown);
    writeFileSync('reports/seo-editorial-review.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SEO pilot editorial review</title><style>body{font:16px/1.65 system-ui;max-width:1050px;margin:auto;padding:24px;color:#182230}h2{margin-top:3rem}table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}th,td{padding:12px;border:1px solid #ccd4dd;text-align:left;vertical-align:top;min-width:180px}a{overflow-wrap:anywhere;color:#1755a6}hr{margin:3rem 0}</style><main>${html}</main></html>`);
    console.log(`Validated ${pending.records.length} pending drafts and ${pilot.source_checks.length} source checks. Review: reports/seo-editorial-review.html`);
  }
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
