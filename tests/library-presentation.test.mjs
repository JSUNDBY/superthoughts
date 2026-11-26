import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const site = process.env.ST_TEST_PUBLIC_ROOT || root;
const read = (dir, file) => readFileSync(join(dir, file), 'utf8');
const { sessions } = JSON.parse(read(root, 'library-moments.json'));
const context = { window: {} };
vm.runInNewContext(read(root, 'pilot-catalog.js'), context);
const { STCatalog, STAccess } = context.window;
const members = new Set(STAccess.gate ? STAccess.members : []);
const library = read(site, 'library.html');
const rows = [...library.matchAll(/<li (data-needs="[^"]*"[^>]*)><a class="th-row[^"]*" href="([^"]+)">([\s\S]*?)<\/a><\/li>/g)];

test('each library row displays the access level of its recording', () => {
  assert.ok(rows.length);
  for (const [, attrs, href, content] of rows) {
    const guided = sessions.find(session => session.href === href);
    const guidedId = guided?.key === 'still-enough' ? 'still-enough-to-listen' : guided?.key;
    const id = guidedId || new URL(href, 'https://superthoughts.com').searchParams.get('session');
    assert.ok(STCatalog.some(item => item.id === id), href);
    const isFree = !members.has(id);
    assert.equal(attrs.includes('data-free'), isFree, href);
    assert.ok(content.includes(' · ' + (isFree ? 'Free' : 'Member') + '</span>'), href);
    if (!guided) assert.ok(!content.includes('class="starts"'), href);
  }
});

test('photographic rows have a matching listening-room image in the public build', () => {
  let pairs = 0;
  for (const [, , href, content] of rows) {
    const session = sessions.find(item => item.href === href);
    if (!session) continue;
    const cover = 'images/session-covers/' + (session.libraryCover?.cover || session.key) + '.jpg';
    if (!session.free || !existsSync(join(root, cover))) continue;
    assert.ok(content.includes('src="/' + cover + '"'), href);
    assert.ok(existsSync(join(site, cover)), cover);
    const path = href.endsWith('/') ? href + 'index.html' : href;
    assert.ok(read(site, path).includes('class="room-photo" src="/' + cover + '"'), href);
    pairs++;
  }
  assert.ok(pairs > 0);
});
