'use strict';
// Integration regression: requires the website's installed Ruby/Jekyll bundle.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const core = require('../lib/publishing');

test('full website preview renders Unicode under an ASCII desktop-app locale', async () => {
  const previous = { LANG: process.env.LANG, LC_ALL: process.env.LC_ALL };
  process.env.LANG = 'C';
  process.env.LC_ALL = 'C';
  let built;
  try {
    built = await core.build({
      root: path.resolve(__dirname, '../..'),
      target: '_posts/2020-01-01-site-writer-encoding-regression.md',
      text: '---\nlayout: post\ntitle: "Café — UTF-8 preview"\n---\n\nUnicode body: ✓ 👊.\n',
      assets: new Map(),
    });
    const html = await fs.readFile(path.join(built.output, built.article), 'utf8');
    assert.match(html, /Café — UTF-8 preview/);
    assert.match(html, /Unicode body: ✓ 👊/);
    assert.match(html, /content:\s*["']✓["']/);
    assert.equal((await core.walk(built.output)).some(file => file.startsWith('Drafts/')), false);
  } finally {
    if (built) await fs.rm(built.temp, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
