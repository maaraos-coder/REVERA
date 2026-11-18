import test from 'node:test';import assert from 'node:assert/strict';
import {reviewEnvelope} from '../src/envelope-review.js';
import {createSimulationJob} from '../src/simulation.js';
// L-shaped prism: footprint 3 m², height 2 m, surface 22 m².
function prism(offset=0){const ring=[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2]],p=(q,z)=>[q[0]+offset,q[1]+offset,z+offset];const faces=[{outer:ring.map(q=>p(q,0))},{outer:ring.map(q=>p(q,2))}];ring.forEach((a,i)=>{const b=ring[(i+1)%ring.length];faces.push({outer:[p(a,0),p(b,0),p(b,2),p(a,2)]});});return faces;}
test('concave shell uses topology and signed volume even far from origin',()=>{for(const offset of [0,1000000]){const r=reviewEnvelope(prism(offset),{orient:true});assert.equal(r.valid,true);assert.equal(r.convex,false);assert.equal(r.face_count,8);assert.ok(Math.abs(r.volume_m3-6)<1e-8);assert.equal(r.surface_m2,22);assert.ok(r.faces.every(f=>f.orientation==='D'));assert.throws(()=>createSimulationJob(r,{},{}),/cóncavo/);assert.equal(reviewEnvelope(prism(offset),{flipped:r.reversed_keys}).valid,true);}});
test('multiple closed objects do not become one acoustic room',()=>{const r=reviewEnvelope([...prism(),...prism(10)],{orient:true});assert.equal(r.valid,false);assert.equal(r.volume_m3,null);assert.match(r.errors.join(' '),/envolventes separadas/);});
test('open concave import is not accepted as a closed room',()=>{assert.equal(reviewEnvelope(prism().slice(1),{orient:true}).valid,false);});
test('non-solid Collada sheets skip thick-wall extraction',()=>{const r=reviewEnvelope(prism(),{orient:true,thick:true});assert.equal(r.valid,true);assert.ok(Math.abs(r.volume_m3-6)<1e-8);});
