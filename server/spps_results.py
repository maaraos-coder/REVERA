# SPDX-License-Identifier: GPL-3.0-or-later
"""Read upstream GABE v2 punctual receiver output (float32 bands)."""
import math,struct
from pathlib import Path

def read_gabe(path):
 data=Path(path).read_bytes()
 if len(data)<20: raise ValueError('Resultado SPPS incompleto.')
 version,extra,colextra,count=struct.unpack_from('<4i',data)
 if version!=2 or extra!=0 or colextra!=0 or not 1<=count<=100: raise ValueError('Formato GABE no compatible.')
 offset=20;columns=[]
 for _ in range(count):
  if offset+280>len(data): raise ValueError('Cabecera GABE incompleta.')
  kind,rows,length,header=struct.unpack_from('<H2xiqq',data,offset)
  label=data[offset+24:offset+279].split(b'\0')[0].decode('utf-8',errors='replace');offset+=280
  if not 0<=rows<=100000 or length<0 or header<0 or offset+length+header>len(data): raise ValueError('Columna GABE inválida.')
  payload=data[offset+header:offset+header+length];offset+=header+length
  if kind==50 and length==rows*4:
   values=list(struct.unpack('<'+str(rows)+'f',payload))
   if not all(math.isfinite(x) and x>=0 for x in values): raise ValueError('Energía no válida en SPPS.')
  elif kind==52 and length==rows*50: values=[payload[i*50:(i+1)*50].split(b'\0')[0].decode('utf-8',errors='replace') for i in range(rows)]
  else: raise ValueError('Tipo de columna GABE no compatible.')
  columns.append({'label':label,'values':values,'kind':kind})
 return columns

def receiver_result(path,item,timestep):
 cols=read_gabe(path);bands=[]
 for col in cols:
  if col['kind']!=50: continue
  frequency=int(col['label'].split()[0]);values=col['values'];total=sum(values)
  bands.append({'frequency':frequency,'meanSquarePressure':total,'spl':10*math.log10(total/(20e-6)**2) if total>0 else None,'timeStep':timestep,'response':values})
 if [b['frequency'] for b in bands]!=[125,250,500,1000,2000,4000]: raise ValueError('SPPS no devolvió las seis bandas.')
 return {'id':item['id'],'name':item['name'],'position':item['position'],'bands':bands}
