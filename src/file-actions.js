// One command vocabulary shared by the host and the embedded drawing editor.
export const fileActions=new Set(['new','open','import','save','save-drawing','recover','import-options','export-drawing','print']);
export function fileShortcut(event){
 if(event.repeat||event.altKey||!(event.ctrlKey||event.metaKey))return null;
 const key=event.key.toLowerCase();
 if(key==='o')return event.shiftKey?'import':'open';
 if(key==='s')return 'save';
 if(key==='n')return 'new';
 return null;
}
