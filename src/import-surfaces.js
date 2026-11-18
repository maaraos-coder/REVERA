// Keep original vertices: warped polygons become planar triangles, never flattened.
import {prepare} from './geometry.js';
export function normalizeSurfaces(raw){
 if(!Array.isArray(raw)||raw.length>5000)throw Error('Se admiten hasta 5.000 caras antes de subdividir.');
 const faces=[];let subdivided=0;
 for(let index=0;index<raw.length;index++){
  const face={...raw[index],id:raw[index].id??`f${index}`};
  try{faces.push(prepare(face,index));}
  catch(error){
   if(!error.message.startsWith('Superficie no plana'))throw Error(`${face.name||face.id}: ${error.message}`);
   if(face.holes?.length)throw Error(`${face.name||face.id}: superficie no plana con huecos. Triangula esta superficie en el programa de origen conservando los huecos y vuelve a importar.`);
   const triangles=triangulate(face.outer);
   for(let i=0;i<triangles.length;i++)faces.push(prepare({...face,id:`${face.id}:t${i+1}`,outer:triangles[i],holes:[],import_source_id:face.id}));
   subdivided++;
  }
  if(faces.length>5000)throw Error('La subdivisión supera las 5.000 caras. Simplifica la envolvente del recinto.');
 }
 return {faces,subdivided,warnings:subdivided?[`${subdivided} superficies no planas subdivididas automáticamente en triángulos, sin mover sus vértices.`]:[]};
}
function triangulate(raw){
 const points=raw.map(p=>[...p]);if(points.length>3&&points[0].every((v,k)=>Math.abs(v-points.at(-1)[k])<1e-6))points.pop();
 if(points.length>1024)throw Error('Superficie no plana con demasiados vértices. Triangúlala en el programa de origen.');
 const origin=points[0],local=points.map(p=>p.map((v,k)=>v-origin[k])),normal=[0,0,0];
 local.forEach((a,i)=>{const b=local[(i+1)%local.length];normal[0]+=a[1]*b[2]-a[2]*b[1];normal[1]+=a[2]*b[0]-a[0]*b[2];normal[2]+=a[0]*b[1]-a[1]*b[0];});
 const drop=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),axes=[0,1,2].filter(k=>k!==drop),p=local.map(v=>axes.map(k=>v[k]));
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const area=p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0),sign=Math.sign(area);
 const scale=Math.max(...p.flat().map(Math.abs),1),eps=1e-12*scale*scale;
 if(Math.abs(area)<=eps)throw Error('No se pudo proyectar la superficie no plana para triangularla.');
 // Reject crossings instead of silently inventing a surface for a bow-tie.
 const orient=(a,b,c)=>{const v=cross(a,b,c);return Math.abs(v)<=eps?0:Math.sign(v);};
 const on=(a,b,c)=>Math.abs(cross(a,b,c))<=eps&&c[0]>=Math.min(a[0],b[0])-1e-9&&c[0]<=Math.max(a[0],b[0])+1e-9&&c[1]>=Math.min(a[1],b[1])-1e-9&&c[1]<=Math.max(a[1],b[1])+1e-9;
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
  if(j===i+1||i===0&&j===p.length-1)continue;
  const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];
  if(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))throw Error('El contorno de una superficie no plana se cruza en la proyección. Triangúlala en el programa de origen.');
 }
 const ids=p.map((_,i)=>i),triangles=[];
 while(ids.length>3){let found=false;for(let k=0;k<ids.length;k++){
  const a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];if(sign*cross(p[a],p[b],p[c])<=eps)continue;
  const contains=ids.some(i=>i!==a&&i!==b&&i!==c&&sign*cross(p[a],p[b],p[i])>=-eps&&sign*cross(p[b],p[c],p[i])>=-eps&&sign*cross(p[c],p[a],p[i])>=-eps);
  if(contains)continue;triangles.push([points[a],points[b],points[c]]);ids.splice(k,1);found=true;break;
 }if(!found)throw Error('No se pudo triangular la superficie sin alterar su contorno. Revisa vértices repetidos o aristas cruzadas.');}
 triangles.push(ids.map(i=>points[i]));return triangles;
}
