"""Exact local frontend evidence, without wallet, browser, or deployment calls."""
from pathlib import Path
import hashlib,json,os,re,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]
FRONT=ROOT/'frontend';EVIDENCE=ROOT/'evidence';EVIDENCE.mkdir(exist_ok=True)
pnpm=shutil.which('pnpm')
if not pnpm:raise SystemExit('pnpm is required')
commands={'frontend_tests':[pnpm,'test'],'typescript':[pnpm,'exec','tsc','--noEmit'],'vite_build':[pnpm,'exec','vite','build']}
report={'checks':{},'live_wallet_test':None,'deployment':None,'publication':None,'hosting':None,'visual_browser_review':None}
for name,command in commands.items():
 result=subprocess.run(command,cwd=FRONT,env=dict(os.environ,NO_COLOR='1'),capture_output=True,text=True,encoding='utf-8',errors='replace')
 output=result.stdout+result.stderr;(EVIDENCE/('final-'+name+'.log')).write_text(output,encoding='utf-8',newline='\n')
 report['checks'][name]={'exit_code':result.returncode,'passed':result.returncode==0,'command':command[1:]}
 if name=='frontend_tests':
  found=re.search(r'Tests\s+(\d+) passed',output);report['frontend_tests_passed']=int(found[1]) if found else None
 print(name+': '+('PASS' if result.returncode==0 else 'FAIL'))
 if result.returncode:print(output[-4000:])
files=[]
for path in FRONT.rglob('*'):
 rel=path.relative_to(FRONT)
 if path.is_file() and not any(p in {'node_modules','dist','.vite'} for p in rel.parts):files.append({'path':rel.as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
report['frontend_files']=sorted(files,key=lambda f:f['path'])
report['frontend_source_tree_sha256']=hashlib.sha256(json.dumps(report['frontend_files'],sort_keys=True,separators=(',',':')).encode()).hexdigest()
report['known_build_notice']='Vite reports a >500kB JS chunk from the actual genlayer-js SDK dependency; build succeeds.'
(EVIDENCE/'frontend-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
raise SystemExit(0 if all(c['passed'] for c in report['checks'].values()) else 1)
