# SPDX-License-Identifier: GPL-3.0-or-later
"""Small HTTP adapter for the native SPPS core. Start: python -m server.api"""
import json,os,threading,subprocess
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from .spps_runner import run_job
LOCK=threading.BoundedSemaphore(1)
class Handler(BaseHTTPRequestHandler):
 def origin(self):
  value=self.headers.get('Origin');allowed=os.environ.get('ALLOWED_ORIGINS','http://localhost:4173,http://127.0.0.1:4173').split(',')
  return value if value in allowed else None
 def send_json(self,status,payload):
  data=json.dumps(payload,ensure_ascii=False,allow_nan=False).encode();self.send_response(status)
  if self.origin(): self.send_header('Access-Control-Allow-Origin',self.origin());self.send_header('Vary','Origin')
  self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def do_OPTIONS(self):
  if not self.origin(): return self.send_json(403,{'error':'Origen no permitido.'})
  self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.origin());self.send_header('Access-Control-Allow-Methods','POST, GET, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type, Authorization');self.send_header('Vary','Origin');self.end_headers()
 def do_GET(self):
  if self.path=='/health': return self.send_json(200,{'engine':'SPPS 2.2.1','apiVersion':2,'supportedBands':[125,250,500,1000,2000,4000,8000],'available':Path(os.environ.get('SPPS_BINARY','/opt/spps/native/spps/spps')).is_file()})
  return self.send_json(404,{'error':'Ruta no encontrada.'})
 def do_POST(self):
  if self.path!='/simulate': return self.send_json(404,{'error':'Ruta no encontrada.'})
  if self.headers.get('Origin') and not self.origin(): return self.send_json(403,{'error':'Origen no permitido.'})
  token=os.environ.get('SPPS_API_TOKEN')
  if token and self.headers.get('Authorization')!='Bearer '+token: return self.send_json(401,{'error':'Acceso no autorizado.'})
  try: length=int(self.headers.get('Content-Length','0'))
  except ValueError: return self.send_json(400,{'error':'Tamaño de entrada inválido.'})
  if not 0<length<=4*1024*1024: return self.send_json(413,{'error':'La entrada debe ser menor de 4 MB.'})
  if not LOCK.acquire(blocking=False): return self.send_json(429,{'error':'Hay un cálculo en curso. Intenta nuevamente al terminar.'})
  try:
   self.connection.settimeout(20);job=json.loads(self.rfile.read(length));
   if not isinstance(job,dict): raise ValueError('Se requiere un proyecto de simulación.')
   duration=job.get('duration',1.0)
   if not isinstance(duration,(int,float)) or not .5<=duration<=5: raise ValueError('Duración permitida: 0,5–5 segundos.')
   result=run_job(job,duration=duration,particles=5000 if job.get('mapMode') is True else 12000);self.send_json(200,result)
  except (ValueError,KeyError,TypeError,OverflowError) as e: self.send_json(400,{'error':str(e)})
  except subprocess.TimeoutExpired: self.send_json(504,{'error':'El cálculo superó los 90 segundos.'})
  except (RuntimeError,FileNotFoundError): self.send_json(502,{'error':'SPPS no pudo completar el cálculo. Revisa el motor y la geometría.'})
  finally: LOCK.release()
if __name__=='__main__':
 print('REVERA SPPS API v2: room parameters and maps enabled',flush=True)
 ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()
