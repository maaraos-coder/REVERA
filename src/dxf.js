// ASCII DXF reference-plan reader. Unsupported entities are reported, never
// silently advertised as imported. DWG is not supported.
export function parseDxf(text,unitOverride){
 if(text.startsWith('AutoCAD Binary DXF'))throw Error('DXF binario no admitido. Exporta como DXF ASCII.');
 const lines=text.replace(/\r/g,'').split('\n'),pairs=[];
 for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim());if(!Number.isInteger(code))throw Error('DXF inválido: código de grupo no numérico.');pairs.push([code,lines[i+1].trim()]);}
 let units=0;for(let i=0;i<pairs.length-1;i++)if(pairs[i][0]===9&&pairs[i][1]==='$INSUNITS')units=Number(pairs[i+1][1]);
 const scales={1:.0254,2:.3048,4:.001,5:.01,6:1},scale=unitOverride?{m:1,cm:.01,mm:.001,in:.0254}[unitOverride]:scales[units];
 if(!scale)throw Error('El DXF no declara unidades compatibles. Selecciona metros, centímetros o milímetros antes de importarlo.');
 const entities=[];let inside=false,current=null;
 for(let i=0;i<pairs.length;i++){const[c,v]=pairs[i];if(c===0&&v==='SECTION'&&pairs[i+1]?.[1]==='ENTITIES'){inside=true;i++;continue;}if(inside&&c===0&&v==='ENDSEC'){if(current)entities.push(current);current=null;inside=false;}else if(inside&&c===0){if(current)entities.push(current);current={type:v,values:[]};}else if(inside&&current)current.values.push([c,v]);}
 const commands=[],unsupported=new Map();
 const number=(e,c,def=0)=>Number(e.values.find(p=>p[0]===c)?.[1]??def);
 for(const e of entities){
  let points;
  if(e.type==='LINE')points=[[10,20,30],[11,21,31]].map(codes=>codes.map(c=>number(e,c)*scale));
  else if(e.type==='LWPOLYLINE'){
   points=[];let p;
   for(const[c,v]of e.values){if(c===10){p=[Number(v)*scale,0,number(e,38)*scale];points.push(p);}if(c===20&&p)p[1]=Number(v)*scale;}
   if(e.values.some(([c,v])=>c===42&&Number(v)!==0)){unsupported.set('LWPOLYLINE con arco',(unsupported.get('LWPOLYLINE con arco')||0)+1);continue;}
   if(number(e,70)&1&&points.length)points.push([...points[0]]);
  }else{unsupported.set(e.type,(unsupported.get(e.type)||0)+1);continue;}
  if(points.length<2||points.flat().some(x=>!Number.isFinite(x)))throw Error('El DXF contiene coordenadas inválidas.');
  if(points.some(p=>Math.abs(p[2]-points[0][2])>1e-6)){unsupported.set('Línea no horizontal',(unsupported.get('Línea no horizontal')||0)+1);continue;}
  commands.push({method:'hew.sketch.draw_line',params:{plane:{origin:[0,0,points[0][2]],normal:[0,0,1]},points}});
 }
 if(commands.length>1500)throw Error('Simplifica el DXF a un máximo de 1.500 líneas o polilíneas.');
 if(!commands.length)throw Error('No se encontraron LINE o LWPOLYLINE rectas utilizables en ENTITIES.');
 return {commands,scale,unsupported:Object.fromEntries(unsupported),count:commands.length};
}
