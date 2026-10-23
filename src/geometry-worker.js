import {extract,validate,prepare} from './geometry.js';
self.onmessage=({data})=>{try{const result=data.method==='extract'?extract(data.faces,data.seed):{...validate(data.faces.map(prepare),data.seed),faces:data.faces.map(prepare)};self.postMessage({id:data.id,result});}catch(e){self.postMessage({id:data.id,error:e.message});}};
