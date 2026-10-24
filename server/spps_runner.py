# SPDX-License-Identifier: GPL-3.0-or-later
import os,subprocess,tempfile
from pathlib import Path
from .spps_adapter import write_native
from .spps_results import receiver_result
PIN='a0d4d4330d8c9894d31ce80e0fd3a9a1d4b872cb'
def run_job(job,binary=None,*,particles=20000,duration=1.0,timestep=.002,radius=.2,timeout=90):
 binary=Path(binary or os.environ.get('SPPS_BINARY','/opt/spps/native/spps/spps')).resolve()
 if not binary.is_file(): raise RuntimeError('El ejecutable SPPS no está instalado en el servidor.')
 if len(job.get('sources',[]))>8 or len(job.get('receivers',[]))>32: raise ValueError('Esta versión admite hasta 8 fuentes y 32 receptores por cálculo.')
 with tempfile.TemporaryDirectory(prefix='revera-spps-') as temp:
  manifest=write_native(job,temp,particles=particles,duration=duration,timestep=timestep,radius=radius)
  # A shell is never involved; all input and output paths belong to this temporary job.
  with open(Path(temp)/'engine.log','w+') as log:
   result=subprocess.run([str(binary),str(Path(temp)/'config.xml')],cwd=temp,stdout=log,stderr=subprocess.STDOUT,timeout=timeout,check=False)
   log.seek(0);output=log.read()
  if result.returncode or 'particles has been in error' in output: raise RuntimeError('SPPS terminó con errores de propagación. Revisa la geometría.')
  receivers=[receiver_result(Path(temp)/'receivers'/f'R{i+1:03d}'/'Sound level.recp',item,timestep,job['bands']) for i,item in enumerate(job['receivers'])]
  for i,receiver in enumerate(receivers):
   receiver['bySource']=[{**receiver_result(Path(temp)/'receivers'/f'R{i+1:03d}'/f'F{k+1:03d}'/'Sound level.recp',job['receivers'][i],timestep,job['bands']),'sourceId':source['id'],'sourceName':source['name']} for k,source in enumerate(job['sources'])]
  return {'format':'revera-spps-results','version':1,'engine':'SPPS 2.2.1 nativo · I-Simpa 1.3.4','upstreamCommit':PIN,'status':'calculated','bands':job['bands'],'settings':{'particlesPerSourcePerBand':particles,'duration':duration,'timeStep':timestep,'receiverRadius':radius,'reflection':'specular','diffusion':0,'atmosphericAbsorption':False},'mesh':{'volume':manifest['volume'],'tetrahedra':manifest['tetrahedra'],'triangles':manifest['triangles']},'provisionalFaces':manifest['provisionalFaces'],'receivers':receivers,'notes':['Estimación por partículas con semilla fija. Revisa convergencia al aumentar partículas.','SPL integrado hasta la duración simulada; no ponderado A.','Reflexión especular; difusión cero y absorción atmosférica desactivada.']}
