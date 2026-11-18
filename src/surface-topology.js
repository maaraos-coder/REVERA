// Shared-edge propagation gives consistent normals without a guessed interior point.
import {prepare} from './geometry.js';
const key=p=>p.map(v=>Math.round(v*1e6)).join(',');
const reverse=f=>prepare({...f,outer:[...f.outer].reverse(),holes:f.holes.map(h=>[...h].reverse())});
export function closedTopology(faces){
 const edges=new Map(),adj=faces.map(()=>[]);
 faces.forEach((f,i)=>{for(const loop of [f.outer,...f.holes])loop.forEach((a,j)=>{const ka=key(a),kb=key(loop[(j+1)%loop.length]),id=[ka,kb].sort().join('|');if(!edges.has(id))edges.set(id,[]);edges.get(id).push({i,dir:ka<kb?1:-1});});});
 const bad=[...edges.values()].filter(e=>e.length!==2||e[0].i===e[1].i);
 if(bad.length)return {closed:false,badEdges:bad.length};
 for(const [a,b] of edges.values()){const toggle=a.dir===b.dir?1:0;adj[a.i].push([b.i,toggle]);adj[b.i].push([a.i,toggle]);}
 const flips=new Array(faces.length),components=[];let conflict=false;
 for(let root=0;root<faces.length;root++){if(flips[root]!==undefined)continue;flips[root]=0;const queue=[root];for(let q=0;q<queue.length;q++){const i=queue[q];for(const [j,t] of adj[i]){const next=flips[i]^t;if(flips[j]===undefined){flips[j]=next;queue.push(j);}else if(flips[j]!==next)conflict=true;}}components.push(queue);}
 if(conflict)return {closed:false,badEdges:0,conflict:true};
 // Translate before the divergence sum to avoid cancellation far from origin.
 const origin=faces[0].outer[0];
 const signedVolume=ids=>ids.reduce((sum,i)=>{const f=flips[i]?reverse(faces[i]):faces[i];for(const loop of [f.outer,...f.holes]){const a=loop[0].map((v,k)=>v-origin[k]);for(let j=1;j<loop.length-1;j++){const b=loop[j].map((v,k)=>v-origin[k]),c=loop[j+1].map((v,k)=>v-origin[k]);sum+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}}return sum;},0);
 let volume=0;for(const ids of components){const signed=signedVolume(ids);volume+=Math.abs(signed);if(signed>0)for(const i of ids)flips[i]^=1;}
 return {closed:true,components:components.length,flips,volume};
}
export function topologyReview(faces,{orient=false}={}){
 const topology=closedTopology(faces);if(!topology.closed)return null;
 const corrected=faces.map((f,i)=>topology.flips[i]?reverse(f):f),outside=topology.flips.filter(Boolean).length;
 const errors=[];if(topology.components!==1)errors.push(`Se detectaron ${topology.components} envolventes separadas. Conserva únicamente el recinto de aire que deseas calcular; elimina mobiliario y objetos ajenos.`);
 if(topology.volume<=1e-6)errors.push('La envolvente no delimita un volumen de aire válido.');
 const vertices=new Map();for(const f of corrected)for(const p of f.outer)vertices.set(key(p),p);
 const points=[...vertices.values()],convex=corrected.every(f=>points.every(p=>f.normal.reduce((s,n,k)=>s+n*(p[k]-f.outer[0][k]),0)>=-1e-5));
 return {faces:(orient?corrected:faces).map((f,i)=>({...f,orientation:orient||!topology.flips[i]?'D':'F'})),reversed:orient?faces.filter((f,i)=>topology.flips[i]):[],outside:orient?0:outside,errors,volume:topology.volume,convex};
}
