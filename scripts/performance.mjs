import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'inherit',env:{...process.env,PORT:'4938'}});
let chrome;
try{
 for(let i=0;i<30;i++){try{if((await fetch('http://127.0.0.1:4938')).ok)break}catch{}await new Promise(r=>setTimeout(r,200));}
 const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 chrome=await launch({chromePath:existsSync(localChrome)?localChrome:process.env.CHROME_PATH,chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage']});
 mkdirSync('reports',{recursive:true});
 for(const [name,path] of [['home','/'],['collection','/discover/ai-for-beginners/'],['detail','/repositories/rust-lang/book/']]){
  const result=await lighthouse('http://127.0.0.1:4938'+path,{port:chrome.port,output:['json','html'],onlyCategories:['performance','accessibility','seo'],formFactor:'mobile',screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:1,disabled:false}});
  const [json,html]=result.report;writeFileSync(`reports/lighthouse-${name}.json`,json);writeFileSync(`reports/lighthouse-${name}.html`,html);
  const scores=Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)]));console.log(name,scores);
  // Preview deliberately uses noindex. Assess SEO after accounting for that single intentional audit.
  for(const [category,score]of Object.entries(scores)){
   const intentionalNoindex=category==='seo'&&result.lhr.audits['is-crawlable']?.score===0;
   const threshold=intentionalNoindex?85:95;
   if(score<threshold)throw Error(`${name} ${category} is ${score}; expected >=${threshold}`);
  }
 }
}finally{if(chrome)await chrome.kill();server.kill();}
