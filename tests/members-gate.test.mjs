import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const catalogSource = readFileSync(new URL('../pilot-catalog.js', import.meta.url), 'utf8');

function load({ page = true, gate, preview = false } = {}) {
  const source = gate === undefined ? catalogSource : catalogSource.replace(/^ gate: false,$/m, ` gate: ${gate},`);
  const context = { window: {} };
  if (page) {
    context.document = { createElement: () => ({ append() {} }) };
    context.localStorage = { getItem: key => (key === 'st-gate' && preview ? 'on' : null) };
  }
  vm.runInNewContext(source, context, { filename: 'pilot-catalog.js' });
  return context.window;
}

test('the gate ships switched off', () => {
  const { STAccess, STCatalog } = load();
  assert.equal(STAccess.gate, false);
  assert.equal(STAccess.on, false);
  assert.ok(STCatalog.every(item => item.access === undefined && !item.src.startsWith(STAccess.app)));
});

test('every member slug is a session in the catalog', () => {
  const { STAccess, STCatalog } = load();
  const ids = new Set(STCatalog.map(item => item.id));
  assert.deepEqual([...STAccess.members.filter(id => !ids.has(id))], []);
  assert.equal(new Set(STAccess.members).size, STAccess.members.length);
});

for (const [name, opts] of [['switched on', { gate: true }], ['previewed in one browser', { preview: true }]]) {
  test(`${name}: member sessions stream from the members app, free ones do not change`, () => {
    const plain = load().STCatalog;
    const { STAccess, STCatalog } = load(opts);
    assert.equal(STAccess.on, true);
    for (const item of STCatalog) {
      const before = plain.find(p => p.id === item.id);
      if (STAccess.members.includes(item.id)) {
        assert.equal(item.src, `https://members.superthoughts.com/audio/${item.id}`);
        assert.equal(item.access, 'member');
        assert.equal(item.stream, undefined);
      } else {
        assert.equal(item.src, before.src);
        assert.equal(item.access, undefined);
      }
    }
  });
}

test('the service worker keeps plain paths even with the gate on', () => {
  const { STCatalog } = load({ page: false, gate: true });
  assert.ok(STCatalog.every(item => !String(item.src).startsWith('https://members.superthoughts.com')));
});
