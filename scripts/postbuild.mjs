import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {load} from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import {discoveryGuide} from './discovery.mjs';
await sharp('site/public/social.svg').png().toFile('site/dist/social.png');
const production=process.env.PRODUCTION==='true';
const root='site/dist';const origin='https://awesome.pawel.in';
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);
mkdirSync('.cache',{recursive:true});
const datefile='.cache/content-dates.json';const dates=existsSync(datefile)?JSON.parse(readFileSync(datefile,'utf8')):{};
let baseline='2026-10-20';try{baseline=execFileSync('git',['log','-1','--format=%cs','--','README.md'],{encoding:'utf8'}).trim()||baseline}catch{}
const today=new Date().toISOString().slice(0,10);const entries=[];
for(const file of files(root).filter(f=>f.endsWith('.html'))){
 const $=load(readFileSync(file,'utf8'));const canonical=$('link[rel=canonical]').attr('href');
 if(!canonical)throw Error(`Missing canonical: ${file}`);
 $('[data-metrics]').remove();
 const fingerprint=createHash('sha256').update($('main').text().replace(/\s+/g,' ').trim()).digest('hex');
 const previous=dates[canonical];
 const date=previous?.hash===fingerprint?previous.date:previous?today:baseline;
 dates[canonical]={hash:fingerprint,date};
 if(production && $('meta[name=robots]').attr('content')==='index,follow')entries.push({canonical,date,title:$('title').text().replace(/ \| Awesome Repositories$/,''),description:$('meta[name=description]').attr('content')||''});
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
writeFileSync(`${root}/sitemap.xml`,`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(e=>`<url><loc>${escape(e.canonical)}</loc><lastmod>${e.date}</lastmod></url>`).join('')}</urlset>\n`);
writeFileSync(`${root}/llms.txt`,discoveryGuide(entries));
writeFileSync(`${root}/robots.txt`,production?`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
const redirects=JSON.parse(readFileSync('config/redirects.json','utf8'));
for(const[from,to]of Object.entries(redirects)){if(!/^\/repositories\/[^/]+\/[^/]+\/$/.test(from)||!/^\/repositories\/[^/]+\/[^/]+\/$/.test(to)||from===to||redirects[to])throw Error('Redirects must be explicit repository paths without chains or loops');const target=`${root}${to}index.html`;if(!existsSync(target))throw Error(`Redirect target does not exist: ${to}`);if(existsSync(`${root}${from}index.html`))throw Error(`Redirect shadows an existing resource: ${from}`);}
writeFileSync(`${root}/_redirects`,Object.entries(redirects).map(([a,b])=>`${a} ${b} 301`).join('\n')+'\n');
writeFileSync(`${root}/_headers`,`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n${!production?'  X-Robots-Tag: noindex, nofollow\n':''}/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n/pagefind/*\n  Cache-Control: public, max-age=0, must-revalidate\n`);
writeFileSync(datefile,JSON.stringify(dates,null,2));
console.log(`Sitemap: ${entries.length} indexable pages; ${production?'production':'preview: indexing disabled'}`);
