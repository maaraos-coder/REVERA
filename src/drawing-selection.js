// Ordinary Select works on raw geometry. Explicit groups and component instances
// retain the editor's native selection; modifiers request whole-object selection.
export function drawingFace(scene,rpc,ray){
 const hit=rpc(scene,'hew.query.raycast',{origin:ray.origin,dir:ray.direction});
 if(!hit||hit.kind!=='object'||!hit.object)return null;
 const root=rpc(scene,'hew.query.scene').tree.find(n=>n.kind==='object'&&n.id===hit.object);
 if(!root)return null;
 const resolved=rpc(scene,'hew.query.resolve',{face:{object:hit.object,at:hit.point}});
 return resolved.face?{...resolved.face,id:hit.object,name:root.name||hit.object}:null;
}
export function plainSelect(event,tool){return tool==='Select'&&event.button===0&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey;}
