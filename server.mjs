import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  // Local-only preview of the real app's boss introduction and combat UI.
  if(url==='/__boss'||url==='/__boss-app.js'){
    const source=url==='/__boss'
      ?fs.readFileSync(path.join(root,'index.html'),'utf8').replace('src="app.js?v=4"','src="/__boss-app.js"')
      :fs.readFileSync(path.join(root,'app.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'../tests/boss-preview.mjs'),'utf8');
    res.writeHead(200,{'Content-Type':url==='/__boss'?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});res.end(source);return;
  }
  if(url==='/__qa'||url==='/__audio'){fs.readFile(path.join(root,'..','tests',url==='/__audio'?'audio.html':'visual.html'),(err,data)=>{res.writeHead(err?404:200,{'Content-Type':'text/html; charset=utf-8'});res.end(err?'Not found':data);});return;}
  const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
