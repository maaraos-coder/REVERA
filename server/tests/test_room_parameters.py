import math,unittest
from server.room_parameters import descriptors,sti_estimate
class RoomParameterTests(unittest.TestCase):
 def test_exponential_decay_has_known_clarity_and_rt(self):
  dt=.001;k=6*math.log(10);e=[math.exp(-k*(i+.5)*dt) for i in range(4000)];p=descriptors(e,dt)
  self.assertAlmostEqual(p['C50'],10*math.log10(math.expm1(k*.05)),places=5)
  self.assertAlmostEqual(p['C80'],10*math.log10(math.expm1(k*.08)),places=5)
  self.assertAlmostEqual(p['D50'],100*(1-math.exp(-k*.05)),places=5)
  self.assertAlmostEqual(p['Ts'],1000/k,delta=.01)
  for metric in ['EDT','T20','T30']:self.assertAlmostEqual(p[metric]['seconds'],1,delta=.003)
  delayed=descriptors([0]*300+e,dt);self.assertAlmostEqual(delayed['C50'],p['C50']);self.assertAlmostEqual(delayed['Ts'],p['Ts'])
 def test_short_tail_blocks_rt_and_sti(self):
  e=[math.exp(-i*.001) for i in range(1000)];p=descriptors(e,.001);self.assertIsNone(p['T30']);self.assertTrue(p['warnings'])
  bands=[{'frequency':f,'response':e,'timeStep':.001,'parameters':p} for f in [125,250,500,1000,2000,4000,8000]];self.assertIsNone(sti_estimate(bands)['value'])
 def test_ideal_channel_sti_one_and_missing_band_unavailable(self):
  e=[1]+[0]*4999;p=descriptors(e,.001);bands=[{'frequency':f,'response':e,'timeStep':.001,'parameters':p} for f in [125,250,500,1000,2000,4000,8000]]
  self.assertAlmostEqual(sti_estimate(bands)['value'],1);self.assertIsNone(sti_estimate(bands[:-1])['value'])
 def test_mtf_matches_analytic_exponential(self):
  dt=.001;k=6*math.log(10);e=[math.exp(-k*(i+.5)*dt) for i in range(5000)];p=descriptors(e,dt);bands=[{'frequency':f,'response':e,'timeStep':dt,'parameters':p} for f in [125,250,500,1000,2000,4000,8000]];r=sti_estimate(bands)
  for m,f in zip(r['mtf'][0],r['modulations']):self.assertAlmostEqual(m,1/math.sqrt(1+(2*math.pi*f/k)**2),delta=.0002)
  self.assertGreater(r['value'],0);self.assertLess(r['value'],1)
 def test_zero_energy_has_no_parameters(self):self.assertIsNone(descriptors([0]*100,.002)['C50'])
