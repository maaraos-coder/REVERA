/* REVERA adaptation of the Hew web host, AGPL-3.0-only.
 * This bridge is part of the modified editor, not a proprietary plugin.
 * Only a same-origin parent window can access the embedded model.
 */
try{localStorage.setItem('hew.settings.showWelcome','false');}catch{}
window.reveraInstall=(deps,createScene)=>{
 let last=null,connection=null,busy=false;
 function rpc(scene,method,params={}){
  let id=scene===last?connection:scene.api_connection_open();
  const call=(m,p)=>{const r=JSON.parse(scene.api_dispatch(id,JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})));if(r.error)throw Error(r.error.data?.explanation||r.error.message);return r.result;};
  if(scene!==last){call('hew.meta.hello',{protocol:1,client:{name:'revera-web',version:'0.2.0'}});call('hew.doc.attach',{});}
  try{return call(method,params);}finally{if(scene!==last)scene.api_connection_close(id);}
 }
 function active(){const scene=deps.getScene();if(!scene)throw Error('El editor está iniciando. Espera unos segundos.');if(scene!==last){last=scene;connection=scene.api_connection_open();const call=(method,params)=>JSON.parse(scene.api_dispatch(connection,JSON.stringify({jsonrpc:'2.0',id:1,method,params})));for(const[m,p]of [['hew.meta.hello',{protocol:1,client:{name:'revera-web',version:'0.2.0'}}],['hew.doc.attach',{}]]){const r=call(m,p);if(r.error)throw Error(r.error.message);}}return scene;}
 const b64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);};
 function refresh(){const api=deps.getViewportApi();if(api){api.refreshScene();api.zoomExtents();}else deps.reconcile();deps.reconcileVisibility?.();}
 async function handle(e){
  if(e.origin!==location.origin||e.source!==parent||e.data?.channel!=='revera-request')return;
  const {id,method,params={}}=e.data;
  try{
   if(busy)throw Error('Hay otra operación en curso en el editor.');busy=true;
   const scene=active();let result;
   if(method==='ping')result={ready:true,version:'1.2.3',objects:rpc(scene,'hew.query.scene').document.objects,sketches:rpc(scene,'hew.query.scene').document.sketches};
   else if(method==='snapshot'){
    // Host export preserves non-solid sheets. API export intentionally filters
    // them, which is inappropriate for an acoustic surface model.
    const bytes=scene.export('glb',0);if(!bytes?.length)throw Error('Dibuja o importa un recinto antes de generar el modelo acústico.');
    const scratch=createScene();try{
     rpc(scratch,'hew.doc.import',{path:'world.glb',bytes_base64:b64(bytes)});
     const tree=rpc(scratch,'hew.query.scene'),objects=[];
     const walk=nodes=>nodes.forEach(n=>{if(n.kind==='object')objects.push(n);else if(n.kind==='group')walk(n.members||[]);else if(n.kind==='instance')throw Error('Una instancia no pudo expandirse.');});walk(tree.tree);
     if(objects.length>500)throw Error('Simplifica el modelo a un máximo de 500 objetos.');
     const faces=[];for(const obj of objects){for(const f of rpc(scratch,'hew.query.faces',{object:obj.id}).faces)faces.push({...f,id:`f${faces.length}`,name:obj.name||obj.id,is_solid:obj.watertight});}
     if(faces.length>5000)throw Error('Simplifica el modelo a un máximo de 5.000 caras.');
     result={name:params.name||'Dibujo del editor',faces,materials:tree.materials,warnings:[],editor_bytes:b64(scene.save())};
    }finally{scratch.free();}
   }else if(method==='demo'){
    // Never replace an existing drawing silently. Parent asks explicitly.
    const {commands}=params;scene.load(new Uint8Array(params.blank));
    // The connection's attachment survives a load on the same Scene.
    for(const command of commands)rpc(scene,command.method,command.params);refresh();result={done:true};
   }else if(method==='import'){
    if(!/\.(skp|glb|stl)$/i.test(params.name))throw Error('Formato no admitido por este importador.');
    result=rpc(scene,'hew.doc.import',{path:params.name,bytes_base64:params.bytes,units:params.units||'m'});refresh();
   }else if(method==='load'){
    const bytes=Uint8Array.from(atob(params.bytes),c=>c.charCodeAt(0));scene.load(bytes);refresh();result={done:true};
   }else if(method==='commands'){
    result=rpc(scene,'hew.doc.transact',{label:params.label||'REVERA',commands:params.commands});refresh();
   }else if(method==='save')result={bytes:b64(scene.save())};
   else if(method==='blank')result={bytes:b64(createBlank())};
   else throw Error('Operación no disponible.');
   parent.postMessage({channel:'revera-response',id,result},location.origin);
  }catch(error){parent.postMessage({channel:'revera-response',id,error:error.message||String(error)},location.origin);}finally{busy=false;}
 }
 function createBlank(){const blank=createScene();try{return blank.save();}finally{blank.free();}}
 window.addEventListener('message',handle);
 const timer=setInterval(()=>{if(deps.getScene())parent.postMessage({channel:'revera-ready',hash:deps.getScene().state_hash().toString()},location.origin);},1500);
 return()=>{clearInterval(timer);window.removeEventListener('message',handle);if(last&&connection!==null)try{last.api_connection_close(connection);}catch{}};
};
