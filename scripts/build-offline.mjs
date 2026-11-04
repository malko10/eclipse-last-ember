import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,'dist',file),'utf8');
const stripExports=source=>source.replace(/^export (?=(?:class|const|function)\b)/gm,'');
const engine=stripExports(read('engine.js'));
const renderer=stripExports(read('renderer.js'));
const audio=stripExports(read('audio.js'));
const app=read('app.js').replace(/^import .*;\r?\n/gm,'');
const script=`(function(){'use strict';\nconst {Soundscape,SCORES}=(()=>{${audio}\nreturn {Soundscape,SCORES};})();\nconst {Game,CLASSES,WEAPONS,DUNGEONS,UPGRADE_POOL}=(()=>{${engine}\nreturn {Game,CLASSES,WEAPONS,DUNGEONS,UPGRADE_POOL};})();\nconst {Renderer,drawClassPortrait}=(()=>{${renderer}\nreturn {Renderer,drawClassPortrait};})();\n${app}\n})();`;
new vm.Script(script,{filename:'ECLIPSE-offline.js'});
const css=read('style.css').replace(/^@import[^;]+;\s*/,'');
let html=read('index.html').replace(/<link rel="stylesheet" href="style.css(?:\?v=\d+)?">/,()=>`<style>${css}</style>`)
  .replace('href="icon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(read('icon.svg'))}"`)
  .replace(/<script src="boot.js(?:\?v=\d+)?"><\/script>/,()=>`<script>${read('boot.js')}</script>`)
  .replace(/<script type="module" src="app.js(?:\?v=\d+)?"><\/script>/,()=>`<script>${script.replace(/<\/script/gi,'<\\/script')}</script>`)
  .replace(/<a[^>]*id="offline-download"[^>]*>[\s\S]*?<\/a>/,'');
if(/<script[^>]+src=/.test(html)||/type="module"/.test(html))throw new Error('Offline build must not load external scripts or modules.');
fs.writeFileSync(path.join(root,'dist','ECLIPSE-offline.html'),html);
fs.writeFileSync(path.join(root,'..','ECLIPSE.html'),html);
fs.writeFileSync(path.join(root,'..','ECLIPSE-v5.html'),html);
console.log('Offline HTML built: all runtime, styles, sprites and audio included.');
