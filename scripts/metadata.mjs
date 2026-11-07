import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {parseReadme} from './catalog.mjs';
const file='.cache/github-metadata.json';
const cache=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
const resources=parseReadme(readFileSync('README.md','utf8')).resources;
const token=process.env.GITHUB_TOKEN;
if(!token) console.warn('No GitHub token: preserving cached metadata; missing metrics will be omitted.');
let refreshed=0;
if(token) for(const resource of resources) {
  if(cache[resource.key] && Date.now()-Date.parse(cache[resource.key].fetchedAt)<86400000) continue;
  try {
    const response=await fetch(`https://api.github.com/repos/${resource.key}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)});
    if([401,403,429].includes(response.status)) {console.warn(`Metadata unavailable (${response.status}); retaining last successful snapshots.`);break;}
    if(!response.ok) continue;
    const repo=await response.json();
    cache[resource.key]={id:repo.id,canonical:repo.full_name.toLowerCase(),stars:repo.stargazers_count,forks:repo.forks_count,archived:repo.archived,fetchedAt:new Date().toISOString()};
    refreshed++;
  }catch{console.warn(`Metadata fetch failed for ${resource.key}; retaining cache.`);}
}
mkdirSync('.cache',{recursive:true});writeFileSync(file,JSON.stringify(cache,null,2));
console.log(`Refreshed ${refreshed}; ${Object.keys(cache).length} cached snapshots.`);
