import test from 'node:test';
import assert from 'node:assert/strict';
import {drawingFace,plainSelect} from '../src/drawing-selection.js';
const ray={origin:[0,0,10],direction:[0,0,-1]},face={outer:[[0,0,0],[1,0,0],[0,1,0]],holes:[]};
function query(kind,tree){return (_,method,params)=>method.endsWith('raycast')?{object:'o1',kind,point:[.2,.2,0]}:method.endsWith('scene')?{tree}: {face};}
test('raw root solid resolves exactly the hit face',()=>{assert.deepEqual(drawingFace({},query('object',[{kind:'object',id:'o1',name:'Volumen'}]),ray),{...face,id:'o1',name:'Volumen'});});
test('explicit group members and instances keep native selection',()=>{assert.equal(drawingFace({},query('object',[{kind:'group',id:'g1',members:[{kind:'object',id:'o1'}]}]),ray),null);assert.equal(drawingFace({},query('instance',[]),ray),null);});
test('modifiers and drawing tools keep their normal object/tool gestures',()=>{assert.equal(plainSelect({button:0},'Select'),true);for(const key of ['shiftKey','ctrlKey','metaKey','altKey'])assert.equal(plainSelect({button:0,[key]:true},'Select'),false);assert.equal(plainSelect({button:0},'Rectangle'),false);assert.equal(plainSelect({button:1},'Select'),false);});
