import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/editor-bridge.js',import.meta.url),'utf8');
function translate(text,attribute){const node={nodeValue:text,parentElement:{closest:()=>false}},attrs={placeholder:attribute},element={getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};let read=false;const context={window:{},localStorage:{setItem(){},getItem(){}},NodeFilter:{SHOW_TEXT:4},document:{createTreeWalker:()=>({nextNode(){if(read)return false;read=true;this.currentNode=node;return true;}})}};vm.runInNewContext(source,context);context.brandEditor({querySelectorAll:()=>[element]});return {text:node.nodeValue,placeholder:attrs.placeholder};}
test('material tray translates whitespace, dynamic opacity and placeholders',()=>{for(const [en,es] of [[' Materials ',' Materiales '],['Choose color…','Elegir color…'],['Purge Unused…','Eliminar elementos sin uso…'],['Opacity — azul','Opacidad — azul'],['Save to Library','Guardar en biblioteca']])assert.equal(translate(en).text,es);assert.equal(translate('', 'Filter materials…').placeholder,'Filtrar materiales…');});
