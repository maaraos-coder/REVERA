// Discrete native receiver grid; cell values are not interpolated measurements.
import {isInsideRoom} from './simulation.js';
export function mapGrid(room,sources,z,n=3){
 if(!room?.valid||!Number.isFinite(z)||![3,5].includes(n))throw Error('Valida el recinto y selecciona una altura y malla válidas.');
 const points=room.faces.flatMap(f=>f.outer),lo=[0,1].map(k=>Math.min(...points.map(p=>p[k]))),hi=[0,1].map(k=>Math.max(...points.map(p=>p[k]))),dx=(hi[0]-lo[0])/n,dy=(hi[1]-lo[1])/n;
 const cells=[];for(let row=0;row<n;row++)for(let col=0;col<n;col++){
  const position=[lo[0]+(col+.5)*dx,lo[1]+(row+.5)*dy,z];
  if(!isInsideRoom(room,position)||room.faces.some(f=>f.normal.reduce((s,v,k)=>s+v*(position[k]-f.centroid[k]),0)<.201)||sources.some(s=>Math.hypot(...s.position.map((v,k)=>v-position[k]))<=.201))continue;
  cells.push({id:`map-${row}-${col}`,name:`M${row+1}-${col+1}`,position,x:lo[0]+col*dx,y:lo[1]+row*dy,dx,dy});
 }
 if(!cells.length)throw Error('No hay puntos válidos a esa altura: mantén 0,20 m de separación de caras y fuentes.');
 return {cells,lo,hi,z,n};
}
export function sectionPolygon(room,z,lo,hi){
 let poly=[[lo[0],lo[1]],[hi[0],lo[1]],[hi[0],hi[1]],[lo[0],hi[1]]];
 for(const face of room.faces){const signed=p=>face.normal.reduce((s,v,k)=>s+v*((k<2?p[k]:z)-face.centroid[k]),0);const out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],sa=signed(a),sb=signed(b);if(sa>=-1e-8)out.push(a);if((sa>=0)!==(sb>=0)){const t=sa/(sa-sb);out.push(a.map((v,k)=>v+t*(b[k]-v)));}}poly=out;
 }return poly;
}
export function mapValue(receiver,metric,frequency,sourceId){
 if(!receiver)return null;const channel=metric==='SPL'?receiver:receiver.bySource?.find(s=>s.sourceId===sourceId);
 if(!channel)return null;if(metric==='STI')return channel.sti?.value??null;
 const band=channel.bands.find(b=>b.frequency===frequency);if(!band)return null;if(metric==='SPL')return band.spl;
 const value=band.parameters?.[metric];return ['EDT','T20','T30'].includes(metric)?value?.seconds??null:value??null;
}
export function colorScale(value,min,max){if(!Number.isFinite(value))return '#334658';const t=Math.max(0,Math.min(1,(value-min)/(max-min||1)));return `hsl(${240-240*t} 85% 55%)`;}

// STI uses a fixed physical scale so color comparisons stay meaningful across rooms.
export function mapDomain(values,metric){
 if(metric==='STI')return {min:0,max:1};
 const valid=values.filter(Number.isFinite);
 if(!valid.length)return {min:0,max:1};
 return {min:Math.min(...valid),max:Math.max(...valid)};
}
