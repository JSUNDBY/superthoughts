#!/usr/bin/env python3
"""Build index.html and library.html from library-moments.json (threshold design 2026-10-23, calm refresh 2026-11-05).

2026-11-05 (Josh): one soft light for the whole site, no per-shelf art doors, no "What is this moment?". Shelves are
plain words for what each session is for; the session page is where each light stands out. The home page shows the
arrival, the plain list of needs, the three newest sessions, why there is so much space, and the email list.
Edit library-moments.json (publish_session.py adds new sessions there), then run:  python3 scripts/build-shelves.py
"""
import html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'library-moments.json').read_text())
moments, series, sessions = data['moments'], data['series'], data['sessions']
e = lambda s: html.escape(s, quote=True)
on = lambda mid: [s for s in sessions if s['moment'] == mid]
words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
count_text = lambda n: 'Coming soon' if n == 0 else f"{(words[n] if n < len(words) else str(n)).capitalize()} session{'s' if n != 1 else ''}"

THEME = """<script>(function(){try{var t=localStorage.getItem('st-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();</script>"""
TOGGLE = """<script>(function(){var b=document.querySelector('.th-theme');if(!b)return;var r=document.documentElement;
function label(){var light=r.dataset.theme==='light';b.textContent=light?'Dark':'Light';b.setAttribute('aria-label',light?'Switch to dark':'Switch to light');}
label();b.addEventListener('click',function(){r.dataset.theme=r.dataset.theme==='light'?'dark':'light';try{localStorage.setItem('st-theme',r.dataset.theme);}catch(e){}label();});})();</script>"""

def head(title, desc, canonical, og_title):
    return f"""<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b1512">
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}">
  {THEME}
  <link rel="preload" href="fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="threshold.css">
  <link rel="canonical" href="{canonical}"><link rel="icon" href="images/favicon.svg"><link rel="manifest" href="pilot.webmanifest"><meta property="og:type" content="website"><meta property="og:url" content="{canonical}"><meta property="og:title" content="{e(og_title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="https://superthoughts.com/images/og-listening.png"><meta name="twitter:card" content="summary_large_image">
</head>"""

def header(current):
    cur = lambda p: ' aria-current="page"' if p == current else ''
    return f"""  <header class="th-header"><div class="th-wrap">
    <a class="th-brand" href="index.html">Superthoughts</a>
    <nav class="th-nav" aria-label="Main navigation">
      <a href="library.html"{cur('library')}>Library</a>
      <a class="hide-sm" href="about.html"{cur('about')}>About</a>
      <button class="th-theme" type="button">Light</button>
    </nav>
  </div></header>"""

FOOT = """  <div class="th-wrap"><p class="th-disclaimer">Superthoughts recordings are for relaxation and entertainment, made as art. They are not medical or mental health care. <a href="/terms.html">Terms</a></p></div>
  <footer class="th-footer"><div class="th-wrap"><span>© 2026 Superthoughts</span><a href="about.html">About</a><a href="guides/">Guides</a><a href="explore.html#practice">Your practice</a><a href="index.html#newsletter">Email notes</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><button type="button" data-analytics-settings>Privacy choices</button><a href="contact.html">Contact</a><a href="https://www.google.com/preferences/source?q=superthoughts.com">Add us on Google</a></div></footer>"""

def row(s, show_moment=False):
    free = '<span class="free">Free</span>' if s['free'] else ''
    where = f" · {e(next(m['name'] for m in moments + series if m['id'] == s['moment']))}" if show_moment else ''
    return f"""<li><a class="th-row" href="{e(s['href'])}"><strong>{e(s['title'])}{free}</strong><span class="len">{e(s['length'])}</span><span class="line">{e(s['line'])}{where}</span></a></li>"""

free_count = sum(1 for s in sessions if s['free'])
newest = sorted(sessions, key=lambda s: -s['num'])[:3]
needs = ''.join(f"""<li><a class="th-row" href="library.html#{m['id']}"><strong>{e(m['name'])}</strong><span class="len">{count_text(len(on(m['id'])))}</span><span class="line">{e(m['line'])}</span></a></li>""" for m in moments + series if on(m['id']))

home = f"""{head('Superthoughts. Make room for bigger thoughts.', "Guided sessions and original music by Josh Sundby. Put on headphones, close your eyes, and let the space open up.", 'https://superthoughts.com/', 'Superthoughts. Make room for bigger thoughts.')}
<body class="threshold home-page page-home">
  <a class="th-skip" href="#main">Skip to content</a>
{header('home')}
  <main id="main">
    <section class="th-arrival" aria-labelledby="welcome-title">
      <div class="th-light" aria-hidden="true"><span class="teal"></span><span class="glow"></span><span class="seam"></span><span class="shade"></span><span class="grain"></span></div>
      <div class="th-wrap">
        <p class="th-label">Deep listening</p>
        <h1 id="welcome-title">Make room for bigger thoughts.</h1>
        <p class="lede">Guided sessions and original music by Josh Sundby. Put on headphones, close your eyes, and let the space open up.</p>
        <div class="th-actions">
          <a class="th-button" href="still-enough.html"><i class="th-play" aria-hidden="true"></i>Begin with Still Enough to Listen <span>9 min</span></a>
          <a class="th-link" href="#find">Find a session <span aria-hidden="true">→</span></a>
        </div>
        <p class="th-free">{words[free_count].capitalize() if free_count < len(words) else free_count} sessions are always free.</p>
      </div>
    </section>

    <section class="th-section" id="find" aria-labelledby="find-title"><div class="th-wrap">
      <div class="th-head"><div><h2 id="find-title">Find a session</h2><p class="intro">Choose what you need. Each session is a few spoken words, room to breathe, and music made for it.</p></div><a class="th-link" href="library.html">All {len(sessions)} sessions <span aria-hidden="true">→</span></a></div>
      <ul class="th-rows">{needs}</ul>
    </div></section>

    <section class="th-section" aria-labelledby="new-title"><div class="th-wrap">
      <div class="th-head"><h2 id="new-title">New here</h2></div>
      <ul class="th-rows">
        {''.join(row(s, True) for s in newest)}
      </ul>
    </div></section>

    <section class="th-section th-ethos" aria-labelledby="space-title"><div class="th-wrap">
      <p class="th-label" id="space-title">Why there is so much space</p>
      <p>These sessions are spacious.</p>
      <p>A few words, and then room. Long pauses between the lines, so there is time to arrive, to notice what is here, and to let something settle or open on its own. You are not missing anything in the quiet. The quiet is the practice, and the music is there to hold you in it.</p>
      <p>Go at your own pace. Listen once or a hundred times, for the whole session or for a few minutes, eyes closed or open. Nothing here needs to be done right.</p>
      <a class="th-link" href="about.html">About Superthoughts <span aria-hidden="true">→</span></a>
    </div></section>

    <section class="th-section" id="newsletter" aria-labelledby="newsletter-title"><div class="th-wrap th-email">
      <div><p class="th-label">An occasional note</p><h2 id="newsletter-title">Only when there is something new to hear.</h2><p class="intro">New sessions arrive most weeks. Josh writes only when something new is ready or something matters, so you can stay close to what is happening here without a crowded inbox. The library stays open either way.</p></div>
      <div id="newsletter-signup"><form action="https://app.kit.com/forms/10010941/subscriptions" method="post" style="display:flex;flex-direction:column;gap:14px">
        <div class="fields"><label class="sr-only" for="newsletter-email">Email address</label><input id="newsletter-email" type="email" name="email_address" placeholder="Email address" autocomplete="email" required maxlength="254"><button type="submit">Join the email list</button></div>
        <label class="choice"><input type="checkbox" name="newsletter_consent" value="yes" required> I want to receive occasional Superthoughts emails.</label>
        <label class="honeypot" aria-hidden="true">Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <p class="small">Kit will send a confirmation email. You can unsubscribe whenever you like. <a href="privacy.html">How we use your email</a>.</p>
      </form></div>
    </div></section>
  </main>
{FOOT}
  {TOGGLE}
  <script src="newsletter.js" defer></script><script src="pilot-catalog.js"></script><script type="module" src="pilot-analytics.js"></script>
</body>
</html>
"""

shelves = []
for m in moments + series:
    items = on(m['id'])
    if not items and m in series: continue
    rows = f"""<ul class="th-rows">{''.join(row(s) for s in items)}</ul>""" if items else '<p class="th-empty">New sessions for this moment are on their way.</p>'
    shelves.append(f"""    <section class="th-shelf" id="{m['id']}" aria-labelledby="shelf-{m['id']}"><div class="th-wrap th-shelf-head">
      <div class="th-shelf-title"><h2 id="shelf-{m['id']}">{e(m['name'])}</h2><p>{e(m['line'])}</p></div>
      <div>{rows}</div>
    </div></section>""")
jump = ''.join(f'<a href="#{m["id"]}">{e(m["name"])}</a>' for m in moments + series if on(m['id']))

library = f"""{head('Library · Superthoughts', 'Every Superthoughts session, by what it is for: starting the day, before and after something hard, a short reset, love, confidence, rest and sleep.', 'https://superthoughts.com/library.html', 'The Superthoughts library')}
<body class="threshold library-page">
  <a class="th-skip" href="#main">Skip to content</a>
{header('library')}
  <main id="main">
    <div class="th-library-top"><div class="th-light th-soft" aria-hidden="true"><span class="teal"></span><span class="glow"></span><span class="seam"></span><span class="shade"></span><span class="grain"></span></div>
    <div class="th-wrap th-library-intro">
      <p class="th-label">The library</p>
      <h1>Find what you need.</h1>
      <p class="intro">{len(sessions)} sessions in Josh's voice, each with its own music. The free ones are marked.</p>
      <nav class="th-jump" aria-label="What each session is for">{jump}</nav>
    </div></div>
{chr(10).join(shelves)}
    <div class="th-wrap" style="padding:56px 0 24px;display:flex;flex-wrap:wrap;gap:12px 32px"><a class="th-link" href="guides/">Guides: one question, one practice</a><a class="th-link" href="about.html">About Superthoughts</a><a class="th-link" href="explore.html#practice">Your listening history</a></div>
  </main>
{FOOT}
  {TOGGLE}
  <script src="pilot-catalog.js"></script><script type="module" src="pilot-analytics.js"></script>
</body>
</html>
"""

about = f"""{head('About · Superthoughts', 'Superthoughts is guided sessions and original music by Josh Sundby, made slowly to be listened to slowly.', 'https://superthoughts.com/about.html', 'About Superthoughts')}
<body class="threshold about-page">
  <a class="th-skip" href="#main">Skip to content</a>
{header('about')}
  <main id="main">
    <div class="th-wrap th-library-intro th-ethos">
      <p class="th-label">About</p>
      <h1 style="margin:0 0 36px">Made slowly, to be listened to slowly.</h1>
      <p>Superthoughts is made by Josh Sundby, a meditation teacher and musician in Minneapolis. He has taught meditation for more than twenty-five years.</p>
      <p>Every session starts with his own words, spoken in his own voice. The music is his too, composed for each session: slow, low and warm, made to be felt in the body as much as heard.</p>
      <p>These sessions are spacious. A few words, then long, open pauses. That space is where the real work happens: room to arrive, to notice what is here, and to let something settle or open on its own. You are not missing anything in the quiet. The music is there to hold you in it.</p>
      <p>Go at your own pace. There is nothing to learn and nothing to perform. Listen once or a hundred times, for a few minutes or all the way through, eyes closed or open.</p>
      <p>Each session is made for a real moment in a day: the morning before you pick up the phone, the breath before you say yes, the night when your mind will not stop.</p>
      <p>The name is the idea. When the noise quiets down, there is room for bigger thoughts: about yourself, your life, and what is possible.</p>
      <div class="th-actions">
        <a class="th-button" href="still-enough.html"><i class="th-play" aria-hidden="true"></i>Begin with Still Enough to Listen <span>9 min</span></a>
        <a class="th-link" href="library.html">The whole library <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </main>
{FOOT}
  {TOGGLE}
  <script src="pilot-catalog.js"></script><script type="module" src="pilot-analytics.js"></script>
</body>
</html>
"""

(ROOT / 'index.html').write_text(home)
(ROOT / 'about.html').write_text(about)
(ROOT / 'library.html').write_text(library)
print(f'built index.html, library.html and about.html: {len(sessions)} sessions on {len(moments)} shelves')
