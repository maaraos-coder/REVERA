import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validate,panCamera} from '../src/shortcuts.js';
test('shortcuts validate unique keys and mouse modifier',()=>{assert.ok(validate({keys:{...defaults},pan:'ctrl'}));assert.throws(()=>validate({keys:{...defaults,Pan:'o'},pan:'ctrl'}),/repetidas/);assert.throws(()=>validate({keys:{...defaults},pan:'invalid'}));});
test('camera pan translates eye and target equally without changing direction',()=>{const c={eye:[0,-10,0],target:[0,0,0],up:[0,0,1],projection:'perspective',fovDeg:60};const next=panCamera(c,100,30,500);assert.notDeepEqual(next.eye,c.eye);assert.deepEqual(next.eye.map((v,i)=>v-next.target[i]),[0,-10,0]);assert.deepEqual(c.eye,[0,-10,0]);});
