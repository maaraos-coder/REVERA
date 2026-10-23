/* REVERA adaptation of the Hew web host, AGPL-3.0-only.
 * This bridge is part of the modified editor, not a proprietary plugin.
 * Only a same-origin parent window can access the embedded model.
 */
try{localStorage.setItem('hew.settings.showWelcome','false');if(localStorage.getItem('revera.workspace-layout')!=='1'){localStorage.setItem('hew.railNarrow','1');localStorage.setItem('revera.workspace-layout','1');}}catch{}
// Presentation branding only: original source and legal notices remain available in Acerca de.
function brandEditor(root){
 const rename=text=>{text=text.replace(/\bHew\b|\bHEW\b/g,'REVERA');for(const [en,es] of Object.entries({
 "Click a face to paint it with the current material — Shift-click replaces it everywhere, Ctrl/Cmd+Shift-click replaces within the object, Ctrl/Cmd-click fills the whole object, Alt = eyedropper.":"Haz clic en una cara para aplicar el material elegido. Mayús + clic: reemplazar en todo el modelo; Ctrl/Cmd + Mayús + clic: reemplazar en el objeto; Ctrl/Cmd + clic: pintar el objeto completo; Alt: cuentagotas.",
 "Alt-click a face to sample its material.":"Alt + clic en una cara para tomar su material.",
 "Click to select — drag an object to move it, drag empty space for a marquee, double-click to enter a group or component.":"Haz clic para seleccionar una cara y pulsa Supr para borrarla. Ctrl/Mayús + clic selecciona objetos completos; doble clic entra en un grupo o componente.",
 "Click a face to push or pull it — double-click repeats the last distance.":"Haz clic en una cara para extruirla; doble clic repite la última distancia.",
 "Click the circle's center — on the ground plane or any face or sketch.":"Haz clic en el centro del círculo, sobre el suelo, una cara o un boceto.",
 "Click to set the radius — or type an exact radius.":"Haz clic para fijar el radio o escribe un radio exacto.",
 "Click the first corner — on the ground plane or any face or sketch.":"Haz clic en la primera esquina, sobre el suelo, una cara o un boceto.",
 "Click to start a line — on the ground plane or any face or sketch.":"Haz clic para comenzar una línea, sobre el suelo, una cara o un boceto.",
 "Click the object you want to move.":"Haz clic en el objeto que quieres mover.",
 "Click a base point to start the move.":"Haz clic en un punto de referencia para comenzar a mover.",
 "On Face":"Sobre la cara","On Edge":"Sobre la arista","Ground":"Suelo",
 "Orbit":"Orbitar","Top":"Superior","Front":"Frontal","Iso":"Isométrica",
 "Rotate the camera around the model.":"Gira la cámara alrededor del modelo. Atajo: O; también puedes arrastrar con la rueda pulsada.",
 "Pan the camera without rotating.":"Desplaza la cámara sin girarla. Atajo: H; también Mayús + arrastrar con la rueda pulsada.",
 "OBJECT INFO":"INFORMACIÓN DEL OBJETO","OUTLINER":"ESTRUCTURA DEL MODELO","MATERIALS":"MATERIALES","COMPONENTS":"COMPONENTES","TAGS":"ETIQUETAS","SCENES":"ESCENAS","CHANGES":"CAMBIOS",
 "Object Info":"Información del objeto","Outliner":"Estructura del modelo","Materials":"Materiales","Components":"Componentes","Tags":"Etiquetas","Scenes":"Escenas","Changes":"Cambios",
 "Default":"Predeterminado","Opacity":"Opacidad","Add color":"Añadir color","+ Add color":"+ Añadir color","Add texture":"Añadir textura","Save to Library":"Guardar en biblioteca","Choose color":"Elegir color","Name…":"Nombre…","Name...":"Nombre…","Filter materials…":"Filtrar materiales…","Filter materials...":"Filtrar materiales…","Filter outliner…":"Filtrar estructura…","Filter outliner...":"Filtrar estructura…",
 "No component definitions in this document.":"Este documento no contiene componentes.",
 "No Scenes yet. Add Scene saves the current camera, visibility, and section cut.":"Aún no hay escenas. Añadir escena guarda la cámara, la visibilidad y el corte actuales.",
 "Add Scene":"Añadir escena",
 "Paint":"Pintar","Select":"Seleccionar","Push/Pull":"Empujar/tirar","Line":"Línea","Rectangle":"Rectángulo","Circle":"Círculo","Move":"Mover"
 }))text=text===en?es:text.replaceAll(en.length>25?en:'\u0000',es);return text;};
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(walk.nextNode()){const node=walk.currentNode;if(node.parentElement?.closest('script,style,textarea,input,[contenteditable]'))continue;const next=rename(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
 for(const element of root.querySelectorAll?.('[title],[aria-label],[alt],[placeholder]')||[]){for(const attr of ['title','aria-label','alt','placeholder']){const value=element.getAttribute(attr);if(value){const next=attr==='aria-label'?value.replace(/\bHew\b|\bHEW\b/g,'REVERA'):rename(value);if(next!==value)element.setAttribute(attr,next);}}}
}
window.reveraInstall=(deps,createScene)=>{
 const settingsStyle=document.createElement('style');settingsStyle.textContent='button[title^="Settings"]{width:auto!important;min-width:54px!important;padding:4px 9px!important;font-size:11px!important}button[title^="Settings"] svg{display:none!important}button[title^="Settings"]:after{content:"Ajustes";color:var(--text-primary,#c7d9e3)}';settingsStyle.textContent+='body.revera-erasing canvas{cursor:crosshair!important}body.revera-erasing .hew-dock button[title="Borrar caras"]{background:#674d37!important;color:#ffe0c3!important}div:has(> .revera-document-name){position:static!important;left:auto!important;transform:none!important;margin-left:14px;max-width:180px!important;min-width:0;flex:0 1 180px;gap:0!important}div:has(> .revera-document-name)>span:not(.revera-document-name){display:none!important}.revera-document-name{font-size:11px!important}div:has(> .revera-document-name)>span{white-space:nowrap}.hew-dock{max-width:calc(100% - 90px);overflow-x:auto;gap:4px!important}.hew-dock>button{flex-shrink:0;min-width:62px}button[title="Archivo"],button[title="Editar"]{white-space:nowrap}@media(max-width:1100px){div:has(> .revera-document-name){display:none!important}}';document.head.append(settingsStyle);
 brandEditor(document.documentElement);
 const brandObserver=new MutationObserver(()=>brandEditor(document.documentElement));
 brandObserver.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
 let last=null,connection=null,busy=false,faceMode=false,eraseMode=false,selectionFaces=[],selectedFace=null,selectionHash=null;
 const selectionModule=import('/face-selection.js');
 let drawingMath=null,directFace=false,directGesture=false,deleteHeld=false,paintHover=null,hoverTime=0;
 Promise.all([selectionModule,import('/drawing-selection.js')]).then(([selection,drawing])=>{drawingMath={...selection,...drawing};});
 const overlay=document.createElement('canvas');Object.assign(overlay.style,{position:'fixed',pointerEvents:'none',zIndex:'1000'});document.body.append(overlay);
 const renderer=()=>[...document.querySelectorAll('canvas')].filter(c=>c!==overlay).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
 let down=null;
 function activeDrawingTool(){return document.querySelector('[role="radio"][aria-checked="true"][aria-label]')?.getAttribute('aria-label');}
 function toggleDrawingEraser(e){if(!e.target.closest?.('button[title="Borrar caras"]'))return;e.preventDefault();e.stopImmediatePropagation();parent.postMessage({channel:'revera-erase-toggle'},location.origin);}
 window.addEventListener('click',toggleDrawingEraser,true);
 function resumeDrawing(){if(!faceMode&&!eraseMode)return;faceMode=false;eraseMode=false;document.body.classList?.toggle('revera-erasing',false);selectedFace=null;down=null;parent.postMessage({channel:'revera-face-mode',enabled:false},location.origin);}
 // Tool rail state also follows menu commands and keyboard shortcuts.
 const toolObserver=new MutationObserver(()=>{const tool=activeDrawingTool();if(tool&&tool!=='Select'){directGesture=false;if(directFace){directFace=false;selectedFace=null;}}if((faceMode||eraseMode)&&tool&&tool!=='Select')resumeDrawing();});
 toolObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['aria-checked']});
 function guardKeys(e){if(deleteHeld&&['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();return;}if(directFace&&!e.target.closest?.('input,textarea,[contenteditable=true]')){if(e.key==='Escape'){directFace=false;selectedFace=null;return;}if(['Delete','Backspace'].includes(e.key)){deleteHeld=true;e.preventDefault();e.stopImmediatePropagation();if(selectionHash===active().state_hash().toString())parent.postMessage({channel:'revera-delete-selected-face',face:selectedFace},location.origin);directFace=false;selectedFace=null;return;}}if(e.key==='Escape'&&(faceMode||eraseMode)){resumeDrawing();return;}if((faceMode||eraseMode)&&['Delete','Backspace'].includes(e.key)&&!e.target.closest?.('input,textarea,[contenteditable=true]')){e.preventDefault();e.stopImmediatePropagation();}}
 window.addEventListener('keydown',guardKeys,true);
 const releaseDelete=()=>{deleteHeld=false;};window.addEventListener('keyup',releaseDelete,true);window.addEventListener('blur',releaseDelete);
 function capture(e){if(e.type==='pointerdown'&&e.target===renderer())parent.postMessage({channel:'revera-drawing-interaction'},location.origin);const tool=activeDrawingTool();if(tool&&tool!=='Select'){directGesture=false;if(directFace){directFace=false;selectedFace=null;}}if((faceMode||eraseMode)&&tool&&tool!=='Select')resumeDrawing();if(!faceMode&&!eraseMode&&e.target===renderer()){
  if(e.type==='pointerdown'){
   directGesture=false;directFace=false;selectedFace=null;
   if(drawingMath?.plainSelect(e,tool))try{
    const api=deps.getViewportApi(),camera=api?.getCameraState(),r=renderer().getBoundingClientRect();
    if(camera){const ray=drawingMath.cameraRay(camera,e.clientX-r.left,e.clientY-r.top,r.width,r.height);const face=drawingMath.drawingFace(active(),rpc,ray);
     if(face){selectedFace=face;directFace=true;directGesture=true;selectionHash=active().state_hash().toString();api.clearObjectHighlight();}}
   }catch(error){parent.postMessage({channel:'revera-selection-error',error:error.message},location.origin);}
  }
  if(directGesture){e.stopImmediatePropagation();e.preventDefault();return;}
 }
 if((!faceMode&&!eraseMode)||e.button!==0||e.target!==renderer())return;e.stopImmediatePropagation();e.preventDefault();if(e.type==='pointerdown')down=[e.clientX,e.clientY];if(e.type==='pointerup'&&down){const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(moved>5)return;selectionModule.then(({pickFace,cameraRay})=>{if(selectionHash!==active().state_hash().toString()){parent.postMessage({channel:'revera-face-stale'},location.origin);return;}const r=renderer().getBoundingClientRect(),camera=deps.getViewportApi()?.getCameraState();if(!camera)return;const ray=cameraRay(camera,e.clientX-r.left,e.clientY-r.top,r.width,r.height);selectedFace=pickFace(selectionFaces,ray.origin,ray.direction);parent.postMessage({channel:eraseMode?'revera-erase-face':'revera-face',face:selectedFace},location.origin);});}}
 for(const type of ['pointerdown','pointerup','dblclick','click'])window.addEventListener(type,capture,true);
 // Paint uses a face-only overlay; picking never consumes the painting click.
 function paintPointer(e){if(e.target!==renderer()||activeDrawingTool()!=='Paint'||!drawingMath){paintHover=null;return;}if(Date.now()-hoverTime<50)return;hoverTime=Date.now();try{const r=renderer().getBoundingClientRect(),camera=deps.getViewportApi()?.getCameraState();if(!camera)return;paintHover=drawingMath.drawingFace(active(),rpc,drawingMath.cameraRay(camera,e.clientX-r.left,e.clientY-r.top,r.width,r.height));}catch{paintHover=null;}}
 window.addEventListener('pointermove',paintPointer,true);
 const highlightTimer=setInterval(()=>{const c=renderer(),api=deps.getViewportApi();if(!c||!api)return;const r=c.getBoundingClientRect();Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});overlay.width=r.width*devicePixelRatio;overlay.height=r.height*devicePixelRatio;const ctx=overlay.getContext('2d');ctx.scale(devicePixelRatio,devicePixelRatio);if(directFace&&selectionHash!==deps.getScene()?.state_hash().toString()){directFace=false;selectedFace=null;}const visibleFace=activeDrawingTool()==='Paint'?paintHover:((faceMode||eraseMode||directFace)?selectedFace:null);if(!visibleFace)return;ctx.beginPath();for(const loop of [visibleFace.outer,...(visibleFace.holes||[])]){const points=loop.map(p=>api.worldToScreen(p));if(points.some(p=>p.behind))return;points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}ctx.fillStyle='#52ddbe66';ctx.fill('evenodd');ctx.strokeStyle='#96ffe4';ctx.lineWidth=2;ctx.stroke();},80);

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
   if(method==='face-mode'||method==='erase-mode'){directFace=false;if(method==='erase-mode'){eraseMode=!!params.enabled;faceMode=false;}else{faceMode=!!params.enabled;eraseMode=false;}document.body.classList?.toggle('revera-erasing',eraseMode);selectionFaces=params.faces||[];selectedFace=null;selectionHash=scene.state_hash().toString();if(faceMode||eraseMode){document.querySelector('[role="radio"][aria-label="Select"]')?.click();deps.getViewportApi()?.clearObjectHighlight();}result={done:true};}
   else if(method==='delete-face'){directFace=false;const {removeDrawingFace}=await import('/face-edit.js');result=removeDrawingFace(scene,rpc,params.face);selectedFace=null;faceMode=false;eraseMode=false;document.body.classList?.toggle('revera-erasing',false);deps.getViewportApi()?.refreshScene();deps.reconcileVisibility?.();}
   else if(method==='undo-face'){if(params.hash!==scene.state_hash().toString())throw Error('El dibujo cambió después del borrado. Usa Editar → Deshacer para revisar el historial.');rpc(scene,'hew.history.undo');selectedFace=null;faceMode=false;eraseMode=false;document.body.classList?.toggle('revera-erasing',false);deps.getViewportApi()?.refreshScene();deps.reconcileVisibility?.();result={done:true};}
   else if(method==='ping')result={ready:true,version:'1.2.3',hash:scene.state_hash().toString(),objects:rpc(scene,'hew.query.scene').document.objects,sketches:rpc(scene,'hew.query.scene').document.sketches};
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
 return()=>{window.removeEventListener('pointermove',paintPointer,true);window.removeEventListener('click',toggleDrawingEraser,true);settingsStyle.remove();brandObserver.disconnect();toolObserver.disconnect();window.removeEventListener('keydown',guardKeys,true);window.removeEventListener('keyup',releaseDelete,true);window.removeEventListener('blur',releaseDelete);clearInterval(highlightTimer);overlay.remove();for(const type of ['pointerdown','pointerup','dblclick','click'])window.removeEventListener(type,capture,true);clearInterval(timer);window.removeEventListener('message',handle);if(last&&connection!==null)try{last.api_connection_close(connection);}catch{}};
};
