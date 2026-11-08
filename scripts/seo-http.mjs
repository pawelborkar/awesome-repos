import {load} from 'cheerio';

export function assertHtmlSnapshot({status,html,robotsHeader='',canonical,indexable}) {
  if(status!==200)throw Error(`Expected 200 for ${canonical}; received ${status}`);
  const $=load(html);
  if($('link[rel=canonical]').length!==1 || $('link[rel=canonical]').attr('href')!==canonical)throw Error(`Incorrect canonical: ${canonical}`);
  if(!$('title').text().trim() || $('h1').length!==1)throw Error(`Missing title or unique heading: ${canonical}`);
  const meta=$('meta[name=robots]').attr('content')?.toLowerCase()||'';
  const blocked=/(?:^|[,\s:])(noindex|none)(?=$|[,\s])/i;
  if(indexable && (blocked.test(meta) || blocked.test(robotsHeader) || !/(?:^|[,\s])index(?=$|[,\s])/.test(meta)))throw Error(`Indexing blocked or not explicitly enabled: ${canonical}`);
  if(!indexable && !blocked.test(meta) && !blocked.test(robotsHeader))throw Error(`Expected noindex: ${canonical}`);
  return {canonical,indexable,robots:meta,robotsHeader};
}

export function sitemapUrls(xml, origin) {
  const $=load(xml,{xmlMode:true});
  const urls=$('urlset > url > loc').map((_,el)=>$(el).text().trim()).get();
  if($('urlset').length!==1 || !urls.length || new Set(urls).size!==urls.length)throw Error('Empty, invalid, or duplicate sitemap inventory');
  for(const value of urls){
    const url=new URL(value);
    if(url.origin!==origin || url.search || url.hash || !url.pathname.endsWith('/'))throw Error(`Invalid sitemap URL: ${value}`);
  }
  return urls;
}

export function crawlerAllowed(text, agent, pathname) {
  const groups=[];let current={agents:[],rules:[],started:false};
  for(const line of text.split(/\r?\n/)){
    const clean=line.split('#')[0];const colon=clean.indexOf(':');if(colon<0)continue;
    const key=clean.slice(0,colon).trim().toLowerCase(),value=clean.slice(colon+1).trim();
    if(key==='user-agent'){
      if(current.started){groups.push(current);current={agents:[],rules:[],started:false};}
      if(value)current.agents.push(value.toLowerCase());
    }else if(['allow','disallow'].includes(key) && current.agents.length){
      current.started=true;
      if(value)current.rules.push({allow:key==='allow',value});
    }
  }
  if(current.agents.length)groups.push(current);
  const scored=groups.map(group=>({group,score:Math.max(-1,...group.agents.map(token=>token==='*'?0:agent.toLowerCase().includes(token)?token.length:-1))}));
  const best=Math.max(-1,...scored.map(item=>item.score));
  const rules=scored.filter(item=>item.score===best && best>=0).flatMap(item=>item.group.rules);
  let match=null;
  for(const rule of rules){
    const end=rule.value.endsWith('$');const value=end?rule.value.slice(0,-1):rule.value;
    const pattern=value.split('*').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
    if(!new RegExp(`^${pattern}${end?'$':''}`).test(pathname))continue;
    const length=rule.value.replace(/[*$]/g,'').length;
    if(!match || length>match.length || (length===match.length && rule.allow))match={length,allow:rule.allow};
  }
  return match?.allow??true;
}
