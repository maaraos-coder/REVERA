import {prepare} from './geometry.js';
const key=p=>p.map(v=>Math.round(v*1e6)).join(',');
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function candidate(loop,id,faces){
 let face;try{face=prepare({id,name:`Cierre ${id}`,outer:loop,holes:[]});}catch{return {id,loop,eligible:false,reason:'El borde no define una cara plana. Requiere edición del dibujo.'};}
 const turns=loop.map((p,i)=>dot(cross(sub(loop[(i+1)%loop.length],p),sub(loop[(i+2)%loop.length],loop[(i+1)%loop.length])),face.normal));
 if(turns.some(v=>v< -1e-8))return {id,loop,eligible:false,reason:'Contorno cóncavo o cruzado: revisa y subdivide el cierre en el editor.'};
 const inside=p=>loop.every((a,i)=>dot(cross(sub(loop[(i+1)%loop.length],a),sub(p,a)),face.normal)>=-1e-8);
 const strictlyInside=p=>loop.every((a,i)=>dot(cross(sub(loop[(i+1)%loop.length],a),sub(p,a)),face.normal)>1e-8);
 // Never cover an existing coplanar face (including nested boundary contours).
 if(faces.some(f=>f.outer.every(p=>Math.abs(dot(sub(p,loop[0]),face.normal))<1e-5)&&(inside(f.centroid)||f.outer.some(strictlyInside))))return {id,loop,eligible:false,reason:'El cierre se superpone con una superficie existente o un contorno interior.'};
 // Do not add a cap through another surface or interior obstacle.
 for(const f of faces){const distances=f.outer.map(p=>dot(sub(p,loop[0]),face.normal));if(Math.min(...distances)<-1e-5&&Math.max(...distances)>1e-5){for(let i=0;i<f.outer.length;i++){const j=(i+1)%f.outer.length;if(distances[i]*distances[j]>=0)continue;const t=distances[i]/(distances[i]-distances[j]),p=f.outer[i].map((v,k)=>v+t*(f.outer[j][k]-v));if(strictlyInside(p))return {id,loop,eligible:false,reason:'El cierre atraviesa otra superficie. Requiere edición del dibujo.'};}}}
 // A centroid fan preserves collinear edge vertices and therefore T-junction topology.
 const caps=loop.map((p,i)=>prepare({id:`${id}-${i}`,name:`Cierre ${id}`,outer:[p,loop[(i+1)%loop.length],face.centroid],holes:[],is_solid:false}));
 return {id,loop,eligible:true,area:face.area,caps};
}
export function closurePlan(raw){
 if(!Array.isArray(raw)||raw.length>5000)throw Error('Se admiten hasta 5.000 caras para revisar cierres.');
 const faces=raw.map(prepare),edges=new Map();
 for(const f of faces)for(const loop of [f.outer,...f.holes])loop.forEach((a,i)=>{const b=loop[(i+1)%loop.length],ka=key(a),kb=key(b),id=[ka,kb].sort().join('|');if(!edges.has(id))edges.set(id,[]);edges.get(id).push({a,b,ka,kb});});
 const boundary=[...edges.values()].filter(e=>e.length===1).map(e=>e[0]),incompatible=[...edges.values()].filter(e=>e.length>2).map(e=>e[0]);
 const adjacent=new Map();boundary.forEach((e,i)=>{for(const k of [e.ka,e.kb]){if(!adjacent.has(k))adjacent.set(k,[]);adjacent.get(k).push(i);}});
 const visited=new Set(),loops=[];let complex=0;
 for(let start=0;start<boundary.length;start++){if(visited.has(start))continue;const component=[],queue=[start];visited.add(start);for(let q=0;q<queue.length;q++){const i=queue[q],e=boundary[i];component.push(i);for(const k of [e.ka,e.kb])for(const j of adjacent.get(k))if(!visited.has(j)){visited.add(j);queue.push(j);}}
  if(component.length<3||component.length>128||component.some(i=>[boundary[i].ka,boundary[i].kb].some(k=>adjacent.get(k).length!==2))){complex++;continue;}
  const ring=[],used=new Set();let index=start,k=boundary[start].ka;for(let n=0;n<component.length;n++){const e=boundary[index];used.add(index);ring.push(k===e.ka?e.a:e.b);k=k===e.ka?e.kb:e.ka;index=adjacent.get(k).find(i=>!used.has(i));}
  if(incompatible.some(e=>ring.some(p=>key(p)===e.ka||key(p)===e.kb))){complex++;continue;}
  loops.push(candidate(ring,`H${loops.length+1}`,faces));
 }
 // Caps in one plane must not overlap each other. Bounds overlap is a conservative
 // rejection: false negatives require editing, never an invented acoustic volume.
 for(let i=0;i<loops.length;i++)for(let j=i+1;j<loops.length;j++){const a=loops[i],b=loops[j];if(!a.eligible||!b.eligible)continue;const f=prepare({outer:a.loop}),g=prepare({outer:b.loop});if(Math.abs(dot(f.normal,g.normal))<.99999||Math.abs(dot(sub(g.outer[0],f.outer[0]),f.normal))>1e-5)continue;const axes=[0,1,2].filter(k=>k!==f.normal.map(Math.abs).indexOf(Math.max(...f.normal.map(Math.abs))));if(axes.every(k=>Math.min(...a.loop.map(p=>p[k]))<Math.max(...b.loop.map(p=>p[k]))-1e-6&&Math.min(...b.loop.map(p=>p[k]))<Math.max(...a.loop.map(p=>p[k]))-1e-6)){a.eligible=b.eligible=false;a.reason=b.reason='Posible superposición entre cierres coplanares: revisa el dibujo.';}}
 if(incompatible.length)for(const hole of loops){hole.eligible=false;hole.reason='Primero corrige los encuentros incompatibles (bordes rojos) antes de añadir cierres.';}
 return {boundary,incompatible,complex,loops,openEdges:boundary.length,nonManifoldEdges:incompatible.length};
}
