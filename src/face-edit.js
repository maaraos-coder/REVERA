import {prepare,hit} from './geometry.js';
export function sameFace(a,b,tolerance=2e-5){const loops=f=>[f.outer,...(f.holes||[])];const A=loops(a),B=loops(b);return A.length===B.length&&A.every(loop=>B.some(other=>loop.length===other.length&&loop.every(p=>other.some(q=>Math.hypot(...p.map((v,k)=>v-q[k]))<tolerance))));}
export function interiorPoint(raw){const f=prepare(raw),n=f.normal;const candidates=[f.centroid,...f.outer.map((p,i)=>p.map((v,k)=>(v+f.outer[(i+1)%f.outer.length][k]+f.centroid[k])/3))];for(const p of candidates){const t=hit(p.map((v,k)=>v+n[k]),n.map(v=>-v),f);if(t!==null&&Math.abs(t-1)<1e-5)return p;}throw Error('No se pudo localizar el interior de esta superficie.');}
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function surfaceDae(faces,name='Superficie abierta'){
 const points=[],indices=faces.map(f=>[f.outer,...(f.holes||[])].map(loop=>loop.map(p=>{points.push(p);return points.length-1;}).join(' ')));
 if(!faces.length)throw Error('No quedan superficies.');
 const polygons=indices.map(([outer,...holes])=>holes.length?`<ph><p>${outer}</p>${holes.map(h=>`<h>${h}</h>`).join('')}</ph>`:`<p>${outer}</p>`).join('');
 return `<?xml version="1.0"?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><created>2026-10-23T00:00:00Z</created><modified>2026-10-23T00:00:00Z</modified><unit name="meter" meter="1"/><up_axis>Z_UP</up_axis></asset><library_geometries><geometry id="revera-mesh" name="${xml(name)}"><mesh><source id="positions"><float_array id="positions-array" count="${points.length*3}">${points.flat().join(' ')}</float_array><technique_common><accessor source="#positions-array" count="${points.length}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source><vertices id="vertices"><input semantic="POSITION" source="#positions"/></vertices><polygons count="${faces.length}"><input semantic="VERTEX" source="#vertices" offset="0"/>${polygons}</polygons></mesh></geometry></library_geometries><library_visual_scenes><visual_scene id="world"><node id="surface" name="${xml(name)}"><instance_geometry url="#revera-mesh"/></node></visual_scene></library_visual_scenes><scene><instance_visual_scene url="#world"/></scene></COLLADA>`;
}
export function removeDrawingFace(scene,rpc,selected){
 const tree=rpc(scene,'hew.query.scene');const matches=[];
 // World objects only: changing a shared component definition would alter every copy.
 for(const object of tree.tree.filter(n=>n.kind==='object')){const faces=rpc(scene,'hew.query.faces',{object:object.id}).faces;for(const face of faces)if(sameFace(face,selected))matches.push({object,faces,face});}
 if(matches.length!==1)throw Error(matches.length?'Hay caras coincidentes. Separa los objetos antes de editar.':'Esta cara pertenece a un grupo, componente o a una envolvente recortada. Desagrupa o descompón el objeto y selecciona su cara original en Editor 3D o Arquitectónico.');
 const {object,faces,face}=matches[0],remaining=faces.filter(f=>f!==face);
 if(object.tags?.length)throw Error('Este objeto tiene etiquetas. Quítalas antes de convertirlo en superficies para conservar la organización del proyecto.');
 remaining.forEach(f=>prepare(f));
 if(faces.some(f=>f.texture_pins))throw Error('Este objeto tiene texturas. Expórtalo a GLB y vuelve a importarlo como malla antes de borrar caras.');
 const transact=commands=>rpc(scene,'hew.doc.transact',{label:'Borrar cara',commands});
 scene.history_bracket_open();try{
  if(remaining.length){
   const before=new Set(tree.tree.map(n=>n.id));scene.import_dae(new TextEncoder().encode(surfaceDae(remaining,object.name||'Superficie abierta')),{});
   const after=rpc(scene,'hew.query.scene'),roots=after.tree.filter(n=>!before.has(n.id)),objects=[];const walk=nodes=>nodes.forEach(n=>n.kind==='object'?objects.push(n):n.kind==='group'?walk(n.members||[]):null);walk(roots);
   if(!objects.length)throw Error('No se pudo reconstruir la superficie. El dibujo se conserva.');
   const updated=objects.flatMap(o=>rpc(scene,'hew.query.faces',{object:o.id}).faces.map(f=>({...f,object:o.id})));
   if(!remaining.every(old=>updated.some(f=>sameFace(f,old))))throw Error('La reconstrucción cambió un contorno. Operación cancelada.');
   const total=fs=>fs.reduce((sum,f)=>sum+f.area,0);if(Math.abs(total(updated)-total(remaining))>Math.max(1e-5,total(remaining)*1e-5))throw Error('La reconstrucción cambió el área. Operación cancelada.');
   const commands=[];
   for(const o of objects)commands.push({method:'hew.entity.rename',params:{id:o.id,name:object.name||'Superficie abierta'}});
   for(const old of remaining){if(!old.material)continue;const fresh=updated.find(f=>sameFace(f,old));if(!fresh)throw Error('No se pudo conservar un material. Operación cancelada.');commands.push({method:'hew.material.paint',params:{face:{object:fresh.object,at:interiorPoint(fresh)},material:old.material}});}
   // Imported COLLADA wrappers are removed after their geometry is moved to the world.
   commands.push({method:'hew.group.reparent',params:{ids:objects.map(o=>o.id),parent:null}});
   for(const root of roots.filter(n=>n.kind==='group'))commands.push({method:'hew.entity.delete',params:{id:root.id}});
   commands.push({method:'hew.entity.delete',params:{id:object.id}});transact(commands);
  }else transact([{method:'hew.entity.delete',params:{id:object.id}}]);
  scene.history_bracket_commit('Borrar cara');return {done:true,opened:remaining.length>0};
 }catch(error){scene.history_bracket_abort();throw error;}
}
