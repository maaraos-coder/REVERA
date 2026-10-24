# SPDX-License-Identifier: GPL-3.0-or-later
"""REVERA -> I-Simpa 1.3.4 SPPS files. GPL-3.0-or-later.
Binary layouts follow upstream bin.cpp and mbin.cpp; no native source copied.
Only closed convex rooms with convex planar faces and no holes are supported.
"""
import itertools, json, math, struct
from pathlib import Path
from xml.etree import ElementTree as ET
BANDS=[125,250,500,1000,2000,4000]
def sub(a,b): return [x-y for x,y in zip(a,b)]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def mean(points): return [sum(p[k] for p in points)/len(points) for k in range(3)]
def finite(values,n): return isinstance(values,list) and len(values)==n and all(isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) for x in values)
def prepare(job):
 if job.get('format')!='revera-simulation-job' or job.get('version')!=1 or job.get('bands')!=BANDS: raise ValueError('Formato de simulación no compatible.')
 faces=job.get('room',{}).get('faces',[])
 if not isinstance(faces,list) or not 4<=len(faces)<=256: raise ValueError('Número de caras no válido.')
 nodes=[];lookup={};triangles=[];normals=[]
 if sum(len(f.get('outer',[])) for f in faces)>4096: raise ValueError('El adaptador admite hasta 4096 vértices de contorno.')
 def vertex(p):
  if not finite(p,3) or max(map(abs,p))>1e6: raise ValueError('Coordenadas no válidas.')
  key=tuple(p)
  if key not in lookup: lookup[key]=len(nodes);nodes.append(list(p))
  return lookup[key]
 for index,face in enumerate(faces):
  outer=face.get('outer',[])
  if not isinstance(outer,list) or not 3<=len(outer)<=64 or face.get('holes'): raise ValueError('Se requieren caras sin huecos, con 3–64 vértices.')
  ids=[vertex(p) for p in outer]
  if len(set(ids))!=len(ids): raise ValueError('Vértices repetidos.')
  n=cross(sub(outer[1],outer[0]),sub(outer[2],outer[0]));length=math.sqrt(dot(n,n))
  if length<1e-10: raise ValueError('Cara degenerada o vértices iniciales colineales.')
  n=[x/length for x in n];normals.append(n)
  if any(abs(dot(n,sub(p,outer[0])))>1e-5 for p in outer): raise ValueError('Cara no plana.')
  # Every edge must bound the polygon in the same direction: rejects concave loops.
  for a,b in zip(outer,outer[1:]+outer[:1]):
   if any(dot(cross(sub(b,a),sub(p,a)),n)<-1e-7 for p in outer): raise ValueError('La cara no es convexa.')
  alpha=face.get('alpha')
  if not finite(alpha,6) or any(not 0<=x<=1 for x in alpha): raise ValueError('Absorción no válida.')
  fc=vertex(mean(outer))
  for a,b in zip(ids,ids[1:]+ids[:1]): triangles.append((a,b,fc,index))
 center=mean(nodes)
 if any(dot(n,sub(p,f['outer'][0]))< -1e-5 for f,n in zip(faces,normals) for p in nodes): raise ValueError('El recinto debe ser convexo y todas las caras mirar hacia dentro.')
 if any(dot(n,sub(center,f['outer'][0]))<=1e-5 for f,n in zip(faces,normals)): raise ValueError('El recinto no tiene interior positivo.')
 for kind in ['sources','receivers']:
  items=job.get(kind,[])
  if not isinstance(items,list) or not 1<=len(items)<=100: raise ValueError('Se requieren 1–100 fuentes y receptores.')
  for item in items:
   pos=item.get('position')
   if not finite(pos,3) or any(dot(n,sub(pos,f['outer'][0]))<=1e-5 for f,n in zip(faces,normals)): raise ValueError('Fuente o receptor fuera del recinto.')
   if kind=='sources' and (not finite(item.get('power'),6) or any(not -100<=x<=200 for x in item['power'])): raise ValueError('Lw no válido.')
 for s in job['sources']:
  for r in job['receivers']:
   if math.dist(s['position'],r['position'])<1e-4: raise ValueError('Fuente y receptor coincidentes.')
 c=vertex(center);tetra=[];shared={};total_volume=0
 for ti,(a,b,d,material) in enumerate(triangles):
  verts=[a,b,d,c];tf=[]
  volume=abs(dot(sub(nodes[b],nodes[a]),cross(sub(nodes[d],nodes[a]),sub(center,nodes[a]))))/6
  if volume<1e-12: raise ValueError('Tetraedro degenerado.')
  total_volume+=volume
  for opposite in range(4):
   ids=[verts[k] for k in range(4) if k!=opposite]
   # Native tetrahedron normals point inward (localization uses (a-point)·normal <= 0).
   if dot(cross(sub(nodes[ids[1]],nodes[ids[0]]),sub(nodes[ids[2]],nodes[ids[0]])),sub(nodes[verts[opposite]],nodes[ids[0]]))<0: ids[1],ids[2]=ids[2],ids[1]
   record=[*ids,ti if opposite==3 else -1,-2];tf.append(record)
   key=tuple(sorted(ids));shared.setdefault(key,[]).append((ti,len(tf)-1))
  tetra.append((verts,tf))
 for key,uses in shared.items():
  if len(uses)==2:
   (ta,fa),(tb,fb)=uses
   if tetra[ta][1][fa][3]>=0 or tetra[tb][1][fb][3]>=0: raise ValueError('Superficie duplicada.')
   tetra[ta][1][fa][4]=tb;tetra[tb][1][fb][4]=ta
  elif len(uses)!=1 or tetra[uses[0][0]][1][uses[0][1]][3]<0: raise ValueError('Malla abierta o aristas no conformes.')
 expected=job['room'].get('volume')
 if not isinstance(expected,(int,float)) or not math.isfinite(expected) or not math.isclose(total_volume,expected,rel_tol=1e-5,abs_tol=1e-6): raise ValueError('El volumen del mallado no coincide con el recinto.')
 return nodes,triangles,tetra,total_volume

def write_native(job,directory,*,particles=20000,duration=1.0,timestep=.002,radius=.1):
 if not 100<=particles<=1000000 or not .01<=duration<=10 or not .0001<=timestep<=.01 or not .01<=radius<=1: raise ValueError('Parámetros de cálculo fuera de rango.')
 nodes,triangles,tetra,volume=prepare(job)
 for item in job['receivers']:
  for face in job['room']['faces']:
   a,b,c=face['outer'][:3];n=cross(sub(b,a),sub(c,a));distance=dot(n,sub(item['position'],a))/math.sqrt(dot(n,n))
   if distance<radius: raise ValueError('El receptor debe estar al menos a '+str(radius)+' m de todas las caras.')
  if any(math.dist(item['position'],source['position'])<=radius for source in job['sources']): raise ValueError('La esfera del receptor no debe contener una fuente.')
 origin=mean(nodes);nodes=[sub(p,origin) for p in nodes];directory=Path(directory).resolve();directory.mkdir(parents=True,exist_ok=True)
 # 1.0 CBIN: two linked 12-byte node headers, float32 vertices and 24-byte triangles.
 vb=struct.pack('<I',len(nodes))+b''.join(struct.pack('<3f',*p) for p in nodes)
 cbin=struct.pack('<II',1,0)+struct.pack('<HHII',0,0,0,8+12+len(vb))+vb
 cbin+=struct.pack('<HHII',1,0,0,0)+bytes(256)+struct.pack('<I',len(triangles))
 cbin+=b''.join(struct.pack('<4I2i',a,b,c,m,-1,-1) for a,b,c,m in triangles)
 (directory/'mesh.cbin').write_bytes(cbin)
 mbin=struct.pack('<II',len(tetra),len(nodes))+b''.join(struct.pack('<3f',*p) for p in nodes)
 for vertices,faces in tetra: mbin+=struct.pack('<5i',*vertices,0)+b''.join(struct.pack('<5i',*f) for f in faces)
 (directory/'tetramesh.mbin').write_bytes(mbin)
 root=ET.Element('configuration',workingdirectory=str(directory)+'/')
 sim=ET.SubElement(root,'simulation',recepteurss_directory='surface/',recepteurss_filename='surface.csbin',recepteurss_cut_filename='cut.csbin',receiversp_directory='receivers',receiversp_filename='Sound level.recp',receiversp_filename_adv='Advanced.gap',cumul_filename='Total.recp',modelName='mesh.cbin',tetrameshFileName='tetramesh.mbin',abs_atmo_calc='0',enc_calc='0',trans_calc='0',direct_calc='0',duree_simulation=str(duration),output_recp_bysource='1',output_recs_byfreq='0',surf_receiv_method='0',random_seed='12345',computation_method='1',nbparticules=str(particles),nbparticules_rendu='0',pasdetemps=str(timestep),rayon_recepteurp=str(radius),trans_epsilon='5',intensity_filename='Intensity.rpi',intensity_folder='intensity',intensity_rp_filename='intensity.gabe',stats_filename='stats.gabe',particules_directory='particles/',particules_filename='particles.pbin',directivities_directory='',save_surface_intersection='0',save_receivers_intersection='0')
 freq=ET.SubElement(sim,'freq_enum')
 for band in BANDS: ET.SubElement(freq,'bfreq',freq=str(band),docalc='1')
 ET.SubElement(root,'condition_atmospherique',absatmo='0',disable_absatmo_computation='1',humidite='50',pression='101325',alog='0',blin='0',lst_soltype='1',z0='0.02',temperature='20')
 mats=ET.SubElement(root,'surface_absorption_enum')
 for i,face in enumerate(job['room']['faces']):
  mat=ET.SubElement(mats,'type_surface',id=str(i),resistivite='100',side_material='0')
  for band,alpha in zip(BANDS,face['alpha']): ET.SubElement(mat,'bfreq',freq=str(band),absorb=str(alpha),diffusion='0',loi='0')
 sources=ET.SubElement(root,'sources')
 for i,item in enumerate(job['sources']):
  src=ET.SubElement(sources,'source',id=str(i),name=f'F{i+1:03d}',x=str(item['position'][0]-origin[0]),y=str(item['position'][1]-origin[1]),z=str(item['position'][2]-origin[2]),directivite='0',delay='0')
  for band,power in zip(BANDS,item['power']): ET.SubElement(src,'bfreq',freq=str(band),db=str(power))
 receivers=ET.SubElement(root,'recepteursp')
 for i,item in enumerate(job['receivers']):
  rec=ET.SubElement(receivers,'recepteur_ponctuel',id=str(i),name=f'R{i+1:03d}',lbl=f'R{i+1:03d}',x=str(item['position'][0]-origin[0]),y=str(item['position'][1]-origin[1]),z=str(item['position'][2]-origin[2]),u='1',v='0',w='0')
  for band in BANDS: ET.SubElement(rec,'bfreq',freq=str(band),db='-200')
 ET.SubElement(root,'recepteurss');ET.SubElement(root,'encombrement_enum')
 ET.ElementTree(root).write(directory/'config.xml',encoding='utf-8',xml_declaration=True)
 manifest={'engine':'I-Simpa SPPS 2.2.1','volume':volume,'coordinateOrigin':origin,'tetrahedra':len(tetra),'triangles':len(triangles),'reflection':'specular','diffusion':0,'atmosphericAbsorption':False,'sources':job['sources'],'receivers':job['receivers'],'provisionalFaces':sum(bool(f.get('provisional')) for f in job['room']['faces'])}
 (directory/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 return manifest
