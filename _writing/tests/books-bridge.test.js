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
    for (const name of ['import.rb', 'settings.rb', 'manage.rb', 'posts.rb', 'metadata.rb', 'transaction.rb']) await fs.copyFile(path.join(source, '_writing/books', name), path.join(root, '_writing/books', name));
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

test('a fresh CSV record with no seeded cover gets exact-ID metadata during import; reimport and explicit no-cover are preserved', async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fresh-book-import-')));
  const source = path.resolve(__dirname, '../..'); const fetcher = require('../lib/books-fetch');
  try {
    await fs.cp(path.join(source, '_writing/books'), path.join(root, '_writing/books'), { recursive: true }); await fs.mkdir(path.join(root, '_data'));
    for (const file of ['Gemfile', 'Gemfile.lock', '.ruby-version']) await fs.copyFile(path.join(source, file), path.join(root, file));
    await fs.writeFile(path.join(root, '_data/books.yml'), '[]'); await fs.writeFile(path.join(root, '_data/books-overrides.yml'), '{}');
    const csv = 'Book Id,Title,Author,ISBN,ISBN13,My Rating,Exclusive Shelf,My Review,Spoiler,Date Read\n40745,Mindset,Carol S. Dweck,,,4,read,,false,\n';
    const captured = await books.captureCsv(root, { name: 'library.csv', size: Buffer.byteLength(csv), arrayBuffer: async () => Buffer.from(csv) });
    const xml = '<rss><channel><item><book_id>40745</book_id><book_large_image_url>https://i.gr-assets.com/images/test/40745.jpg</book_large_image_url></item></channel></rss>';
    let imageChecks = 0;
    const collect = (library, ids) => fetcher.collect({ books: library, ids, get: async ({ url }) => url.includes('list_rss') ? { status: 200, text: xml } : { status: 200, arrayBuffer: Buffer.from('decoded test image') }, parse: async feeds => (await books.call(root, { mode: 'parse-feeds', feeds })).records, verify: async () => imageChecks++ });
    const plan = await books.inspectImport(root, captured.file, { collect });
    assert.equal(plan.summary.metadata_updates, 1); assert.equal(imageChecks, 1);
    await books.call(root, { mode: 'apply', file: captured.file, token: plan.token, fingerprint: plan.fingerprint, enrichment: plan.enrichment });
    const current = await books.call(root, { mode: 'read' });
    assert.equal(current.overrides['40745'].cover_origin, 'automatic'); assert.match(current.overrides['40745'].cover, /40745.jpg$/); assert.equal(current.books[0].rating, 4);
    assert.equal((await books.inspectImport(root, captured.file, { collect: () => { throw new Error('should not refetch successful cover'); } })).summary.unchanged, true);
    await books.call(root, { mode: 'save', token: current.token, overrides: current.overrides, metadata: { '40745': { cover: null } } });
    const next = await books.call(root, { mode: 'read' }); assert.equal(next.overrides['40745'].cover_disabled, true); assert.equal(next.overrides['40745'].cover, undefined);
    assert.equal((await books.inspectImport(root, captured.file, { collect: () => { throw new Error('respect no-cover'); } })).summary.unchanged, true);
    await captured.cleanup();
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
