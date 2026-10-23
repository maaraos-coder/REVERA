import test from 'node:test';import assert from 'node:assert/strict';import{parseDxf}from'../src/dxf.js';
const dxf=entities=>'0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'+entities+'0\nENDSEC\n0\nEOF\n';
test('DXF millimetres convert to metres',()=>{const r=parseDxf(dxf('0\nLINE\n10\n0\n20\n0\n11\n6000\n21\n4000\n'));assert.deepEqual(r.commands[0].params.points,[[0,0,0],[6,4,0]]);assert.equal(r.count,1);});
test('closed polylines retain closure',()=>{const r=parseDxf(dxf('0\nLWPOLYLINE\n70\n1\n10\n0\n20\n0\n10\n6000\n20\n0\n10\n6000\n20\n4000\n'));const p=r.commands[0].params.points;assert.deepEqual(p[0],p.at(-1));});
test('unsupported entities are reported',()=>{const r=parseDxf(dxf('0\nCIRCLE\n10\n0\n20\n0\n40\n100\n0\nLINE\n10\n0\n20\n0\n11\n100\n21\n0\n'));assert.equal(r.unsupported.CIRCLE,1);});
test('binary DXF is refused',()=>{assert.throws(()=>parseDxf('AutoCAD Binary DXF'),/binario/);});
