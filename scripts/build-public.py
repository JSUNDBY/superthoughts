"""Build only the public listening experience; never publish production or archives."""
from pathlib import Path
import json, subprocess, shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_site'
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir()
files=['threshold.css','fonts/manrope-latin.woff2','explore.html', 'library.html', 'about.html', 'diffusion-site.css', 'diffusion-session.css', 'diffusion-artwork.js', 'diffusion-nature.js', 'diffusion-catalog.js', 'diffusion-common.js', 'diffusion-session.js']+['newsletter.css','newsletter.js','contact.html','contact.css','contact.js','visual-system.css','practice.css','session-art.css','guided-room.js','let-them-think.html','precious-life.html','images/art/let-them-think-motion.mp4','images/art/precious-life-motion.mp4','homepage.css','soft-place-to-land.html','soft-place-to-land.js','images/art/soft-place-to-land-motion.mp4','index.html','session.html','practice.html','still-enough.html','still-enough.css','still-enough.js','navigation.css','collections.js','privacy.html','terms.html','pilot.html','listen.html','gratitude.html','whole-body.html','wind-down.html',
 'pilot.css','pilot.js','pilot-visuals.js','ambient-light.js','pilot-catalog.js','pilot-progress.mjs','pilot-offline.js','pilot-feedback.js','pilot-analytics.js','pilot-analytics-core.mjs','pilot-sw.js','pilot.webmanifest',
 'CNAME','images/favicon.svg','images/superthoughts-symbol.svg','robots.txt','sitemap.xml']
if (ROOT/'images/art/still-enough-motion-loop.mp4').is_file():files.append('images/art/still-enough-motion-loop.mp4')
files += [str(p.relative_to(ROOT)) for p in (ROOT/'sessions').rglob('*') if p.is_file() and p.suffix in ['.html','.js']]
# Guides: text pages that answer one real question each and point to a free practice.
files += ['guides.css']+[str(p.relative_to(ROOT)) for p in (ROOT/'guides').rglob('*.html')]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'fonts').iterdir() if p.is_file()]
# Any optional new homepage module must be explicitly approved for publication here.
if (ROOT/'homepage.js').is_file():files.append('homepage.js')
if (ROOT/'images/og-listening.png').is_file():files.append('images/og-listening.png')
catalog=json.loads(subprocess.check_output(['node','-e',"global.window={};require('./pilot-catalog.js');console.log(JSON.stringify(window.STCatalog))"],cwd=ROOT))
assert len(catalog)>=8
assert len({item["id"] for item in catalog})==len(catalog)
for item in catalog:
 # Free sessions now play from https://audio.superthoughts.com (audio move 3a, 2026-10-23). Keep publishing the
 # repo copy at the old same-origin path until the move is complete, so older cached pages keep working.
 local=lambda p:'audio/'+p.rsplit('/',1)[1] if p.startswith('https://') else p
 if not item.get('stream') and (ROOT/local(item['src'])).is_file():files.append(local(item['src']))
 # Each track's own lock-screen and tile art (images/art/<id>.jpg).
 art=f"images/art/{item['id']}.jpg"
 if (ROOT/art).is_file():files.append(art)
 else:print(f'WARNING: no track art for {item["id"]}; render it before publishing')
 if item['cues']:
  files.append(local(item['cues']));cues=json.loads((ROOT/local(item['cues'])).read_text())
  if not item.get('stream'):assert item['duration']-cues[-1]['end']>=30  # craft rule for new productions; legacy catalog recordings ship as published
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
