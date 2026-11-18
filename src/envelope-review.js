import {topologyReview} from './surface-topology.js';
import {prepare,validate,extract} from './geometry.js';
import {faceKey} from './face-selection.js';
export function reviewEnvelope(raw,{thick=false,flipped=[],orient=false}={}){
 if(!raw.length)throw Error('Dibuja o importa las caras de un recinto.');
 if(raw.length>5000)throw Error('El modelo supera las 5.000 caras.');
 const original=raw.map(prepare);
 // Imported open sheets are not architectural solids: avoid quadratic visibility extraction.
 if(!thick||!original.some(f=>f.is_solid)){
  const overrides=new Set(flipped);const input=original.map(f=>{const key=faceKey(f);return {...(overrides.has(key)?reverse(f):f),source_key:f.source_key||key};});
  const report=topologyReview(input,{orient});
  if(report){const errors=[...report.errors];if(report.outside)errors.unshift(`Revisa la orientación de ${report.outside} caras. Usa Orientar caras hacia dentro (D) o invierte cada cara.`);const valid=!errors.length;return {valid,errors,faces:report.faces,face_count:report.faces.length,surface_m2:report.faces.reduce((s,f)=>s+f.area,0),volume_m3:valid?report.volume:null,orientation_valid:report.outside===0,outside_count:report.outside,reversed_keys:report.reversed.map(faceKey),convex:report.convex,scope:'Una envolvente cerrada y conectada. SPPS espacial requiere un recinto convexo.',warnings:!report.convex?['Recinto cóncavo: área, volumen y TCR disponibles; el mallado SPPS actual no admite esta geometría.']:[]};}
 }
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const f of original)for(const p of f.outer)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}const center=lo.map((v,k)=>(v+hi[k])/2);
 // This is a geometric reference computed from the model, never a user input.
 let faces=thick&&original.some(f=>f.is_solid)?extract(original,center).faces:original;
 const overrides=new Set(flipped),reversed=[];
 faces=faces.map(f=>{const key=faceKey(f);let out={...f,source_key:f.source_key||key};if(overrides.has(key))out=reverse(out);const signed=out.normal.reduce((sum,n,i)=>sum+n*(center[i]-out.outer[0][i]),0);if(orient&&signed< -1e-6){out=reverse(out);reversed.push(key);}return {...out,orientation:Math.abs(signed)<1e-6?'?':orient||signed>0?'D':'F'};});
 const checked=validate(faces.map(f=>f.orientation==='F'?reverse(f):f),center),outside=faces.filter(f=>f.orientation!=='D').length;
 const errors=checked.errors.map(error=>error.includes('El punto debe')?'No se pudo determinar un interior coherente. Revisa la forma y las caras de la envolvente.':error.includes('volumen interior no es positivo')?'La envolvente no delimita un volumen de aire válido.':error);if(outside)errors.unshift(`Revisa la orientación de ${outside} caras (${faces.filter(f=>f.orientation!=='D').map(f=>f.id).join(', ')}). Usa Orientar caras hacia dentro (D) o invierte cada cara.`);
 const valid=checked.valid&&outside===0;
 return {...checked,valid,errors,volume_m3:valid?checked.volume_m3:null,faces,orientation_valid:outside===0,outside_count:outside,reversed_keys:reversed,scope:'Un recinto convexo cerrado, sin obstáculos ni caras duplicadas.'};
}
function reverse(face){return prepare({...face,outer:[...face.outer].reverse(),holes:face.holes.map(loop=>[...loop].reverse())});}
