import {readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {load} from 'cheerio';
const root='site/dist';const production=process.env.PRODUCTION==='true';const origin='https://awesome.pawel.in';
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);
const all=files(root),pages=all.filter(f=>f.endsWith('.html'));const errors=[];const titles=new Set();
const sitemap=load(readFileSync(`${root}/sitemap.xml`,'utf8'),{xmlMode:true});const urls=new Set(sitemap('loc').map((_,el)=>sitemap(el).text()).get());
const redirects=JSON.parse(readFileSync('config/redirects.json','utf8'));
const htmlfile=url=>url.pathname.endsWith('/')?`${root}${url.pathname}index.html`:`${root}${url.pathname}`;
for(const file of pages){
 const $=load(readFileSync(file,'utf8'));const relative=file.slice(root.length).replace(/index\.html$/,'');const canonical=$('link[rel=canonical]').attr('href');const title=$('title').text();
 if(!title||titles.has(title))errors.push(`Missing/duplicate title: ${file}`);titles.add(title);
 if($('h1').length!==1)errors.push(`Expected exactly one H1: ${file}`);
 if(!$('meta[name=description]').attr('content'))errors.push(`Missing description: ${file}`);
 if(!canonical||!canonical.startsWith(origin+'/'))errors.push(`Invalid canonical: ${file}`);
 if(canonical && new URL(canonical).pathname!==relative)errors.push(`Canonical path mismatch: ${file}`);
 const indexable=$('meta[name=robots]').attr('content')==='index,follow';
 if(indexable!==urls.has(canonical))errors.push(`Sitemap/indexability mismatch: ${file}`);
 if(!production&&indexable)errors.push(`Preview is indexable: ${file}`);
 const schemas=[];
 for(const element of $('script[type="application/ld+json"]').toArray())try{const data=JSON.parse($(element).text());if(!data['@context']||!data['@type'])throw Error('Invalid schema');schemas.push(data)}catch{errors.push(`Invalid structured data: ${file}`)}
 const website=schemas.find(data=>data['@type']==='WebSite');
 const pageSchemas=schemas.filter(data=>['WebPage','CollectionPage','AboutPage'].includes(data['@type']));
 const page=pageSchemas[0];
 if(website?.['@id']!==`${origin}/#website`||pageSchemas.length!==1||page?.['@id']!==`${canonical}#webpage`||page?.url!==canonical||page?.isPartOf?.['@id']!==website?.['@id'])errors.push(`Disconnected page identity: ${file}`);
 if(page?.name!==title.replace(/ \| Awesome Repositories$/,'')||page?.description!==$('meta[name=description]').attr('content'))errors.push(`Page schema does not match visible metadata: ${file}`);
 if(page?.breadcrumb&&!schemas.some(data=>data['@type']==='BreadcrumbList'&&data['@id']===page.breadcrumb['@id']))errors.push(`Missing breadcrumb schema: ${file}`);
 const mainLinks=new Set($('main a[href]').toArray().map(el=>new URL($(el).attr('href'),canonical).href));
 if(page?.['@type']==='CollectionPage'){
  const list=page.mainEntity;
  if(list?.['@type']!=='ItemList'||!Array.isArray(list.itemListElement)||list.numberOfItems!==list.itemListElement.length)errors.push(`Invalid collection inventory: ${file}`);
  else {
   const listed=list.itemListElement.map(item=>item.url);
   if(new Set(listed).size!==listed.length)errors.push(`Duplicate collection items: ${file}`);
   for(const [i,item]of list.itemListElement.entries())if(item.position!==i+1||!item.name||!mainLinks.has(item.url))errors.push(`Collection item missing from HTML: ${file}`);
   const cards=$('.directory [data-resource] h3 a').toArray().map(el=>new URL($(el).attr('href'),canonical).href);
   if(cards.length&&JSON.stringify(cards)!==JSON.stringify(listed))errors.push(`Collection schema differs from rendered inventory/order: ${file}`);
  }
 }
 if(page?.lastReviewed&&!$('main time[datetime]').toArray().some(el=>$(el).attr('datetime')===page.lastReviewed))errors.push(`Review date missing from HTML: ${file}`);
 for(const citation of page?.citation||[])if(!mainLinks.has(citation))errors.push(`Citation missing from HTML: ${file}`);
 if(page?.mainEntity?.['@type']==='CreativeWork'){
  if(!mainLinks.has(page.mainEntity.url))errors.push(`Repository source missing from HTML: ${file}`);
  for(const license of page.mainEntity.license||[])if(!mainLinks.has(license))errors.push(`License missing from HTML: ${file}`);
 }
 for(const element of $('a[href],link[rel=stylesheet],script[src],img[src]').toArray()){
  const href=$(element).attr('href')||$(element).attr('src');if(!href||href.startsWith('#')||/^(mailto:|tel:)/.test(href))continue;
  const url=new URL(href,canonical);if(url.origin!==origin)continue;
  const target=htmlfile(url);
  if(!existsSync(target)&&!redirects[url.pathname])errors.push(`Broken internal link ${href} in ${file}`);
 }
 let js=0,css=0;
 for(const element of $('script:not([type="application/ld+json"]):not([defer]),link[rel=stylesheet]').toArray()){
  const src=$(element).attr('src')||$(element).attr('href');let content='';
  if(src){const url=new URL(src,canonical);if(url.origin!==origin)continue;content=readFileSync(`${root}${url.pathname}`);}else content=$(element).text();
  if(element.tagName==='script')js+=gzipSync(content).length;else css+=gzipSync(content).length;
 }
 if(js>35*1024||css>25*1024)errors.push(`Asset budget exceeded (${js} JS, ${css} CSS): ${file}`);
}
for(const url of urls)if(!existsSync(htmlfile(new URL(url))))errors.push(`Sitemap URL missing: ${url}`);
const guide=readFileSync(`${root}/llms.txt`,'utf8');
const guideLinks=[...guide.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map(match=>match[1]);
if(new Set(guideLinks).size!==guideLinks.length||guideLinks.length!==urls.size||guideLinks.some(url=>!urls.has(url)))errors.push('AI reading guide differs from sitemap eligibility');
const robots=readFileSync(`${root}/robots.txt`,'utf8');
if(production?!robots.includes(`Allow: /\nSitemap: ${origin}/sitemap.xml`):!robots.includes('Disallow: /'))errors.push('Incorrect crawler policy');
if(!existsSync(`${root}/pagefind/pagefind.js`))errors.push('Missing Pagefind index');
if(!existsSync(`${root}/404.html`)&&!existsSync(`${root}/404/index.html`))errors.push('Missing 404 page');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Validated ${pages.length} pages: links, titles, descriptions, canonical paths, connected structured data, visible inventories and citations, AI reading guide, sitemap, preview policy, redirects, and asset budgets.`);
