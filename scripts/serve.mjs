import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const compressed=new Map();
const root=path.resolve('site/dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml','.txt':'text/plain','.pf_fragment':'application/octet-stream','.pf_index':'application/octet-stream','.pf_meta':'application/octet-stream'};
createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return;}
 let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(existsSync(file)&&statSync(file).isDirectory())file=path.join(file,'index.html');
 let status=200;if(!existsSync(file)||!statSync(file).isFile()){file=path.join(root,'404.html');status=404;}
 const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.includes('/_astro/')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate'};
 let data=readFileSync(file);if(/gzip/.test(req.headers['accept-encoding']||'')&&/\.(html|js|css|json|xml|svg|txt)$/.test(file)){if(!compressed.has(file))compressed.set(file,gzipSync(data));data=compressed.get(file);headers['Content-Encoding']='gzip';headers['Vary']='Accept-Encoding';}
 headers['Content-Length']=String(data.length);res.writeHead(status,headers);res.end(data);
}).listen(Number(process.env.PORT||4937),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${process.env.PORT||4937}`));
