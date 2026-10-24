import copy,json,math,os,struct,tempfile,unittest
from pathlib import Path
from server.spps_adapter import prepare,write_native
from server.spps_results import read_gabe
from server.spps_runner import run_job
FIXTURE=Path(__file__).with_name('room.json')
class AdapterTests(unittest.TestCase):
 def setUp(self):self.job=json.loads(FIXTURE.read_text())
 def test_closed_mesh_and_neighbors(self):
  nodes,triangles,tetra,volume=prepare(self.job);self.assertAlmostEqual(volume,72);self.assertEqual(len(tetra),24)
  boundary=0
  for i,(_,faces) in enumerate(tetra):
   for face in faces:
    if face[4]==-2:boundary+=1;self.assertGreaterEqual(face[3],0)
    else:
     linked=[f for f in tetra[face[4]][1] if set(f[:3])==set(face[:3])];self.assertEqual(len(linked),1);self.assertEqual(linked[0][4],i)
  self.assertEqual(boundary,len(triangles))
 def test_open_reversed_duplicate_and_holes_rejected(self):
  for edit in [lambda j:j['room']['faces'].pop(),lambda j:j['room']['faces'][0]['outer'].reverse(),lambda j:j['room']['faces'].append(copy.deepcopy(j['room']['faces'][0])),lambda j:j['room']['faces'][0].update(holes=[[[0,0,0],[1,0,0],[0,1,0]]])]:
   job=copy.deepcopy(self.job);edit(job)
   with self.assertRaises(ValueError):prepare(job)
 def test_invalid_material_and_outside_position(self):
  for path in ['alpha','position']:
   job=copy.deepcopy(self.job)
   if path=='alpha':job['room']['faces'][0]['alpha'][0]=1.1
   else:job['receivers'][0]['position']=[999,999,999]
   with self.assertRaises(ValueError):prepare(job)
 def test_xml_and_binary_layouts(self):
  with tempfile.TemporaryDirectory() as folder:
   report=write_native(self.job,folder);p=Path(folder)
   self.assertEqual(struct.unpack_from('<II',(p/'mesh.cbin').read_bytes()),(1,0))
   self.assertEqual(struct.unpack_from('<II',(p/'tetramesh.mbin').read_bytes()),(24,15))
   self.assertEqual(report['reflection'],'specular');self.assertIn('direct_calc="0"',(p/'config.xml').read_text())
 def test_rebase_large_coordinates(self):
  for f in self.job['room']['faces']:f['outer']=[[x+500000 for x in p] for p in f['outer']]
  for item in self.job['sources']+self.job['receivers']:item['position']=[x+500000 for x in item['position']]
  with tempfile.TemporaryDirectory() as folder:
   report=write_native(self.job,folder);self.assertAlmostEqual(report['volume'],72);self.assertGreater(report['coordinateOrigin'][0],500000)
 def test_actual_editor_export_welds_shared_edges(self):
  job=json.loads(FIXTURE.with_name('editor-room.json').read_text());nodes,triangles,tetra,volume=prepare(job);self.assertAlmostEqual(volume,72);self.assertEqual(len(tetra),24)
 def test_invalid_gabe_rejected(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'test';p.write_bytes(b'bad')
   with self.assertRaises(ValueError):read_gabe(p)
@unittest.skipUnless(os.environ.get('SPPS_BINARY'),'Set SPPS_BINARY to run the real native core')
class NativeTests(unittest.TestCase):
 def test_real_core_free_field_and_power_scaling(self):
  job=json.loads(FIXTURE.read_text())
  for face in job['room']['faces']:face['alpha']=[1]*6
  r=run_job(job,particles=100000,duration=.05,radius=.3)
  distance=math.dist(job['sources'][0]['position'],job['receivers'][0]['position'])
  # Native uses rho*c rather than the nominal 400 Rayl free-field approximation.
  expected=80-10*math.log10(4*math.pi*distance**2)
  for band in r['receivers'][0]['bands']:self.assertAlmostEqual(band['spl'],expected,delta=1.0)
  job['sources'][0]['power']=[90]*6
  louder=run_job(job,particles=100000,duration=.05,radius=.3)
  for a,b in zip(r['receivers'][0]['bands'],louder['receivers'][0]['bands']):self.assertAlmostEqual(b['spl']-a['spl'],10,delta=.001)
  self.assertEqual(r['status'],'calculated');self.assertEqual(r['mesh']['volume'],72)
 def test_http_api_runs_native_engine(self):
  import threading,urllib.request
  from http.server import ThreadingHTTPServer
  from server.api import Handler
  server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   job=json.loads(FIXTURE.read_text());url='http://127.0.0.1:'+str(server.server_port)
   with urllib.request.urlopen(url+'/health') as response:self.assertTrue(json.load(response)['available'])
   request=urllib.request.Request(url+'/simulate',data=json.dumps(job).encode(),headers={'Content-Type':'application/json'},method='POST')
   with urllib.request.urlopen(request,timeout=100) as response:
    data=json.load(response);self.assertEqual(data['status'],'calculated');self.assertEqual(len(data['receivers'][0]['bands']),6)
  finally:server.shutdown();server.server_close()
if __name__=='__main__':unittest.main()
