// Vendor pitches through the contact form (SEO, redesign mockups, virtual
// assistants, ad placement). Ported 2026-10-27 from the Casket Arts and
// California Building hubs, where it caught all 34 past pitches and passed
// every real message. A match is kept in the FILTERED KV namespace instead
// of emailed, so a wrong catch can still be found.
//
// One opt-out line or a bot string is enough. Everything else needs two
// sales signals, or one when the name is written only in Cyrillic, so a
// listener asking "can we set up a call about a retreat?" gets through.
const OPT_OUT = [
  /\bopt[\s-]?out\b/i,
  /\bunsubscribe\b/i,
  /\b(reply|respond|text)\b[^.\n]{0,25}\bstop\b/i
];

const SALES = [
  /\bcomplimentary\b/i,
  /\bfree (trial|quote|estimate|consultation|audit|for \d+ days)\b|\btry it free\b/i,
  /\b(set up|schedule|book|hop on|jump on|quick)\s+(a\s+)?(call|zoom|meeting|demo)\b/i,
  /\bbusiness broker\b|\bbuyers interested\b|\binterested in selling\b/i,
  /\bSEO\b|\b(1st|first) page of google\b|\bwikipedia page\b/i,
  /\btried (emailing|to email|to reach|reaching) you\b/i,
  /\b(business development|sales) (rep|representative|manager)\b/i,
  /\bhelp (many|local|businesses|companies)\b|\bwork with [^.\n]{0,40}(owners|businesses|companies)\b/i,
  /\b(cooperation|partnership) in advertising\b|\badvertising campaigns?\b|\bcustomer acquisition\b|\btarget audience\b/i,
  /\blead generation\b|\bcold calling\b|\bappointment setting\b/i,
  /\bvirtual (assistant|assistance|team)s?\b|\btrained VA\b/i,
  /\b(built|coded|made|designed) (you )?a new (version of your )?(web)?site\b/i,
  /\b(grow|boost|increase|drive) (your )?(website |site )?traffic\b|\bSEO services\b/i,
  // Superthoughts only: the redesign-mockup pitch of 2026-10-27.
  /\b(re)?design mock-?ups?\b|\bmock-?ups? (for|of) your\b/i,
  /\bit'?s (completely|totally|100%) free\b|\bat no cost to you\b|\bfree of charge\b/i
];

const CYRILLIC = /[\u0400-\u04FF]/;
const LATIN = /[A-Za-z]/;
const BOT_STRING = /^[A-Z0-9]{12,}$/;

export function looksLikeSolicitation(message, name = '') {
  if (OPT_OUT.some(r => r.test(message))) return true;
  if (BOT_STRING.test(message.trim())) return true;
  const signals = SALES.filter(r => r.test(message)).length;
  if (CYRILLIC.test(name) && !LATIN.test(name)) return signals >= 1;
  return signals >= 2;
}
