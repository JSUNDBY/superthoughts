import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const guides = new URL('../guides/', import.meta.url);
const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('../pilot-catalog.js', import.meta.url), 'utf8'), context);
const { STAccess, STCatalog } = context.window;
const catalogIds = new Set(STCatalog.map(({ id }) => id));
const memberIds = new Set(STAccess.gate ? STAccess.members : []);

function sessionId(href) {
  const directorySlug = href.match(/^\/?sessions\/([^/]+)\//)?.[1];
  if (directorySlug) return directorySlug;
  if (href === 'still-enough.html') return 'still-enough-to-listen';
  const slug = href.match(/^\/?([^/]+)\.html$/)?.[1];
  if (catalogIds.has(slug)) return slug;
}

test('guide recording links identify members access and any advertised free listening agrees with the catalog', () => {
  for (const entry of readdirSync(guides, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const html = readFileSync(new URL(`${entry.name}/index.html`, guides), 'utf8');
    const allPracticeCardsAreFree = /The three practices below are all free/.test(html);
    for (const [, attrs, linkBody] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const href = attrs.match(/\bhref="([^"]+)"/)?.[1];
      if (!href) continue;
      const id = sessionId(href);
      if (!id) continue;
      const link = `${entry.name} → ${href}`;
      assert.ok(catalogIds.has(id), link);
      const isMember = memberIds.has(id);
      assert.equal(/\bMembers\b/.test(linkBody), isMember, link);
      if (/\bFree\b/.test(linkBody) || (allPracticeCardsAreFree && attrs.includes('class="guide-practice"'))) {
        assert.equal(isMember, false, link);
      }
    }
  }
});
