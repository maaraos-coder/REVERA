import {faceKey,bands} from './face-selection.js';
export function assignFaceDefaults(faces,properties){
 let wall=0,slope=0,floor=0,ceiling=0;
 for(const face of faces){let name;if(face.normal[2]>.99){floor++;name='Piso'+(floor>1?' '+floor:'');}else if(face.normal[2]<-.99){ceiling++;name='Techo'+(ceiling>1?' '+ceiling:'');}else if(Math.abs(face.normal[2])<.01){name='Muro '+ ++wall;}else{name='Superficie inclinada '+ ++slope;}
 const key=faceKey(face),existing=properties[key]||properties[face.source_key];
 if(existing){properties[key]={...existing,name:existing.name||name};}else properties[key]={name,material:'Sin definir · α provisional',alpha:bands.map(()=>.05),provisional:true};
 }
 return properties;
}
