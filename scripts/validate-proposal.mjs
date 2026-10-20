import {parseReadme} from './catalog.mjs';
let markdown='';for await(const chunk of process.stdin)markdown+=chunk;
const catalog=parseReadme(markdown);
if(catalog.resources.some(r=>!r.name||!r.description))throw Error('Proposed catalog contains incomplete rows');
console.log(`Valid proposal: ${catalog.resources.length} resources`);
