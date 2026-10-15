'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const books = require('../lib/books');

test('native bridge saves choices, imports without resetting them, rejects stale/corrupt input and cleans private request files', async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'books bridge-')));
  const source = path.resolve(__dirname, '../..');
  try {
    await fs.mkdir(path.join(root, '_writing/books'), { recursive: true }); await fs.mkdir(path.join(root, '_data'));
    for (const name of ['import.rb', 'settings.rb', 'manage.rb']) await fs.copyFile(path.join(source, '_writing/books', name), path.join(root, '_writing/books', name));
    for (const name of ['Gemfile', 'Gemfile.lock', '.ruby-version']) await fs.copyFile(path.join(source, name), path.join(root, name));
    const output = path.join(root, '_data/books.yml'), settings = path.join(root, '_data/books-overrides.yml');
    const original = [{ id: '12', title: 'Café — First', author: 'Author', status: 'read', source_url: 'https://www.goodreads.com/book/show/12', rating: 4 }];
    await fs.writeFile(output, JSON.stringify(original)); await fs.writeFile(settings, JSON.stringify({ '12': { recommended: true, history_hidden: true, recommendation_blurb: '<script>plain text</script>' } }));
    const before = await fs.readFile(settings, 'utf8'), state = await books.call(root, { mode: 'read' });
    const csv = 'Book Id,Title,Author,ISBN,ISBN13,My Rating,Exclusive Shelf,My Review,Spoiler,Date Read\n12,Café — First,Author,,,5,read,Review,false,2026/10/15\n13,New,Author,,,0,currently-reading,,false,\n';
    const captured = await books.captureCsv(root, { name: 'export.csv', size: Buffer.byteLength(csv), arrayBuffer: async () => Buffer.from(csv) });
    const plan = await books.call(root, { mode: 'import', file: captured.file }); assert.equal(plan.summary.added[0].id, '13');
    assert.equal(await fs.readFile(settings, 'utf8'), before);
    await books.call(root, { mode: 'apply', file: captured.file, ...plan });
    assert.equal(await fs.readFile(settings, 'utf8'), before);
    await assert.rejects(books.call(root, { mode: 'save', token: state.token, overrides: state.overrides }), /changed/);
    const current = await books.call(root, { mode: 'read' }); current.overrides['12'].history_hidden = false;
    assert.equal((await books.call(root, { mode: 'save', token: current.token, overrides: current.overrides })).saved, true);
    const saved = await books.call(root, { mode: 'read' }); assert.equal(saved.overrides['12'].recommendation_blurb, '<script>plain text</script>');
    assert.equal((await books.call(root, { mode: 'import', file: captured.file })).summary.unchanged, true);
    await fs.writeFile(captured.file, 'bad CSV'); const publicBefore = await fs.readFile(output, 'utf8');
    await assert.rejects(books.call(root, { mode: 'import', file: captured.file }), /no book records|Missing Goodreads headers/);
    assert.equal(await fs.readFile(output, 'utf8'), publicBefore);
    await captured.cleanup();
    assert.deepEqual(await fs.readdir(path.join(root, 'Drafts/.imports/goodreads')), ['backups']);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('a symlinked Drafts folder is rejected before writing outside the vault', async () => {
 const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'books-symlink-')));
 const outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'books-outside-')));
 try {
  await fs.symlink(outside, path.join(root, 'Drafts'));
  await assert.rejects(books.captureCsv(root, { name: 'export.csv', size: 1, arrayBuffer: async () => Buffer.from('x') }), /symlinks/);
  assert.deepEqual(await fs.readdir(outside), []);
 } finally { await fs.rm(root, { recursive: true, force: true }); await fs.rm(outside, { recursive: true, force: true }); }
});
