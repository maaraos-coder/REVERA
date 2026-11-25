import test from 'node:test';
import assert from 'node:assert/strict';
import {augmentRoomResults} from '../src/room-indices.js';
test('10 m free field strength, energy partition and consistent octave ratios', () => {
  const frequencies = [125,250,500,1000,2000,4000];
  const bands = frequencies.map((frequency, i) => ({
    frequency, spl: 80-10*Math.log10(400*Math.PI),
    timeStep:.01, response:[1,0,0,0,0,0,0,0,1,...Array(92).fill(0)], meanSquarePressure:2,
    parameters: {arrival:0,C80: 0, tailFraction: 0, T20: {seconds: [2,2,1,1,.5,.5][i]}}
  }));
  const channel = {sourceId:'s',bands};
  augmentRoomResults({receivers:[{position:[1,0,0],bySource:[channel]}]}, {bands:frequencies,sources:[{id:'s',position:[0,0,0],power:frequencies.map(()=>80)}]});
  const {G,Gearly,Glate,D80} = bands[0].parameters;
  assert.ok(Math.abs(bands[0].parameters.STearly)<1e-10); assert.equal(bands[0].parameters.STlate,null);
  assert.equal(G,0); assert.equal(D80,50);
  assert.ok(Math.abs(Gearly+3.0103)<.00001 && Math.abs(Glate-Gearly)<1e-12);
  assert.deepEqual(channel.spectralRatios.T20,{bassRatio:2,brilliance:.5});
  assert.equal(channel.spectralRatios.T30.bassRatio,null);
});
