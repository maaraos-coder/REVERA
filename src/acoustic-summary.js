import {faceKey,bands} from './face-selection.js';
export function acousticSummary(result,properties={}){
 if(!result?.valid)return null;
 let assignedArea=0,missingArea=0;const equivalent=bands.map(()=>0),faces=result.faces.map(face=>{const property=properties[faceKey(face)]||properties[face.source_key]||{},alpha=property.alpha,assigned=Array.isArray(alpha)&&alpha.length===bands.length&&alpha.every(v=>Number.isFinite(v)&&v>=0&&v<=1);if(assigned){assignedArea+=face.area;alpha.forEach((a,i)=>equivalent[i]+=face.area*a);}else missingArea+=face.area;return {id:face.id,area:face.area,material:property.material||'Sin asignar',alpha:assigned?alpha:null,equivalent:assigned?alpha.map(a=>a*face.area):null};});
 return {bands,faces,assignedArea,missingArea,equivalent,complete:missingArea<1e-6};
}
