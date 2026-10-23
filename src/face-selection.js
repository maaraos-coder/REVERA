import {prepare,hit} from './geometry.js';
export const bands=[125,250,500,1000,2000,4000];
export function faceKey(face){return [face.outer,...(face.holes||[])].map(loop=>loop.map(p=>p.map(v=>Math.round(v*1e6)).join(',')).sort().join(';')).sort().join('|');}
export function pickFace(faces,origin,direction){let best=null,distance=Infinity;for(const raw of faces){const f=raw.normal?raw:prepare(raw),t=hit(origin,direction,f);if(t!==null&&t<distance){distance=t;best=f;}}return best;}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
export function cameraRay(c,x,y,width,height){const forward=unit(sub(c.target,c.eye)),right=unit(cross(forward,c.up)),up=cross(right,forward),nx=2*x/width-1,ny=1-2*y/height,parallel=c.projection==='parallel',h=parallel?c.parallelHeight:2*Math.tan(c.fovDeg*Math.PI/360),offset=right.map((v,i)=>v*nx*h*width/height/2+up[i]*ny*h/2);return {origin:parallel?c.eye.map((v,i)=>v+offset[i]):c.eye,direction:parallel?forward:unit(forward.map((v,i)=>v+offset[i]))};}
export function absorption(values){if(values.length!==6||values.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Cada coeficiente de absorción debe estar entre 0 y 1.');return values;}
