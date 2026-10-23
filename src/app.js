import {faceKey,bands,absorption} from './face-selection.js';
import {demoFaces,prepare} from './geometry.js';
import {editorCall,encodeBytes,roomCommands} from './editor-client.js';
import {parseDxf} from './dxf.js';
const $=id=>document.getElementById(id);
let model=null,result=null,mode='editor',busy=false,editorReady=false,lastEditorHash=null;
const worker=new Worker(new URL('./geometry-worker.js',import.meta.url),{type:'module'});
let job=0;const jobs=new Map();
worker.onmessage=({data})=>{const pending=jobs.get(data.id);if(!pending)return;clearTimeout(pending.timer);jobs.delete(data.id);data.error?pending.reject(Error(data.error)):pending.resolve(data.result);};
function compute(method,body){return new Promise((resolve,reject)=>{const id=++job;const timer=setTimeout(()=>{jobs.delete(id);reject(Error('La geometría tardó demasiado. Simplifica el modelo.'));},45000);jobs.set(id,{resolve,reject,timer});worker.postMessage({id,method,...body});});}

const canvas=$('view'),ctx=canvas.getContext('2d');
let eraseSelection=false;
let selectedFace=null,faceProperties={},projectedFaces=[],faceSelection=false;
let yaw=-.8,pitch=.55,zoom=1,drag=null;
const controls=['demo','extract','file','project','save','sync','saveHew','faceMode','eraseFaces'];
function message(text,error=false){$('message').textContent=text;$('message').style.borderColor=error?'#edab77':'#80cbb4';}
async function action(fn){if(busy)return;busy=true;controls.forEach(id=>$(id).disabled=true);try{await fn();}catch(e){message(e.message,true);}finally{busy=false;controls.forEach(id=>$(id).disabled=false);$('save').disabled=!editorReady;$('extract').disabled=!editorReady;}}
function load(data){clearFace();model=data;result=null;mode='architecture';zoom=1;$('modelName').textContent=data.name;renderResult();message(data.warnings?.join(' ')||'Modelo cargado. Indica un punto dentro del aire y genera la envolvente acústica.');draw();}
function renderResult(){
 $('drawing').setAttribute('aria-pressed',String(mode==='editor'));
 $('editor').hidden=mode!=='editor';canvas.hidden=mode==='editor';$('canvasLabels').hidden=mode==='editor';
 $('architecture').setAttribute('aria-pressed',String(mode==='architecture'));
 $('acoustic').setAttribute('aria-pressed',String(mode==='acoustic'));
 $('acoustic').disabled=!result;
 $('count').textContent=result?result.face_count:'—';$('area').textContent=result?`${result.surface_m2.toFixed(2)} m²`:'—';
 $('volume').textContent=result?.valid?`${result.volume_m3.toFixed(2)} m³`:'—';
 $('valid').textContent=!result?'Sin generar':result.valid?'Cerrada · revisar':'Requiere revisión';
 $('valid').style.color=result?.valid?'#8bd5bf':'#eac28e';
 const rows=$('faces');rows.replaceChildren();
 if(!result){const row=rows.insertRow();const cell=row.insertCell();cell.colSpan=4;cell.textContent='Genera el modelo acústico para revisar sus caras.';return;}
 for(const face of result.faces){const row=rows.insertRow();for(const value of [face.id,face.name,face.area.toFixed(3),face.normal.map(x=>x.toFixed(2)).join(', ')])row.insertCell().textContent=value;row.tabIndex=0;row.onclick=()=>{mode='acoustic';renderResult();selectFace(face);draw();};row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();row.onclick();}};}
}
function seed(){return ['sx','sy','sz'].map(id=>Number($(id).value));}
function bounds(){const points=model?.faces.flatMap(f=>f.outer)||[[0,0,0],[6,4,3]];const lo=[0,1,2].map(k=>points.reduce((v,p)=>Math.min(v,p[k]),Infinity)),hi=[0,1,2].map(k=>points.reduce((v,p)=>Math.max(v,p[k]),-Infinity));return {center:lo.map((v,k)=>(v+hi[k])/2),size:Math.max(...hi.map((v,k)=>v-lo[k]),1)};}
function draw(){
 if(mode==='editor')return;
 const ratio=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;
 if(canvas.width!==w*ratio||canvas.height!==h*ratio){canvas.width=w*ratio;canvas.height=h*ratio;}
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const {center,size}=bounds(),scale=Math.min(w,h)*.68/size*zoom;
 function camera(p){const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2];const u=Math.cos(yaw)*x-Math.sin(yaw)*y,v=Math.sin(yaw)*x+Math.cos(yaw)*y;return [u,Math.sin(pitch)*v-Math.cos(pitch)*z,Math.cos(pitch)*v+Math.sin(pitch)*z];}
 function project(p){const q=camera(p);return [w/2+q[0]*scale,h/2+q[1]*scale,q[2]];}
 // Z-up grid at floor height, independent of hidden surfaces.
 ctx.strokeStyle='#2b4054';ctx.lineWidth=.6;
 const extent=Math.max(8,Math.ceil(size)),step=Math.max(1,Math.ceil(extent/40));
 for(let i=-extent;i<=extent;i+=step){for(const pts of [[[i,-extent,0],[i,extent,0]],[[-extent,i,0],[extent,i,0]]]){ctx.beginPath();pts.forEach((p,j)=>{const q=project(p);j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});ctx.stroke();}}
 const acoustic=mode==='acoustic';let faces=(acoustic?result?.faces:model?.faces)||[];
 // Display-only ceiling cut. Geometry and validation always retain it.
 if($('roof').checked)faces=faces.filter(f=>!(Math.abs(f.normal[2])>.99&&f.centroid[2]>center[2]));
 const projected=faces.map(f=>({f,loops:[f.outer,...f.holes].map(l=>l.map(project)),depth:camera(f.centroid)[2]})).sort((a,b)=>b.depth-a.depth);
 projectedFaces=projected;
 for(const {f,loops} of projected){const selected=selectedFace&&faceKey(f)===faceKey(selectedFace);ctx.beginPath();for(const loop of loops){loop.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}ctx.fillStyle=selected?'rgba(70,240,191,.65)':acoustic?'rgba(94,192,160,.38)':'rgba(112,144,170,.32)';ctx.fill('evenodd');ctx.strokeStyle=selected?'#d4fff1':acoustic?'#81d9b8':'#9db1c3';ctx.lineWidth=acoustic?1.3:.8;ctx.stroke();}
 const s=project(seed());ctx.beginPath();ctx.arc(s[0],s[1],5,0,Math.PI*2);ctx.fillStyle='#ffd08c';ctx.fill();ctx.strokeStyle='#39271a';ctx.stroke();
 ctx.fillStyle='#abc0ce';ctx.font='11px Segoe UI';ctx.fillText('Z ↑ · unidades: metros',18,h-42);
}
async function syncModel(name){
 const data=await editorCall('snapshot',{name:name||'Dibujo del editor'});data.faces=data.faces.map(prepare);data.surfaceOnly=$('surfaceOnly').checked;load(data);return data;
}
$('sync').onclick=()=>action(async()=>{await syncModel();message('Dibujo actualizado. Verifica el punto interior y genera el modelo acústico.');});
$('demo').onclick=()=>action(async()=>{
 const dims=Object.fromEntries(['length','width','height','thickness'].map(id=>[id,Number($(id).value)]));demoFaces(dims);
 const state=await editorCall('ping');if((state.objects||state.sketches)&&!confirm('La sala de prueba reemplazará el dibujo del editor. Descarga antes el dibujo editable si quieres conservarlo. ¿Continuar?'))return;
 const blank=await editorCall('blank');await editorCall('demo',{commands:roomCommands(dims),blank:Array.from(atob(blank.bytes),c=>c.charCodeAt(0))});
 ['sx','sy','sz'].forEach((id,k)=>$(id).value=[dims.length/2,dims.width/2,dims.height/2][k]);
 await syncModel('Sala de prueba · muros con espesor');mode='editor';renderResult();message('Sala creada en el editor. Puedes modificarla o generar su modelo acústico.');
});
$('file').onchange=event=>action(async()=>{
 const file=event.target.files[0];if(!file)return;if(file.size>32*1024*1024)throw Error('Esta versión admite archivos de hasta 32 MB.');
 message('Importando el archivo dentro del editor…');
 if(file.name.toLowerCase().endsWith('.dxf')){
  const data=parseDxf(await file.text(),$('dxfUnits').value||undefined);await editorCall('commands',{commands:data.commands,label:'Importar plano DXF'});model=null;result=null;mode='editor';renderResult();
  const missing=Object.entries(data.unsupported).map(([type,count])=>`${type}: ${count}`).join(', ');
  message(`Plano DXF incorporado: ${data.count} líneas/polilíneas. Es una referencia 2D: dibuja y extruye el recinto antes de extraer caras.${missing?' Entidades no importadas: '+missing:''}`);
 }else{
  const bytes=encodeBytes(new Uint8Array(await file.arrayBuffer()));
  if(file.name.toLowerCase().endsWith('.hew')){
   const state=await editorCall('ping');if((state.objects||state.sketches)&&!confirm('Abrir este dibujo reemplaza el dibujo actual. ¿Continuar?'))return;
   await editorCall('load',{bytes});
  }else await editorCall('import',{name:file.name,bytes,units:$('dxfUnits').value||'m'});
  await syncModel(file.name);const {center}=bounds();['sx','sy','sz'].forEach((id,k)=>$(id).value=center[k].toFixed(3));mode='editor';renderResult();
  message('Modelo importado al editor. Verifica unidades y sitúa el punto dentro del aire de la sala.');
 }
});
$('extract').onclick=()=>action(async()=>{
 message('Leyendo el dibujo actual y comprobando el recinto…');await syncModel(model?.name);result=await compute('extract',{faces:model.faces.map(f=>$('surfaceOnly').checked?{...f,is_solid:false}:f),seed:seed()});mode='acoustic';renderResult();draw();
 message(result.valid?`Envolvente cerrada: ${result.face_count} caras. El dibujo original se conserva. Verifica la selección antes del cálculo.`:result.errors.join(' '),!result.valid);persist();
});
for(const view of ['drawing','architecture','acoustic'])$(view).onclick=()=>{mode=view==='drawing'?'editor':view;renderResult();draw();};
$('roof').onchange=draw;$('fit').onclick=()=>{zoom=1;yaw=-.8;pitch=.55;draw();};
for(const id of ['sx','sy','sz','surfaceOnly'])$(id).oninput=()=>{if(result){result=null;mode='architecture';renderResult();message('Cambió el punto interior. Genera nuevamente el modelo acústico.');}draw();};
$('save').onclick=()=>action(async()=>{await syncModel(model?.name);download(new Blob([JSON.stringify({format:'revera',version:2,model,faceProperties,seed:seed()},null,2)],{type:'application/json'}),'proyecto.revera');persist();message('Proyecto descargado con el dibujo actual del editor.');});
async function restoreProject(data){
 if(data.format!=='revera'||![1,2].includes(data.version)||!Array.isArray(data.model?.faces)||!Array.isArray(data.seed)||data.seed.length!==3)throw Error('Proyecto REVERA inválido.');
 if(data.model.faces.length>5000)throw Error('El proyecto supera el límite de 5.000 caras.');
 const checked=await compute('validate',{faces:data.model.faces,seed:data.seed});
 if(data.model.editor_bytes){const state=await editorCall('ping');if((state.objects||state.sketches)&&!confirm('Recuperar el proyecto reemplaza el dibujo actual. ¿Continuar?'))return;await editorCall('load',{bytes:data.model.editor_bytes});}
 faceProperties=data.faceProperties&&typeof data.faceProperties==='object'?data.faceProperties:{};$('surfaceOnly').checked=!!data.model.surfaceOnly;load({...data.model,faces:checked.faces});['sx','sy','sz'].forEach((id,k)=>$(id).value=data.seed[k]);renderResult();draw();message(data.model.editor_bytes?'Proyecto y dibujo recuperados. Genera la envolvente para validar nuevamente.':'Proyecto del prototipo anterior: geometría recuperada para consulta; importa el dibujo editable original para seguir dibujando.');
}
$('project').onchange=event=>action(async()=>{const file=event.target.files[0];if(file.size>48*1024*1024)throw Error('Proyecto demasiado grande.');await restoreProject(JSON.parse(await file.text()));});
$('saveHew').onclick=()=>action(async()=>{const {bytes}=await editorCall('save');download(new Blob([Uint8Array.from(atob(bytes),c=>c.charCodeAt(0))],{type:'application/octet-stream'}),'modelo.hew');message('Dibujo editable descargado.');});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function persist(){try{localStorage.setItem('revera-project-v2',JSON.stringify({format:'revera',version:2,model,faceProperties,seed:seed()}));$('localStatus').textContent='Última extracción guardada en este navegador';}catch{$('localStatus').textContent='Descarga el proyecto para conservarlo: espacio local insuficiente';}}
$('restoreLocal').onclick=()=>action(async()=>{const data=localStorage.getItem('revera-project-v2');if(!data)throw Error('Todavía no hay un proyecto guardado en este navegador.');await restoreProject(JSON.parse(data));});
canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.008;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-drag.y)*.008));drag={...drag,x:e.clientX,y:e.clientY,moved:drag.moved||Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5};draw();};
canvas.onpointerup=e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let found=null;for(const {f,loops} of projectedFaces){const path=new Path2D();for(const loop of loops){loop.forEach((p,i)=>i?path.lineTo(...p.slice(0,2)):path.moveTo(...p.slice(0,2)));path.closePath();}if(ctx.isPointInPath(path,x*(devicePixelRatio||1),y*(devicePixelRatio||1),'evenodd'))found=f;}selectFace(found);draw();}drag=null;};canvas.onpointercancel=()=>drag=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.2,Math.min(5,zoom*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
new ResizeObserver(draw).observe(canvas);
window.addEventListener('revera-editor-ready',async event=>{
 if(!editorReady){editorReady=true;$('status').textContent='Editor 3D conectado · procesamiento en tu navegador';$('extract').disabled=false;$('save').disabled=false;}
 const hash=event.detail?.hash;if(eraseSelection&&!busy&&hash&&lastEditorHash&&hash!==lastEditorHash){setEraseState(false);editorCall('erase-mode',{enabled:false}).catch(()=>{});}if(faceEditHash&&hash&&hash!==faceEditHash){setFaceUndo(false);faceEditHash=null;}if(hash&&lastEditorHash&&hash!==lastEditorHash){clearFace();if(faceSelection){faceSelection=false;$('faceMode').setAttribute('aria-pressed','false');editorCall('face-mode',{enabled:false}).catch(()=>{});message('Cambió la geometría. Activa de nuevo Propiedades de cara para actualizar las superficies.');}}if(hash&&lastEditorHash&&hash!==lastEditorHash&&result){result=null;mode=mode==='acoustic'?'editor':mode;renderResult();message('Cambió el dibujo. Genera nuevamente el modelo acústico para actualizar sus resultados.');}
 if(hash)lastEditorHash=hash;
});
try{if(localStorage.getItem('revera-project-v2'))$('localStatus').textContent='Hay un proyecto anterior disponible para recuperar';}catch{}
renderResult();message('Dibuja con el editor, importa un archivo o crea una sala de prueba. Después genera su envolvente acústica.');

// Drawing-first workspace: layout controls never reload the editor iframe.
const panelToggle=$('panelToggle'),focusToggle=$('focusToggle');
function setPanelHidden(hidden){document.body.classList.toggle('panel-hidden',hidden);panelToggle.setAttribute('aria-expanded',String(!hidden));panelToggle.title=hidden?'Mostrar panel del proyecto':'Ocultar panel del proyecto';}
setPanelHidden(true);
panelToggle.onclick=()=>{if(document.body.classList.contains('focus-mode')){setFocus(false);setPanelHidden(false);return;}setPanelHidden(!document.body.classList.contains('panel-hidden'));};
function setFocus(on){document.body.classList.toggle('focus-mode',on);focusToggle.setAttribute('aria-pressed',String(on));focusToggle.textContent=on?'Restaurar vista':'Ampliar vista';panelToggle.setAttribute('aria-expanded',String(!on&&!document.body.classList.contains('panel-hidden')));requestAnimationFrame(draw);}
focusToggle.onclick=()=>setFocus(!document.body.classList.contains('focus-mode'));
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('focus-mode'))setFocus(false);});
function setResults(open){$('resultsPanel').hidden=!open;$('resultsToggle').setAttribute('aria-expanded',String(open));$('resultsToggle').textContent=open?'Ocultar superficies ↓':'Ver superficies ↑';}
$('resultsToggle').onclick=()=>setResults($('resultsPanel').hidden);
$('resultsClose').onclick=()=>setResults(false);

function clearFace(){selectedFace=null;$('facePanel').hidden=true;}
function selectFace(face){selectedFace=face;$('facePanel').hidden=!face;if(!face)return;const data=faceProperties[faceKey(face)]||{};$('faceGeometry').textContent=`${face.id} · ${face.area.toFixed(3)} m² · Normal: ${face.normal.map(v=>v.toFixed(2)).join(', ')}`;$('faceName').value=data.name||face.name||face.id;$('faceMaterial').value=data.material||'';bands.forEach((band,i)=>$('alpha'+band).value=data.alpha?.[i]??'');for(const row of $('faces').rows)row.setAttribute('aria-selected',String(row.cells[0]?.textContent===face.id));}
for(const band of bands){const label=document.createElement('label');label.textContent=band+' Hz';const input=document.createElement('input');input.id='alpha'+band;input.type='number';input.min=0;input.max=1;input.step=.01;input.placeholder='—';input.required=true;label.append(input);$('absorptionInputs').append(label);}
$('faceClose').onclick=()=>{clearFace();draw();if(faceSelection)editorCall('face-mode',{enabled:true,faces:model?.faces||[]}).catch(()=>{});};
$('faceForm').onsubmit=e=>{e.preventDefault();if(!selectedFace)return;try{const alpha=absorption(bands.map(b=>Number($('alpha'+b).value)));faceProperties[faceKey(selectedFace)]={name:$('faceName').value.trim(),material:$('faceMaterial').value.trim(),alpha};persist();message('Propiedades guardadas para esta cara. Descarga el proyecto REVERA para conservarlas con el dibujo.');}catch(error){message(error.message,true);}};
$('faceMode').onclick=()=>action(async()=>{if(eraseSelection){await editorCall('erase-mode',{enabled:false});setEraseState(false);}if(faceSelection){await editorCall('face-mode',{enabled:false});faceSelection=false;}else{message('Preparando selección de superficies…');const data=await syncModel(model?.name);await editorCall('face-mode',{enabled:true,faces:data.faces});faceSelection=true;mode='editor';renderResult();message('Haz clic en una cara para consultar su área y editar sus propiedades acústicas. Usa Borrar caras para modificar el dibujo.');}clearFace();$('faceMode').setAttribute('aria-pressed',String(faceSelection));});
window.addEventListener('revera-face',e=>selectFace(e.detail));
window.addEventListener('revera-face-stale',()=>{clearFace();message('Cambió el dibujo. Desactiva y vuelve a activar Propiedades de cara para actualizarlo.',true);});

window.addEventListener('revera-face-mode',()=>{setEraseState(false);faceSelection=false;clearFace();$('faceMode').setAttribute('aria-pressed','false');message('Herramienta de dibujo activa. Puedes dibujar normalmente; vuelve a Propiedades de cara para editar propiedades acústicas.');});

// Compact project rail: panels overlay the drawing instead of shrinking it.
const railButtons=[...document.querySelectorAll('[data-project]')],projectGroups=[...$('projectPanel').querySelectorAll(':scope > details.control-group')];
let activeProject=0;
const projectTitles=['Importar modelo','Sala de prueba','Modelo acústico','Guardar y recuperar'];
function showProject(index){const alreadyOpen=!document.body.classList.contains('panel-hidden')&&activeProject===index;if(document.body.classList.contains('focus-mode'))setFocus(false);activeProject=index;projectGroups.forEach((group,i)=>{group.hidden=i!==index;group.open=i===index;});$('projectPanel').querySelector('h1').textContent=projectTitles[index];setPanelHidden(alreadyOpen);}
railButtons.forEach(button=>button.onclick=()=>showProject(Number(button.dataset.project)));
const panelState=new MutationObserver(()=>{const open=!document.body.classList.contains('panel-hidden')&&!document.body.classList.contains('focus-mode');railButtons.forEach((button,i)=>button.setAttribute('aria-expanded',String(open&&i===activeProject)));});
panelState.observe(document.body,{attributes:true,attributeFilter:['class']});
$('panelClose').onclick=()=>{setPanelHidden(true);railButtons[activeProject].focus();};
panelToggle.onclick=()=>showProject(activeProject);
canvas.addEventListener('pointerdown',()=>setPanelHidden(true));
window.addEventListener('blur',()=>{if(document.activeElement===$('editor'))setPanelHidden(true);});
window.addEventListener('revera-drawing-interaction',()=>setPanelHidden(true));
window.addEventListener('keydown',e=>{if(e.key==='Escape')setPanelHidden(true);});


let faceEditHash=null;
function setFaceUndo(enabled){$('undoFaceToolbar').disabled=!enabled;}
function setEraseState(enabled){eraseSelection=enabled;$('eraseFaces').setAttribute('aria-pressed',String(enabled));}
async function armEraser(){
 const data=await syncModel(model?.name);await editorCall('erase-mode',{enabled:true,faces:data.faces});setEraseState(true);faceSelection=false;$('faceMode').setAttribute('aria-pressed','false');clearFace();mode='editor';renderResult();
}
$('eraseFaces').onclick=()=>action(async()=>{if(eraseSelection){await editorCall('erase-mode',{enabled:false});setEraseState(false);message('Borrador desactivado. Puedes seguir dibujando.');}else{await armEraser();message('Borrar caras: haz clic sobre una superficie del dibujo. Elige Línea, Rectángulo u otra herramienta para volver a dibujar.');}});
function deleteDrawingFace(face){return action(async()=>{
 const continueErasing=eraseSelection;
 const reply=await editorCall('delete-face',{face});faceSelection=false;$('faceMode').setAttribute('aria-pressed','false');clearFace();result=null;model=null;mode='editor';renderResult();
 const state=await editorCall('ping');faceEditHash=state.hash;lastEditorHash=state.hash||lastEditorHash;setFaceUndo(true);
 if(continueErasing&&state.objects){await armEraser();}else setEraseState(false);
 message(reply.opened?'Cara borrada. El objeto queda abierto. Puedes borrar otra cara o elegir una herramienta de dibujo.':'Última cara borrada. Puedes recuperarla con Deshacer borrado.');
});}
const undoDeletedFace=()=>action(async()=>{await editorCall('undo-face',{hash:faceEditHash});setFaceUndo(false);faceEditHash=null;setEraseState(false);faceSelection=false;$('faceMode').setAttribute('aria-pressed','false');clearFace();model=null;result=null;mode='editor';renderResult();message('Borrado deshecho. La cara original está recuperada.');});
$('undoFaceToolbar').onclick=undoDeletedFace;
window.addEventListener('revera-erase-face',e=>{if(!busy&&eraseSelection&&e.detail)deleteDrawingFace(e.detail);});

window.addEventListener('revera-erase-toggle',()=>{if(!busy)$('eraseFaces').click();});
