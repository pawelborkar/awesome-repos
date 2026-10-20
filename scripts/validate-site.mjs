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
 for(const element of $('script[type="application/ld+json"]').toArray())try{const data=JSON.parse($(element).text());if(!data['@context']||!data['@type'])throw Error('Invalid schema')}catch{errors.push(`Invalid structured data: ${file}`)}
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
if(!existsSync(`${root}/pagefind/pagefind.js`))errors.push('Missing Pagefind index');
if(!existsSync(`${root}/404.html`)&&!existsSync(`${root}/404/index.html`))errors.push('Missing 404 page');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`Validated ${pages.length} pages: links, titles, descriptions, canonical paths, structured data, sitemap, preview policy, redirects, and asset budgets.`);
