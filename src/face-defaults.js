import {faceKey,bands} from './face-selection.js';
export function assignFaceDefaults(faces,properties){
 let index=0;
 for(const face of faces){const name='C'+String(++index).padStart(3,'0');
 const key=faceKey(face),existing=properties[key]||properties[face.source_key];
 if(existing){properties[key]={...existing,name:existing.provisional&&/^[A-Z]+$/.test(existing.name||'')?name:existing.name||name};}else properties[key]={name,material:'Sin definir · α provisional',alpha:bands.map(()=>.05),provisional:true};
 }
 return properties;
}
