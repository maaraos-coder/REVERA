// Translate presentation labels only. Command identifiers and file names stay intact.
export function localizeLabels(source,messages){
 for(const [english,spanish] of Object.entries(messages)){
  for(const quote of ['`','"'])source=source.replaceAll('label:'+quote+english+quote,'label:'+quote+spanish+quote);
 }
 source=source.replaceAll('makeSolid:`Make Solid…`','makeSolid:`Convertir en sólido…`').replaceAll('modelHealthItem:`Model Health…`','modelHealthItem:`Revisar geometría…`');
 for(const [english,spanish] of [['Untitled','Sin título'],['Undo','Deshacer'],['Redo','Rehacer']])source=source.replaceAll('`'+english+'`','`'+spanish+'`');
 return source;
}
