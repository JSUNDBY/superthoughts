"""Build only the public listening experience; never publish production or archives."""
from pathlib import Path
import json, os, subprocess, shutil, re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_site'
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir()
files=['threshold.css','threshold-session.css','calm-room.css','calm-room.js','fonts/manrope-latin.woff2','explore.html', 'library.html', 'library-filter.js', 'about.html', 'diffusion-site.css', 'diffusion-session.css', 'diffusion-artwork.js', 'diffusion-nature.js', 'diffusion-catalog.js', 'diffusion-common.js', 'diffusion-session.js']+['newsletter.css','newsletter.js','contact.html','contact.css','contact.js','visual-system.css','practice.css','session-art.css','guided-room.js','let-them-think.html','precious-life.html','images/art/let-them-think-motion.mp4','images/art/precious-life-motion.mp4','homepage.css','soft-place-to-land.html','soft-place-to-land.js','images/art/soft-place-to-land-motion.mp4','index.html','session.html','practice.html','still-enough.html','still-enough.css','still-enough.js','navigation.css','collections.js','privacy.html','terms.html','pilot.html','listen.html','gratitude.html','whole-body.html','wind-down.html',
 'pilot.css','pilot.js','pilot-visuals.js','ambient-light.js','pilot-catalog.js','pilot-progress.mjs','pilot-offline.js','pilot-feedback.js','pilot-analytics.js','pilot-analytics-core.mjs','pilot-sw.js','pilot.webmanifest',
 'CNAME','images/favicon.svg','images/josh-sundby.jpg','images/superthoughts-symbol.svg','appify.js','images/hero-lake.jpg','images/hero-lake-960.jpg','images/app-icon.svg','images/app-icon-180.png','images/app-icon-192.png','images/app-icon-512.png','images/app-icon-maskable-512.png','robots.txt','sitemap.xml']
files += ['library-covers.css', 'library-return.js']
files += [p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'images/session-covers').glob('*.jpg'))]
files += ['email-check-inbox.html', 'email-confirmed.html', 'email-confirmation.css']
if (ROOT/'images/art/still-enough-motion-loop.mp4').is_file():files.append('images/art/still-enough-motion-loop.mp4')
access=json.loads(subprocess.check_output(['node','-e',"global.window={};require('./pilot-catalog.js');console.log(JSON.stringify(window.STAccess))"],cwd=ROOT))
# Gate off: held sessions (members app only) publish no page; their old paths become the library redirect below.
held=set() if access['gate'] else set(access.get('held',[]))
files += [p.relative_to(ROOT).as_posix() for p in (ROOT/'sessions').rglob('*') if p.is_file() and p.suffix in ['.html','.js'] and p.relative_to(ROOT/'sessions').parts[0] not in held]
# Guides: text pages that answer one real question each and point to a free practice.
files += ['guides.css']+[p.relative_to(ROOT).as_posix() for p in (ROOT/'guides').rglob('*.html')]
files += [p.relative_to(ROOT).as_posix() for p in (ROOT/'fonts').iterdir() if p.is_file()]
# Any optional new homepage module must be explicitly approved for publication here.
if (ROOT/'homepage.js').is_file():files.append('homepage.js')
if (ROOT/'images/og-listening.png').is_file():files.append('images/og-listening.png')
catalog=json.loads(subprocess.check_output(['node','-e',"global.window={};require('./pilot-catalog.js');console.log(JSON.stringify(window.STCatalog))"],cwd=ROOT))
# Members gate (pilot-catalog.js, STAccess): when it is on, member audio streams only from the members app, so its files leave the public build.
access=json.loads(subprocess.check_output(['node','-e',"global.window={};require('./pilot-catalog.js');console.log(JSON.stringify(window.STAccess))"],cwd=ROOT))
gated=set(access['members']) if access['gate'] else set()
print('members gate:', 'ON, member audio not published' if gated else 'off')
assert len(catalog)>=8
assert len({item["id"] for item in catalog})==len(catalog)
for item in catalog:
 # Free sessions now play from https://audio.superthoughts.com (audio move 3a, 2026-10-23). Keep publishing the
 # repo copy at the old same-origin path until the move is complete, so older cached pages keep working.
 local=lambda p:'audio/'+p.rsplit('/',1)[1] if p.startswith('https://') else p
 # Cloudflare Pages caps a file at 25 MiB, so a legacy copy that size is skipped once the session plays from R2.
 big=lambda p:(ROOT/p).stat().st_size>=25*2**20
 if not item.get('stream') and item['id'] not in gated and (ROOT/local(item['src'])).is_file() and not (item['src'].startswith('https://') and big(local(item['src']))):files.append(local(item['src']))
 # Each track's own lock-screen and tile art (images/art/<id>.jpg).
 art=f"images/art/{item['id']}.jpg"
 if (ROOT/art).is_file():files.append(art)
 else:print(f'WARNING: no track art for {item["id"]}; render it before publishing')
 # A session with a light (sessions/light.js) also has its 1200x630 link share image.
 share=f"images/share/{item['id']}.jpg"
 if (ROOT/share).is_file():files.append(share)
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
# Gate on: no public URL for a member session may ship (red-team review 2026-11-24). Session pages, the catalog and
# their <noscript> links still name the old Bunny or audio.superthoughts.com/free copies; point them at the members app,
# then fail the build if any public copy of a gated session is still named anywhere in the release.
if gated:
 import re
 by_id={item['id']:item for item in catalog}
 public={}
 for slug in gated:
  src=by_id.get(slug,{}).get('src','')
  if src.startswith('https://'):public[src]=slug
 for name,slug in {'open-to-receive.mp3':'open-to-receive','the-quantum-reset.mp3':'the-quantum-reset'}.items():
  public[f'https://audio.superthoughts.com/free/{name}']=slug
 member=lambda slug:f"{access['app']}/audio/{slug}"
 for path in OUT.rglob('*'):
  if path.suffix not in ('.html','.js','.json') or not path.is_file():continue
  text=path.read_text(encoding='utf-8');new=text
  for url,slug in public.items():new=new.replace(url,member(slug))
  if new!=text:path.write_text(new,encoding='utf-8')
 leaks=[(str(p.relative_to(OUT)),u) for p in OUT.rglob('*') if p.suffix in ('.html','.js','.json') and p.is_file() for u in public if u in p.read_text(encoding='utf-8')]
 leaks+=[(str(p.relative_to(OUT)),'mp3') for p in OUT.rglob('*.mp3') if any(p.name.startswith(s+'-') or p.name==s+'.mp3' for s in gated)]
 assert not leaks,f'Gated audio still public in the release: {leaks[:5]}'
 print(f'members gate: {len(public)} public URLs for gated sessions rewritten to {access["app"]}/audio/<slug>, none left')
if held:
 sm=OUT/'sitemap.xml';text=sm.read_text()
 text=re.sub(r'\s*<url>(?:(?!</url>).)*?/sessions/('+'|'.join(map(re.escape,held))+r')/(?:(?!</url>).)*?</url>','',text,flags=re.S)
 sm.write_text(text)
 assert not any(f'/sessions/{h}/' in text for h in held),'held session still in sitemap'
 print(f'gate off: {len(held)} held sessions left out of pages and sitemap')
(OUT/'.nojekyll').touch()
(OUT/'404.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Come back to Superthoughts</title><body style="background:#131716;color:#f6f0e6;font:20px system-ui;padding:12vw"><h1>A new place to listen.</h1><p>This page has moved. Your next moment is in the library.</p><a style="color:inherit" href="/">Come back to Superthoughts →</a></body></html>')
# Check the exact release worker and catalog after membership URL rewriting.
subprocess.run(
 ['node','--test','--test-name-pattern=^built release','tests/pilot-offline.test.mjs'],
 cwd=ROOT, env={**os.environ,'ST_TEST_PUBLIC_ROOT':str(OUT)}, check=True
)
print(f'Public release: {sum(p.is_file() for p in OUT.rglob("*"))} files, {sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())/1e6:.1f} MB')
