/* REVERA adaptation of I-Simpa v1.3.4 TCR global equations.
 * Original: IFSTTAR / I-Simpa contributors, GPL-3.0-or-later.
 * Adapted by AkuZoft, 2026. See /source/isimpa-tcr-NOTICE.md.
 * Get_A_Sabine, Get_A_Eyring, Get_TR_. The upstream coefficient is 0.163.
 * Geometry validation is supplied by REVERA; no spatial propagation here.
 */
import {acousticSummary} from './acoustic-summary.js';
export function calculateTcr(room,properties){
 const summary=acousticSummary(room,properties);
 if(!summary||!(room.volume_m3>0)||!(room.surface_m2>0))throw Error('TCR requiere un recinto cerrado y validado con volumen positivo.');
 if(!summary.complete)throw Error('Asigna coeficientes α válidos a todas las caras antes de calcular TCR.');
 const volume=room.volume_m3,surface=room.surface_m2;
 const bands=summary.bands.map((frequency,i)=>{const aSabine=summary.equivalent[i],mean=aSabine/surface;if(mean<0||mean>1+1e-10)throw Error('Absorción media fuera del intervalo 0–1.');const aEyring=mean>=1?Infinity:-surface*Math.log1p(-mean);return {frequency,meanAlpha:mean,aSabine,aEyring,trSabine:aSabine===0?Infinity:.163*volume/aSabine,trEyring:aEyring===0?Infinity:.163*volume/aEyring};});
 return {engine:'TCR global · adaptación I-Simpa 1.3.4',upstreamCommit:'a0d4d4330d8c9894d31ce80e0fd3a9a1d4b872cb',volume,surface,atmosphericAbsorption:false,provisionalFaces:summary.provisionalCount,bands};
}
