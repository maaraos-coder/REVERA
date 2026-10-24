import {localizeLabels} from './localize-editor.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'src'))){if(name!=='editor-bridge.js')fs.copyFileSync(path.join(root,'src',name),path.join(dist,name));}
const editor=path.join(dist,'editor');fs.cpSync(path.join(root,'vendor','hew-web'),editor,{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(editor)){
 if(!/\.(html|js|css|webmanifest)$/.test(file))continue;
 let text=fs.readFileSync(file,'utf8');
 for(const prefix of ['/assets/','/samples/','/favicon','/pwa-','/apple-touch','/manifest.webmanifest'])text=text.replaceAll(prefix,'/editor'+prefix);
 if(path.basename(file)==='index-DT6dccOZ.js'){
  text=localizeLabels(text,JSON.parse(fs.readFileSync(path.join(root,'src','editor-es.json'),'utf8')));
  const anchor='function CV(e){if(!Xn)return()=>{};';
  if(text.split(anchor).length!==2)throw Error('Cambió el punto de integración de Hew. Revisa la versión antes de compilar.');
  text=text.replace(anchor,'function CV(e){if(!Xn)return window.reveraInstall(e,()=>new N);');
  const selectionAnchor='getSelectedIds:()=>N.getSelectedIds(),';
  if(text.split(selectionAnchor).length!==2)throw Error('Cambió la integración de selección de Hew.');
  text=text.replace(selectionAnchor,'clearObjectHighlight:()=>{window.reveraClearSelection?.();N.setSelected([]);N.setSelectedInstances([]);N.setSelectedInstanceMembers(null,[]);},'+selectionAnchor);
  text=text.replace('!Q9&&!$9&&!Xn&&`serviceWorker`in navigator?','false&&`serviceWorker`in navigator?');
 }
 if(path.basename(file)==='index.html')text=text.replace(/<link\b[^>]*rel=["'](?:icon|apple-touch-icon)["'][^>]*>/gi,'').replace('</head>','<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=1"></head>').replace('</head>','<script src="/editor/revera-bridge.js"></script></head>');
 fs.writeFileSync(file,text);
}
fs.copyFileSync(path.join(root,'src','editor-bridge.js'),path.join(editor,'revera-bridge.js'));
const source=path.join(dist,'source');fs.mkdirSync(source,{recursive:true});
for(const name of ['hew-source-v1.2.3.tar.gz','HEW-LICENSE','HEW-LICENSE-EXCEPTION'])fs.copyFileSync(path.join(root,'vendor',name),path.join(source,name));
for(const [name,target] of [['LICENSE.md','isimpa-tcr-LICENSE.md'],['NOTICE.md','isimpa-tcr-NOTICE.md'],['TC_CalculationCore.cpp','isimpa-tcr-original.cpp']])fs.copyFileSync(path.join(root,'vendor','isimpa-tcr',name),path.join(source,target));
// ZIP (stored entries) for downloadable corresponding adaptation source.
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function zip(files){let offset=0;const entries=[],central=[];
 for(const file of files){const bytes=fs.readFileSync(file),name=Buffer.from(path.relative(root,file).split(path.sep).join('/')),crc=crc32(bytes),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(crc,14);h.writeUInt32LE(bytes.length,18);h.writeUInt32LE(bytes.length,22);h.writeUInt16LE(name.length,26);entries.push(h,name,bytes);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc,16);c.writeUInt32LE(bytes.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+bytes.length;
 }const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...entries,directory,end]);
}
const files=[...walk(path.join(root,'server')).filter(p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')),...walk(path.join(root,'vendor','isimpa-tcr')),...walk(path.join(root,'src')),...walk(path.join(root,'tests')),...['build.mjs','localize-editor.mjs','package.json','README.md','LICENSE','vercel.json','render.yaml'].map(n=>path.join(root,n)).filter(p=>fs.existsSync(p))];
fs.writeFileSync(path.join(source,'revera-web-source.zip'),zip(files));
console.log('REVERA web compiled to dist/ · frontend + Hew WASM + geometry worker');
