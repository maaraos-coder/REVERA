// REVERA geometry, metres, Z up. Independent browser implementation.
export const EPS=1e-6;
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.sqrt(dot(a,a));
const pairs=loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]]);
const va=loop=>mul(pairs(loop).reduce((s,[a,b])=>add(s,cross(a,b)),[0,0,0]),.5);
export function prepare(raw,index=0){
 const clean=loop=>{if(!Array.isArray(loop)||loop.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v))))throw Error('Contorno inválido.');const out=loop.map(p=>[...p]);if(out.length>1&&norm(sub(out[0],out.at(-1)))<EPS)out.pop();if(out.length<3)throw Error('Cara con menos de tres vértices.');return out;};
 const outer=clean(raw.outer),holes=(raw.holes||[]).map(clean),v=va(outer),length=norm(v);
 if(length<EPS)throw Error('Cara degenerada.');const normal=mul(v,1/length);
 if([outer,...holes].flat().some(p=>Math.abs(dot(normal,sub(p,outer[0])))>EPS*10))throw Error('Superficie no plana: subdivide la cara.');
 holes.forEach(h=>{if(dot(va(h),normal)>0)h.reverse();});
 const area=dot(va(outer),normal)+holes.reduce((s,h)=>s+dot(va(h),normal),0);
 if(area<EPS)throw Error('Área inválida.');
 return {...raw,id:raw.id??`f${index}`,object:raw.object??'',name:raw.name??`Cara ${index+1}`,outer,holes,normal,area,centroid:[0,1,2].map(k=>outer.reduce((s,p)=>s+p[k],0)/outer.length)};
}
function inLoop(p,loop,n){
 const drop=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))),axes=[0,1,2].filter(k=>k!==drop),[x,y]=axes.map(k=>p[k]);let inside=false;
 for(const [a,b] of pairs(loop)){const [ax,ay]=axes.map(k=>a[k]),[bx,by]=axes.map(k=>b[k]);if(x>=Math.min(ax,bx)-EPS&&x<=Math.max(ax,bx)+EPS&&y>=Math.min(ay,by)-EPS&&y<=Math.max(ay,by)+EPS&&Math.abs((bx-ax)*(y-ay)-(by-ay)*(x-ax))<EPS)return true;if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}
 return inside;
}
function hit(origin,dir,f){const d=dot(f.normal,dir);if(Math.abs(d)<1e-12)return null;const t=dot(f.normal,sub(f.outer[0],origin))/d;if(t<=EPS)return null;const p=add(origin,mul(dir,t));return inLoop(p,f.outer,f.normal)&&!f.holes.some(h=>inLoop(p,h,f.normal))?t:null;}
function clip(loop,n,p){const out=[];for(const[a,b]of pairs(loop)){const da=dot(n,sub(a,p)),db=dot(n,sub(b,p));if(da>=-EPS)out.push(a);if(da>EPS&&db<-EPS||da<-EPS&&db>EPS)out.push(add(a,mul(sub(b,a),da/(da-db))));}const clean=out.filter((q,i)=>!i||norm(sub(q,out[i-1]))>EPS);if(clean.length>1&&norm(sub(clean[0],clean.at(-1)))<EPS)clean.pop();return clean;}
export function validate(faces,seed){
 const errors=[],edges=new Map(),key=p=>p.map(x=>Math.round(x/EPS)).join(',');
 for(const f of faces)for(const loop of [f.outer,...f.holes])for(const[a,b]of pairs(loop)){const ka=key(a),kb=key(b),id=[ka,kb].sort().join('|');if(!edges.has(id))edges.set(id,[]);edges.get(id).push([ka,kb]);}
 const bad=[...edges.values()].filter(e=>e.length!==2||e[0][0]!==e[1][1]||e[0][1]!==e[1][0]);
 if(bad.length)errors.push(`Envolvente abierta o encuentros incompatibles: ${bad.length} aristas por revisar.`);
 if(faces.length<4)errors.push('No se identificó un recinto cerrado.');
 const vertices=faces.flatMap(f=>f.outer);
 if(!faces.every(f=>vertices.every(p=>dot(f.normal,sub(p,f.outer[0]))>=-EPS*10)))errors.push('La selección contiene una concavidad u obstáculos. Esta versión requiere un recinto convexo.');
 if(faces.some(f=>dot(f.normal,sub(seed,f.outer[0]))<=EPS))errors.push('El punto debe quedar dentro del aire del recinto.');
 let volume=0;for(const f of faces)for(const loop of [f.outer,...f.holes]){const a=sub(loop[0],seed);for(let i=1;i<loop.length-1;i++)volume-=dot(a,cross(sub(loop[i],seed),sub(loop[i+1],seed)))/6;}
 if(volume<=EPS)errors.push('El volumen interior no es positivo.');
 return {valid:!errors.length,errors,volume_m3:errors.length?null:volume,surface_m2:faces.reduce((s,f)=>s+f.area,0),face_count:faces.length,seed,scope:'Recintos convexos sin obstáculos. Verifica visualmente la selección.'};
}
export function extract(raw,seed){
 if(!Array.isArray(seed)||seed.length!==3||seed.some(x=>!Number.isFinite(x)))throw Error('Punto interior inválido.');
 if(raw.length>5000)throw Error('Simplifica el modelo a un máximo de 5.000 caras para esta versión.');
 const faces=raw.map(prepare),solids=new Map();
 for(const f of faces)if(f.is_solid){if(!solids.has(f.object))solids.set(f.object,[]);solids.get(f.object).push(f);}
 if([...solids.values()].some(fs=>fs.every(f=>dot(f.normal,sub(seed,f.outer[0]))<-EPS)))throw Error('El punto está dentro de un sólido, no dentro del aire.');
 if(faces.some(f=>Math.abs(dot(f.normal,sub(seed,f.outer[0])))<EPS&&inLoop(seed,f.outer,f.normal)))throw Error('El punto está sobre una superficie. Muévelo hacia el aire interior.');
 let selected=[];
 for(const f of faces){
  if(f.is_solid&&dot(f.normal,sub(seed,f.outer[0]))<=EPS)continue;
  const samples=[f.centroid,...f.outer.map(p=>add(mul(p,.85),mul(f.centroid,.15)))];
  const visible=samples.some(sample=>{const dir=sub(sample,seed),t=hit(seed,dir,f);return t!==null&&Math.abs(t-1)<1e-4&&!faces.some(g=>{if(g.id===f.id)return false;const t=hit(seed,dir,g);return t!==null&&t<1-1e-5;});});
  if(!visible)continue;const g=structuredClone(f);if(dot(g.normal,sub(seed,g.outer[0]))<0){g.outer.reverse();g.holes.forEach(h=>h.reverse());g.normal=mul(g.normal,-1);}selected.push(g);
 }
 const planes=selected.map(f=>[f.normal,f.outer[0]]),clipped=[];
 for(const f of selected){let outer=f.outer,holes=f.holes;for(const[n,p]of planes){outer=clip(outer,n,p);holes=holes.map(h=>{const cut=clip(h,n,p);if(cut.length&&h.some(q=>dot(n,sub(q,p))<-EPS))throw Error('Un hueco intersecta el límite del recinto. Requiere revisión.');return cut;}).filter(h=>h.length>=3);}if(outer.length>=3&&norm(va(outer))>EPS)clipped.push(prepare({...f,outer,holes}));}
 selected=clipped;return {...validate(selected,seed),faces:selected,excluded_faces:faces.length-selected.length};
}
export function demoFaces({length:L=6,width:W=4,height:H=3,thickness:t=.2}={}){
 if([L,W,H,t].some(x=>!Number.isFinite(x)||x<=.01||x>=1000))throw Error('Dimensiones inválidas.');
 const raw=[];
 for(const[lo,hi,name]of [[[-t,-t,0],[0,W+t,H],'Muro oeste'],[[L,-t,0],[L+t,W+t,H],'Muro este'],[[0,-t,0],[L,0,H],'Muro sur'],[[0,W,0],[L,W+t,H],'Muro norte'],[[-t,-t,-t],[L+t,W+t,0],'Piso'],[[-t,-t,H],[L+t,W+t,H+t],'Techo']]){
  const[x,y,z]=lo,[X,Y,Z]=hi;
  const loops=[[[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],[[X,y,z],[X,Y,z],[X,Y,Z],[X,y,Z]],[[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]],[[x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z]],[[x,y,z],[x,Y,z],[X,Y,z],[X,y,z]],[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]]];
  raw.push(...loops.map(outer=>({outer,object:name,name,is_solid:true})));
 }return raw.map(prepare);
}
