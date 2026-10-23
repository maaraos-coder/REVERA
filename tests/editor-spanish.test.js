import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localizeLabels} from '../localize-editor.mjs';
const messages=JSON.parse(fs.readFileSync(new URL('../src/editor-es.json',import.meta.url)));
test('Spanish labels preserve command identities, shortcuts and user text',()=>{const source='label:`Circle`,tool:`Circle`,shortcut:`C`,name:`Circle`;label:`File`,id:`file`;label:`Save Selection to Library…`';const result=localizeLabels(source,messages);assert.equal(result,'label:`Círculo`,tool:`Circle`,shortcut:`C`,name:`Circle`;label:`Archivo`,id:`file`;label:`Guardar selección en biblioteca…`');});
test('all menu labels and object inspection labels are localized in vendor build',()=>{const vendor=fs.readFileSync(new URL('../vendor/hew-web/assets/index-DT6dccOZ.js',import.meta.url),'utf8'),translated=localizeLabels(vendor,messages);for(const key of ['File','Edit','Object','View','Camera','Draw','Tools','Window','Help','Group','Make Component','Explode','Union','Subtract','Intersect']){assert.ok(vendor.includes('label:`'+key+'`'),key);assert.ok(!translated.includes('label:`'+key+'`'),key);}assert.ok(translated.includes('makeSolid:`Convertir en sólido…`'));});

test('Spanish dock keeps original icon keys and a non-overlapping document title',()=>{const vendor=fs.readFileSync(new URL('../vendor/hew-web/assets/index-DT6dccOZ.js',import.meta.url),'utf8'),translated=localizeLabels(vendor,messages);assert.ok(vendor.includes('lP[e.label]??JB[e.id]'));assert.ok(!translated.includes('lP[e.label]??JB[e.id]'));assert.ok(translated.includes('"Rectángulo":"Rectangle"'));assert.ok(translated.includes('className:`revera-document-name`'));assert.ok(translated.includes('id:`revera-erase-face`,label:`Borrar caras`'));});

test('Paint opens the material palette without toggling an open section closed',()=>{const vendor=fs.readFileSync(new URL('../vendor/hew-web/assets/index-DT6dccOZ.js',import.meta.url),'utf8');assert.ok(localizeLabels(vendor,messages).includes('if(E===`Paint`){Dn(()=>we(true),`Materials`);Se(false);Ee(false);Oe(false);Ae(false);Me(false);Je(false);P([])}'));});
