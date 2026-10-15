'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fetcher = require('../lib/books-fetch');
const book = { id: '12', title: 'Mindset', author: 'Carol Dweck', source_url: 'https://www.goodreads.com/book/show/12' };
const cover = 'https://i.gr-assets.com/images/test/12.jpg';
test('exact-ID cover fetching supports missing ISBN, checks images, and deduplicates feed pages', async () => {
  let images = 0, calls = 0;
  const result = await fetcher.collect({ books: [book], ids: ['12'], get: async ({ url }) => { calls++; if (url === cover) { images++; return { status: 200, arrayBuffer: Buffer.from('image') }; } return { status: 200, text: '<rss/>' }; }, parse: async () => ({ '12': { cover, review_source_url: 'https://www.goodreads.com/review/show/1' } }), verify: async bytes => assert.equal(Buffer.from(bytes).toString(), 'image') });
  assert.equal(result.records['12'].cover, cover); assert.equal(images, 1); assert.equal(calls, 3); assert.deepEqual(result.warnings, []);
});
test('offline providers retain unresolved status and never manufacture a first search hit', async () => {
  const result = await fetcher.collect({ books: [book], ids: ['12'], get: async () => ({ status: 403, text: 'blocked' }), parse: async () => { throw new Error('must not parse'); } });
  assert.deepEqual(result.records, {}); assert.equal(result.warnings.length, 3);
  const candidates = await fetcher.candidates(book, { get: async () => ({ status: 200, text: JSON.stringify({ docs: [{ title: 'Mindset Workbook', author_name: ['Wrong Author'], cover_i: 2, key: '/works/OL2W' }] }) }) });
  assert.equal(candidates[0].exact, false);
});
test('cancel aborts outstanding lookup promptly without validating or applying late responses', async () => {
  const controller = new AbortController(); let complete, verified = 0;
  const pending = fetcher.collect({ books: [book], ids: ['12'], signal: controller.signal, get: () => new Promise(resolve => complete = resolve), parse: async () => ({}), verify: async () => verified++ });
  await new Promise(resolve => setImmediate(resolve)); controller.abort(); await assert.rejects(pending, /cancelled/); complete({ status: 200, text: '<rss/>' }); assert.equal(verified, 0);
});
test('corrupt image is unresolved and image URLs reject unexpected protocols/hosts', async () => {
  const result = await fetcher.collect({ books: [book], ids: ['12'], get: async ({ url }) => url === cover ? { status: 200, arrayBuffer: Buffer.from('not image') } : { status: 200, text: '<rss/>' }, parse: async () => ({ '12': { cover } }), verify: async () => { throw new Error('bad image'); } });
  assert.deepEqual(result.records, {}); assert.match(result.warnings[0], /bad image/);
  assert.equal(fetcher.coverURL('https://i.gr-assets.com@evil.example/images/a.jpg'), false); assert.equal(fetcher.coverURL('http://i.gr-assets.com/images/a.jpg'), false);
});
