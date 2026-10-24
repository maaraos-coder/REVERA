# SPDX-License-Identifier: GPL-3.0-or-later
"""Energy-response room descriptors. No extra squaring of SPPS energy bins.
STI is a reverberation-only engineering estimate, not an IEC compliance claim.
References: I-Simpa room_acoustics_parameters; IEC indirect MTF formulation.
"""
import math,cmath
MODULATIONS=[.63,.8,1,1.25,1.6,2,2.5,3.15,4,5,6.3,8,10,12.5]
ALPHA=[.085,.127,.230,.233,.309,.224,.173]
BETA=[.085,.078,.065,.011,.047,.095]

def descriptors(values,dt):
 if not math.isfinite(dt) or dt<=0 or any(not math.isfinite(v) or v<0 for v in values):raise ValueError('Respuesta temporal inválida.')
 total=sum(values)
 if total<=0:return {'C50':None,'C80':None,'D50':None,'Ts':None,'EDT':None,'T20':None,'T30':None,'warnings':['Sin energía registrada.']}
 first=next(i for i,e in enumerate(values) if e>total*1e-10);energy=values[first:];total=sum(energy)
 # Bins represent integrated energy in [i*dt,(i+1)*dt); linearly apportion cutoff bins.
 def early(limit):return sum(e*max(0,min(1,(limit-i*dt)/dt)) for i,e in enumerate(energy))
 def clarity(limit):
  e=early(limit);late=total-e
  return 10*math.log10(e/late) if e>0 and late>total*1e-12 else None
 tail=[];s=0
 for e in reversed(energy):s+=e;tail.append(s)
 tail.reverse();decay=[10*math.log10(e/total) if e>0 else -math.inf for e in tail]
 late_fraction=sum(energy[-max(1,round(.1/dt)):])/total
 warnings=[]
 if late_fraction>.001:warnings.append('Cola temporal importante: aumenta la duración; claridad, Ts y STI pueden estar sesgados.')
 def fit(hi,lo):
  indices=[i for i,y in enumerate(decay) if lo<=y<=hi]
  if len(indices)<5 or not any(y<=lo-5 for y in decay[:-max(1,round(.01/dt))]) or late_fraction>.001:return None
  x=[i*dt for i in indices];y=[decay[i] for i in indices];xm=sum(x)/len(x);ym=sum(y)/len(y);xx=sum((v-xm)**2 for v in x)
  if xx<=0:return None
  slope=sum((a-xm)*(b-ym) for a,b in zip(x,y))/xx;yy=sum((v-ym)**2 for v in y);res=sum((b-(ym+slope*(a-xm)))**2 for a,b in zip(x,y));r2=1-res/yy if yy else 0
  return {'seconds':-60/slope,'r2':r2} if slope<0 and r2>=.95 else None
 return {'C50':clarity(.05),'C80':clarity(.08),'D50':100*early(.05)/total,'Ts':1000*sum((i+.5)*dt*e for i,e in enumerate(energy))/total,'EDT':fit(0,-10),'T20':fit(-5,-25),'T30':fit(-5,-35),'arrival':first*dt,'tailFraction':late_fraction,'warnings':warnings}

def sti_estimate(bands):
 byfreq={b['frequency']:b for b in bands};frequencies=[125,250,500,1000,2000,4000,8000]
 if any(f not in byfreq for f in frequencies):return {'value':None,'reason':'Completa α y Lw a 8000 Hz para calcular las siete bandas de STI.'}
 mtis=[];matrix=[]
 for f in frequencies:
  b=byfreq[f];values=b['response'];total=sum(values);dt=b['timeStep']
  if total<=0:return {'value':None,'reason':'Falta energía en una banda.'}
  if b['parameters']['tailFraction']>.001:return {'value':None,'reason':'La respuesta termina con energía importante: aumenta la duración.'}
  m=[min(1,abs(sum(e*cmath.exp(-2j*math.pi*fm*(i+.5)*dt) for i,e in enumerate(values)))/total) for fm in MODULATIONS]
  ti=[]
  for v in m:
   snr=15 if v>=1-1e-12 else -15 if v<=1e-12 else max(-15,min(15,10*math.log10(v/(1-v))))
   ti.append((snr+15)/30)
  mtis.append(sum(ti)/14);matrix.append(m)
 value=sum(a*m for a,m in zip(ALPHA,mtis))-sum(b*math.sqrt(mtis[i]*mtis[i+1]) for i,b in enumerate(BETA))
 return {'value':max(0,min(1,value)),'method':'MTF indirecta · estimación sin ruido ni enmascaramiento auditivo','mti':mtis,'modulations':MODULATIONS,'mtf':matrix,'certified':False}
