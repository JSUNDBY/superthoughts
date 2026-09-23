# design.md — Superthoughts homepage frame

Direction: Projects/SuperThoughts/Art Direction v2 in the brain. This file is the build contract for the frame.

## Reference + intent

Reference: a Scandinavian design firm's own site (Bakken & Bæck, Kurppa Hosk, Heydays, Kontrapunkt). Paper ground, one grotesk, a grid you can feel, whitespace as the material, honest photography, quiet motion.

The one feeling: a quiet room with good light. Nothing asks for attention. One thing is alive.

The one idea: the meditation paints the screen. A single framed rectangle on the grid, painted by Josh's voice while a real free session plays. Everything else is type on paper.

## Type

One family: **Manrope** (Google Fonts, weights 400/500/600). Fallback: `system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`. No serif, no italics, no monospace, no uppercase tracking.

Scale (desktop / mobile), all Manrope:

| Role | Size | Weight | Leading | Tracking |
| --- | --- | --- | --- | --- |
| Display (h1) | 96px / 44px | 500 | 1.0 | -0.03em |
| Section (h2) | 40px / 28px | 500 | 1.1 | -0.02em |
| Index title | 28px / 22px | 500 | 1.2 | -0.01em |
| Pull quote | 32px / 24px | 400 | 1.3 | -0.01em |
| Body | 18px / 17px | 400 | 1.55 | 0 |
| Small | 15px | 400 | 1.5 | 0 |
| Label | 13px | 500 | 1.4 | 0 |


## Color

- `--paper` `#F4F3EF` ground. Cool-neutral off-white. Not cream.
- `--ink` `#161615` all text and controls.
- `--stone` `#6E6D68` secondary text, labels.
- `--hair` `#D8D7D1` hairline rules, 1px.
- `--moss` `#3E5A3B` the one accent. Allowed: the play control fill, link underline on hover, focus ring. Nowhere else.
- Field tints (inside the rectangle only): fog `#DCDDD6`, birch `#EAE6DB`, moss-light `#B9C2B0`, clay `#C9B3A2`. Muted. Never saturated.

Dark mode: not in this frame. Deep Sleep will carry the dark variant later.

## Space + layout

- Base unit 8px. Spacing steps: 8, 16, 24, 32, 48, 64, 96, 128, 192.
- Grid: 12 columns, 24px gutter. Page margin 24px (mobile), 40px (tablet), 56px (desktop). Max width 1440px.
- Section spacing: 128px desktop, 80px mobile, with a 1px hairline at the top of each section.
- Nav: 72px tall, wordmark left, three words right. Hairline below.
- Hero: h1 in columns 1 to 9. One line of body in columns 1 to 5. Then the field, columns 1 to 12, aspect 16:10 desktop, 4:5 mobile. Under it a museum-label row: title, duration, play control.
- Programs: an index. Each row is a hairline, a number (label), title (index title) in columns 1 to 5, one line (body) in 6 to 10, duration (small) in 11 to 12.
- Josh: portrait small and understated, columns 1 to 2 at 4:5, capped at 200px wide (160px on mobile). Text columns 7 to 12. A pull quote from a listener sits above the text. The portrait is a signature, not a poster.
- Footer: hairline, wordmark, place, email, Privacy, Terms.
- Nothing centered. Left edge is the law.

## Motion

- Page load: sections fade from opacity 0.001 to 1 and rise 8px over 600ms, `cubic-bezier(0.2, 0.6, 0.2, 1)`, staggered 60ms. CSS only, so it runs without JavaScript. Off under `prefers-reduced-motion`.
- The field breathes on an 11-second cycle when idle. On play, the analyser's low band drives swell, mids drive drift, highs drive shimmer. Smoothed with a slow lag so nothing flickers.
- Hover: link underline appears, 150ms. Play control fills moss, 200ms. No scale, no lift, no bounce.
- Nothing else moves.

## Texture / detail

- No shadows. No corner radius except the play control (circle). No borders except hairlines.
- The field carries a fine grain so it reads as pigment, not a gradient.
- Portrait: one image, 4:5, no filter, no rounded corners. Daylight photograph wanted; the current studio portrait is a stand-in.
- Favicon: a 1px-stroked circle in ink on paper, 32px.

## Accessibility floor

- Skip link, `main` landmark, one h1, logical heading order.
- Everything readable with JavaScript off. The field falls back to a still tint block.
- `prefers-reduced-motion`: the field renders one frame and stops; fades are instant.
- Play control is a `button` with `aria-pressed` and a text label. Keyboard: Space/Enter play, arrow keys seek 5s. Live region announces state.
- No transcript on the page (Josh, 2026-09-20: the session is heard, not read). Session pages get a one-line description and an on-request accessibility transcript, not a visible script.
- Focus ring: 2px moss, 3px offset, on every interactive element.
- Contrast: ink on paper 15:1, stone on paper 4.9:1. Nothing is placed over the field.
- Touch targets 44px minimum. No autoplay.

## Anti-patterns (this project)

- No dark navy ground. No gold. No italic accent word. No mono eyebrows.
- No icon cards, no stats counters, no star ratings, no testimonial grid, no "science" accordion.
- No starfield, no glassmorphism, no blobs, no gradient hero.
- No text over the field. The field is an artwork on a wall, with a label beneath it.
- No Inter. No centered hero. No pill buttons.
- No content gated behind scroll-triggered reveals.
