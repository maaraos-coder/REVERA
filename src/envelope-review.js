import {prepare,validate,extract} from './geometry.js';
import {faceKey} from './face-selection.js';
export function reviewEnvelope(raw,{thick=false,flipped=[],orient=false}={}){
 if(!raw.length)throw Error('Dibuja o importa las caras de un recinto.');
 if(raw.length>5000)throw Error('El modelo supera las 5.000 caras.');
 const original=raw.map(prepare),points=original.flatMap(f=>f.outer),center=[0,1,2].map(k=>(Math.min(...points.map(p=>p[k]))+Math.max(...points.map(p=>p[k])))/2);
 // This is a geometric reference computed from the model, never a user input.
 let faces=thick?extract(original,center).faces:original;
 const overrides=new Set(flipped),reversed=[];
 faces=faces.map(f=>{const key=faceKey(f);let out={...f,source_key:f.source_key||key};if(overrides.has(key))out=reverse(out);const signed=out.normal.reduce((sum,n,i)=>sum+n*(center[i]-out.outer[0][i]),0);if(orient&&signed< -1e-6){out=reverse(out);reversed.push(key);}return {...out,orientation:Math.abs(signed)<1e-6?'?':orient||signed>0?'D':'F'};});
 const checked=validate(faces.map(f=>f.orientation==='F'?reverse(f):f),center),outside=faces.filter(f=>f.orientation!=='D').length;
 const errors=checked.errors.map(error=>error.includes('El punto debe')?'No se pudo determinar un interior coherente. Revisa la forma y las caras de la envolvente.':error.includes('volumen interior no es positivo')?'La envolvente no delimita un volumen de aire válido.':error);if(outside)errors.unshift(`Revisa la orientación de ${outside} caras (${faces.filter(f=>f.orientation!=='D').map(f=>f.id).join(', ')}). Usa Orientar caras hacia dentro (D) o invierte cada cara.`);
 const valid=checked.valid&&outside===0;
 return {...checked,valid,errors,volume_m3:valid?checked.volume_m3:null,faces,orientation_valid:outside===0,outside_count:outside,reversed_keys:reversed,scope:'Un recinto convexo cerrado, sin obstáculos ni caras duplicadas.'};
}
function reverse(face){return prepare({...face,outer:[...face.outer].reverse(),holes:face.holes.map(loop=>[...loop].reverse())});}
