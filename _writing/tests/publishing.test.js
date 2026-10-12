'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const core = require('../lib/publishing');
// JSON is a YAML subset; production uses Obsidian's native YAML parser/stringifier.
const yaml = { parse: JSON.parse, stringify: obj => JSON.stringify(obj, null, 2) };
const filename = '2026-10-12-test-post';
async function fixture(t, image = true) {
  const temp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'site-writer-test-')));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'website'); await fs.mkdir(root);
  await core.git(root, 'init', '-b', 'newtheme');
  await core.git(root, 'config', 'user.name', 'Writing test'); await core.git(root, 'config', 'user.email', 'test@example.invalid');
  await fs.writeFile(path.join(root, '.gitignore'), 'Drafts/\n.obsidian/\n');
  await fs.writeFile(path.join(root, 'README.md'), 'original');
  await core.git(root, 'add', '.gitignore', 'README.md'); await core.git(root, 'commit', '-m', 'fixture');
  const bare = path.join(temp, 'remote.git'); await core.git(root, 'init', '--bare', bare);
  await core.git(root, 'remote', 'add', 'newtheme', bare); await core.git(root, 'push', 'newtheme', 'newtheme');
  await fs.mkdir(path.join(root, `Drafts/images/${filename}`), { recursive: true });
  const imagePath = `Drafts/images/${filename}/a photo.png`;
  if (image) await fs.writeFile(path.join(root, imagePath), Buffer.from('fixture image bytes'));
  const note = `Drafts/${filename}.md`;
  const write = (body, meta = {}) => fs.writeFile(path.join(root, note), core.combine({ layout: 'post', title: 'Test post', tags: ['Software-Review'], ...meta }, body, yaml));
  await write(image ? `Hello.\n\n![Alt text](images/${filename}/a%20photo.png "Caption")\n` : 'Hello.\n');
  return { root, note, imagePath, write, bare };
}
test('private attachments become portable paths; optional featured image gets a public URL', async t => {
  const f = await fixture(t);
  await f.write(`![Alt](images/${filename}/a%20photo.png)`, { image: `images/${filename}/a photo.png` });
  const p = await core.prepare(f.root, f.note, yaml);
  assert.match(p.text, /\.\.\/images\/2026-10-12-test-post\/a%20photo.png/);
  assert.equal(core.split(p.text, yaml).meta.image, `/images/${filename}/a%20photo.png`);
  assert.equal(p.assets.size, 1);
  assert.equal(await core.exists(path.join(f.root, '_posts', `${filename}.md`)), false);
});
test('missing image prevents preparation and leaves draft unchanged', async t => {
  const f = await fixture(t, false); await f.write(`![Alt](images/${filename}/missing.png)`);
  const before = await fs.readFile(path.join(f.root, f.note));
  await assert.rejects(core.prepare(f.root, f.note, yaml), /ENOENT/);
  assert.deepEqual(await fs.readFile(path.join(f.root, f.note)), before);
});
test('cross-draft image references cannot expose another private draft', async t => {
  const f = await fixture(t); await f.write('![Private](images/other-post/secret.png)');
  await assert.rejects(core.prepare(f.root, f.note, yaml), /outside this post/);
});
test('public filename/image collisions are rejected', async t => {
  const f = await fixture(t); await fs.mkdir(path.join(f.root, 'images', filename), { recursive: true });
  await fs.writeFile(path.join(f.root, 'images', filename, 'a photo.png'), 'different image');
  await assert.rejects(core.prepare(f.root, f.note, yaml), /different image already exists/);
});
test('symlinked attachments cannot read files outside the vault', async t => {
  const f = await fixture(t); await fs.unlink(path.join(f.root, f.imagePath));
  await fs.symlink(path.join(f.root, 'README.md'), path.join(f.root, f.imagePath));
  await assert.rejects(core.prepare(f.root, f.note, yaml), /Not a regular/);
});
test('publishes selected files only, preserves unrelated edits and private recovery copy', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'README.md'), 'unrelated edit');
  await fs.writeFile(path.join(f.root, 'Drafts/other.md'), 'private words');
  await fs.writeFile(path.join(f.root, `Drafts/images/${filename}/unused.png`), 'unused');
  const plan = await core.prepare(f.root, f.note, yaml);
  const result = await core.publish(plan, { checked: { url: '/blog/test-post' } });
  const changed = (await core.git(f.root, 'diff-tree', '--no-commit-id', '--name-only', '-r', result.commit)).trim().split('\n');
  assert.deepEqual(changed.sort(), [`_posts/${filename}.md`, `images/${filename}/a photo.png`].sort());
  assert.equal(await fs.readFile(path.join(f.root, 'README.md'), 'utf8'), 'unrelated edit');
  assert.equal((await core.git(f.root, 'show', 'HEAD:README.md')).trim(), 'original');
  assert.equal(await core.exists(path.join(f.root, f.note)), false);
  assert.equal(await core.exists(path.join(f.root, 'Drafts/other.md')), true);
  assert.equal((await fs.readdir(path.join(f.root, 'Drafts/.published-backups'))).length, 1);
  assert.equal(await core.exists(path.join(f.root, `images/${filename}/unused.png`)), false);
  assert.equal(result.phase, 'uploaded');
  const second = await core.prepare(f.root, plan.target, yaml);
  assert.equal((await core.publish(second, { checked: { url: '/blog/test-post' } })).unchanged, true);
});
test('staged changes and development branches block publishing', async t => {
  const f = await fixture(t, false);
  await fs.writeFile(path.join(f.root, 'README.md'), 'staged'); await core.git(f.root, 'add', 'README.md');
  await assert.rejects(core.preflight(f.root), /already staged/);
  await core.git(f.root, 'reset', '--quiet', 'HEAD', '--', 'README.md');
  await core.git(f.root, 'switch', '-c', 'codex/test'); await assert.rejects(core.preflight(f.root), /development branch/);
});
test('failed push retains one recoverable commit and retry uploads it', async t => {
  const f = await fixture(t, false);
  // Reject receive after preflight fetch succeeds.
  const hook = path.join(f.bare, 'hooks/pre-receive'); await fs.writeFile(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const plan = await core.prepare(f.root, f.note, yaml);
  await assert.rejects(core.publish(plan, { checked: { url: '/blog/test-post' } }), /committed locally but upload failed/);
  const head = (await core.git(f.root, 'rev-parse', 'HEAD')).trim();
  await fs.unlink(hook);
  const result = await core.retry(f.root);
  assert.equal(result.commit, head); assert.equal(result.phase, 'uploaded');
});
test('a note edited after validation is never committed', async t => {
  const f = await fixture(t, false); const plan = await core.prepare(f.root, f.note, yaml);
  await f.write('Newer draft');
  await assert.rejects(core.publish(plan, { checked: { url: '/blog/test-post' } }), /changed after validation/);
  assert.equal(await core.exists(path.join(f.root, plan.target)), false);
});
test('code examples remain code and never become published attachments', async t => {
  const f = await fixture(t, false);
  await f.write('Examples:\n\n```markdown\n![](images/missing.png)\n[[A note]]\n```\n\n`![](images/another.png)`\n');
  const plan = await core.prepare(f.root, f.note, yaml);
  assert.equal(plan.assets.size, 0);
  assert.match(plan.text, /\[\[A note\]\]/);
});
test('raw HTML and reference-style image links migrate with the draft', async t => {
  const f = await fixture(t);
  await f.write(`<img src='images/${filename}/a%20photo.png' alt='Photo'>\n\n![Photo][example]\n\n[example]: <images/${filename}/a photo.png>\n`);
  const plan = await core.prepare(f.root, f.note, yaml);
  assert.equal(plan.assets.size, 1);
  assert.match(plan.text, /src='\.\.\/images\//);
  assert.match(plan.text, /\[example\]: <\.\.\/images\//);
});
