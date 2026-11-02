import {assertHtmlSnapshot,sitemapUrls,crawlerAllowed} from './seo-http.mjs';
import {loadCatalog} from './catalog.mjs';

const target=new URL(process.argv[2]||'https://awesome.pawel.in');
const origin=target.origin;
const canonicalOrigin='https://awesome.pawel.in';
if(target.protocol!=='https:' && !(target.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(target.hostname)))throw Error('Use HTTPS or a loopback verification server');
const snapshots=new Map();
async function get(path){
 if(snapshots.has(path))return snapshots.get(path);
 const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(20000),redirect:'manual'});
 const result={status:response.status,html:await response.text(),robotsHeader:response.headers.get('x-robots-tag')||''};
 snapshots.set(path,result);return result;
}
const sitemap=await get('/sitemap.xml');if(sitemap.status!==200)throw Error(`Sitemap returned ${sitemap.status}`);
const urls=sitemapUrls(sitemap.html,canonicalOrigin);
const robots=await get('/robots.txt');if(robots.status!==200 || !robots.html.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`))throw Error('Missing production crawler policy or sitemap declaration');
for(const url of urls){
 const pathname=new URL(url).pathname;
 for(const agent of ['Googlebot','Bingbot','OAI-SearchBot'])if(!crawlerAllowed(robots.html,agent,pathname))throw Error(`${agent} blocked from ${pathname}`);
 assertHtmlSnapshot({...await get(pathname),canonical:url,indexable:true});
}
const catalog=loadCatalog();
const unreviewed=catalog.resources.find(r=>!r.indexable);
const expected=[['/',true],['/learn/',true],['/tools/',true],['/about/',true],['/discover/ai-for-beginners/',true],['/repositories/rust-lang/book/',true],['/search/',false],...(unreviewed?[[unreviewed.path,false]]:[])];
for(const [pathname,indexable] of expected){
 assertHtmlSnapshot({...await get(pathname),canonical:new URL(pathname,canonicalOrigin).href,indexable});
 if(urls.includes(new URL(pathname,canonicalOrigin).href)!==indexable)throw Error(`Sitemap eligibility mismatch: ${pathname}`);
}
const guide=await get('/llms.txt');if(guide.status!==200)throw Error('Missing reading guide');
const guideLinks=[...guide.html.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map(match=>match[1]);
if(guideLinks.length!==urls.length || new Set(guideLinks).size!==urls.length || guideLinks.some(url=>!urls.includes(url)))throw Error('Reading guide differs from sitemap');
const missing=await get('/this-page-must-not-exist/');if(missing.status!==404)throw Error(`Missing route returned ${missing.status}, expected 404`);
console.log(`Verified ${urls.length} sitemap pages, canonical URLs, HTML/HTTP indexing directives, search-crawler policy, core routes, noindex variants, reading guide, and actual 404 behavior at ${origin}`);
