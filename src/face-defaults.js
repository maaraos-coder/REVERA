import {faceKey,bands} from './face-selection.js';
export function assignFaceDefaults(faces,properties){
 let index=0;
 for(const face of faces){let n=++index,name='';while(n){n--;name=String.fromCharCode(65+n%26)+name;n=Math.floor(n/26);}
 const key=faceKey(face),existing=properties[key]||properties[face.source_key];
 if(existing){properties[key]={...existing,name:existing.name||name};}else properties[key]={name,material:'Sin definir · α provisional',alpha:bands.map(()=>.05),provisional:true};
 }
 return properties;
}
