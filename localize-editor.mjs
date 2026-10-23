// Translate presentation labels only. Command identifiers and file names stay intact.
export function localizeLabels(source,messages){
 for(const [english,spanish] of Object.entries(messages)){
  for(const quote of ['`','"'])source=source.replaceAll('label:'+quote+english+quote,'label:'+quote+spanish+quote);
 }
 source=source.replaceAll('makeSolid:`Make Solid…`','makeSolid:`Convertir en sólido…`').replaceAll('modelHealthItem:`Model Health…`','modelHealthItem:`Revisar geometría…`');
 for(const [english,spanish] of [['Untitled','Sin título'],['Undo','Deshacer'],['Redo','Rehacer']])source=source.replaceAll('`'+english+'`','`'+spanish+'`');
 // Observe the actual active tool: rail, dock, keyboard and menu all reach it.
 const paletteAnchor='[xn]),[jn,Mn]=(0,d.useState)([])';
 if(source.includes('case`tool-paint`')&&source.split(paletteAnchor).length!==2)throw Error('Cambió la integración de materiales del editor.');
 source=source.replace(paletteAnchor,'[xn]),_reveraPaint=(0,d.useEffect)(()=>{if(E===`Paint`){Dn(()=>we(true),`Materials`);Se(false);Ee(false);Oe(false);Ae(false);Me(false);Je(false);P([])}},[E,Dn]),_reveraSelection=(0,d.useEffect)(()=>{window.reveraClearSelection=()=>P([]);window.reveraActivateTool=name=>A(name);return()=>{delete window.reveraClearSelection;delete window.reveraActivateTool}},[]),[jn,Mn]=(0,d.useState)([])');
 // The upstream dock resolves icons by its English label. Keep that lookup
 // independent of translated display text (the command id never changes).
 source=source.replace('var zB=[{id:`tool-rectangle`','var zB=[{id:`revera-erase-face`,label:`Borrar caras`},{id:`tool-rectangle`');
 source=source.replaceAll('{id:`edit-delete`,label:`Erase`}','{id:`revera-erase-face`,label:`Borrar caras`},{id:`edit-delete`,label:`Borrar selección`}');
 const toolNames=Object.fromEntries(Object.entries(messages).map(([en,es])=>[es,en]));
 source=source.replace('lP[e.label]??JB[e.id]','lP[('+JSON.stringify(toolNames)+')[e.label]??e.label]??JB[e.id===`revera-erase-face`?`edit-delete`:e.id]');
 const titleAnchor='(0,Q.jsx)(`span`,{style:{fontSize:`var(--font-size-titlebar-filename, 13px)`';
 source=source.replace(titleAnchor,'(0,Q.jsx)(`span`,{className:`revera-document-name`,style:{fontSize:`var(--font-size-titlebar-filename, 13px)`');
 return source;
}
