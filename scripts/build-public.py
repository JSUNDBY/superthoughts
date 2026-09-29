"""Build only the public listening experience; never publish production or archives."""
from pathlib import Path
import json, subprocess, shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_site'
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir()
files=['index.html','session.html','practice.html','navigation.css','collections.js','privacy.html','terms.html','pilot.html','listen.html','gratitude.html','whole-body.html','wind-down.html',
 'pilot.css','pilot.js','pilot-visuals.js','ambient-light.js','pilot-catalog.js','pilot-progress.mjs','pilot-offline.js','pilot-feedback.js','pilot-analytics.js','pilot-analytics-core.mjs','pilot-sw.js','pilot.webmanifest',
 'CNAME','images/favicon.svg','images/superthoughts-symbol.svg','robots.txt','sitemap.xml']
files += [str(p.relative_to(ROOT)) for p in (ROOT/'sessions').rglob('*') if p.is_file() and p.suffix in ['.html','.js']]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'fonts').iterdir() if p.is_file()]
# Any optional new homepage module must be explicitly approved for publication here.
if (ROOT/'homepage.js').is_file():files.append('homepage.js')
if (ROOT/'images/og-listening.png').is_file():files.append('images/og-listening.png')
catalog=json.loads(subprocess.check_output(['node','-e',"global.window={};require('./pilot-catalog.js');console.log(JSON.stringify(window.STCatalog))"],cwd=ROOT))
assert len(catalog)>=8
assert len({item["id"] for item in catalog})==len(catalog)
for item in catalog:
 files.append(item['src'])
 # Each track's own lock-screen and tile art (images/art/<id>.jpg).
 art=f"images/art/{item['id']}.jpg"
 if (ROOT/art).is_file():files.append(art)
 else:print(f'WARNING: no track art for {item["id"]}; render it before publishing')
 if item['cues']:
  files.append(item['cues']);cues=json.loads((ROOT/item['cues']).read_text())
  assert item['duration']-cues[-1]['end']>=30
for filename in files:
 src=ROOT/filename
 assert src.is_file(),f'Missing public asset: {filename}'
 assert src.resolve().is_relative_to(ROOT)
 target=OUT/filename;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,target)
# Retire former main-site pages without publishing their old funnels or recordings.
old_pages=subprocess.check_output(['git','ls-files','*.html'],cwd=ROOT,text=True).splitlines()
redirect='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/#library"><title>Superthoughts</title><p><a href="/#library">Explore the new listening library</a></p></html>'''
for filename in old_pages:
 if filename in files:continue
 target=OUT/filename;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(redirect)
(OUT/'.nojekyll').touch()
(OUT/'404.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Come back to Superthoughts</title><body style="background:#131716;color:#f6f0e6;font:20px system-ui;padding:12vw"><h1>A new place to listen.</h1><p>This page has moved. Your next moment is in the library.</p><a style="color:inherit" href="/">Come back to Superthoughts →</a></body></html>')
print(f'Public release: {sum(p.is_file() for p in OUT.rglob("*"))} files, {sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())/1e6:.1f} MB')
