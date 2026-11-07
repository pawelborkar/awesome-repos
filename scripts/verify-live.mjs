const origin=process.argv[2]||'https://awesome.pawel.in';
for(const path of ['/','/learn/','/tools/','/discover/ai-for-beginners/','/repositories/rust-lang/book/','/sitemap.xml','/robots.txt']){
 const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(20000)});if(response.status!==200)throw Error(`${path}: ${response.status}`);
 const body=await response.text();if(path==='/'&&(!body.includes('https://awesome.pawel.in/')||!body.includes('index,follow')))throw Error('Production canonical or robots metadata missing');
}
const missing=await fetch(new URL('/this-page-must-not-exist/',origin));if(missing.status!==404)throw Error(`Missing route returned ${missing.status}, expected 404`);
console.log(`Verified HTTPS, core routes, sitemap, robots, production metadata, and 404 routing at ${origin}`);
