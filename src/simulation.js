import {faceKey,bands} from './face-selection.js';
export const defaultSimulation=()=>({sources:[],receivers:[]});
export function normalizeSimulation(value){
 const state=defaultSimulation();
 for(const kind of ['sources','receivers']){
  const items=value?.[kind]??[];
  if(!Array.isArray(items)||items.length>100)throw Error('Se admiten hasta 100 fuentes y 100 receptores.');
  state[kind]=items.map((item,index)=>{
   if(!item||!Array.isArray(item.position)||item.position.length!==3||!item.position.every(Number.isFinite))throw Error('Coordenadas de fuente o receptor inválidas.');
   const row={id:String(item.id||`${kind==='sources'?'F':'R'}${index+1}`).slice(0,80),name:String(item.name||'Sin nombre').slice(0,100),position:[...item.position]};
   if(kind==='sources'){
    if(!Array.isArray(item.power)||item.power.length!==bands.length||!item.power.every(x=>Number.isFinite(x)&&x>=-100&&x<=200))throw Error('Introduce Lw entre −100 y 200 dB en las seis bandas.');
    row.power=[...item.power];if(Number.isFinite(item.power8000)&&item.power8000>=-100&&item.power8000<=200)row.power8000=item.power8000;row.directivity='omnidirectional';
   }
   return row;
  });
  if(new Set(state[kind].map(x=>x.id)).size!==items.length)throw Error('Hay identificadores duplicados.');
 }
 return state;
}
export function isInsideRoom(room,position){
 if(!room?.valid||!room.faces?.length)return false;
 return room.faces.every(face=>face.normal.reduce((sum,n,k)=>sum+n*(position[k]-face.centroid[k]),0)>1e-5);
}
export function createSimulationJob(room,properties,state){
 if(!room?.valid)throw Error('Revisa primero la orientación y el cierre del recinto.');
 const simulation=normalizeSimulation(state);
 if(!simulation.sources.length||!simulation.receivers.length)throw Error('Añade al menos una fuente y un receptor.');
 for(const item of [...simulation.sources,...simulation.receivers])if(!isInsideRoom(room,item.position))throw Error(`${item.name}: debe estar dentro del recinto, separado de las caras.`);
 for(const source of simulation.sources)for(const receiver of simulation.receivers)if(Math.hypot(...source.position.map((x,k)=>x-receiver.position[k]))<1e-4)throw Error('Una fuente y un receptor no pueden ocupar el mismo punto.');
 let provisionalFaces=0;
 const faces=room.faces.map(face=>{
  const property=properties[faceKey(face)]||properties[face.source_key]||{};
  if(!Array.isArray(property.alpha)||property.alpha.length!==6||!property.alpha.every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw Error('Faltan coeficientes α válidos en las caras.');
  if(property.provisional)provisionalFaces++;
  return {id:face.id,name:property.name||face.id,outer:face.outer,holes:face.holes,normal:face.normal,area:face.area,alpha:[...property.alpha],alpha8000:property.alpha8000,material:property.material||'',provisional:!!property.provisional};
 });
 const extended=faces.every(f=>Number.isFinite(f.alpha8000)&&f.alpha8000>=0&&f.alpha8000<=1)&&simulation.sources.every(s=>Number.isFinite(s.power8000));
 if(extended){faces.forEach(f=>f.alpha.push(f.alpha8000));simulation.sources.forEach(s=>s.power.push(s.power8000));}
 return {format:'revera-simulation-job',version:1,target:'I-Simpa SPPS 2.2.1',status:'prepared-not-simulated',units:{position:'m',power:'dB re 1 pW'},bands:extended?[...bands,8000]:[...bands],room:{volume:room.volume_m3,surface:room.surface_m2,faces},...simulation,provisionalFaces,limitations:['Formato de intercambio REVERA; requiere adaptador y mallado antes de ejecutar SPPS.','La difusión de los materiales aún no está definida.']};
}
