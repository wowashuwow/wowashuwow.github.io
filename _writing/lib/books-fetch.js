'use strict';
// Network-only adapter. No vault writes, UI, personal ratings, or publication work.
const PROFILE = '66848291';
const abort = signal => { if (signal?.aborted) throw new Error('Cover lookup cancelled.'); };
const normal = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\([^)]*\)/g, '').split(':')[0].replace(/[^a-z0-9]+/g, ' ').trim();
function coverURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash &&
      ((['i.gr-assets.com', 'images.gr-assets.com'].includes(url.hostname) && url.pathname.startsWith('/images/') && /\.(jpe?g|png|webp)$/i.test(url.pathname)) ||
       (url.hostname === 'covers.openlibrary.org' && /^\/b\/(id|isbn)\/[0-9Xx]+-[SML]\.jpg$/.test(url.pathname))) && !/nophoto|no_cover|default_book/i.test(value);
  } catch { return false; }
}
async function request(get, url, { signal, binary = false, timeout = 10000, attempts = 2 } = {}) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt++) {
    abort(signal);
    let timer, listener;
    try {
      const response = await Promise.race([
        Promise.resolve().then(() => get({ url, throw: false })),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Source timed out.')), timeout); }),
        new Promise((_, reject) => { listener = () => reject(new Error('Cover lookup cancelled.')); signal?.addEventListener('abort', listener, { once: true }); }),
      ]);
      abort(signal);
      if (response.status !== 200) {
        const error = new Error(`Source returned HTTP ${response.status}.`); error.retry = [429, 502, 503, 504].includes(response.status); throw error;
      }
      const data = binary ? response.arrayBuffer : response.text;
      const length = binary ? data?.byteLength : Buffer.byteLength(data || '', 'utf8');
      if (!data || length > 2_000_000) throw new Error('Source response is empty or too large.');
      return data;
    } catch (error) { last = error; if (signal?.aborted || error.retry === false || (error.retry !== true && !/timed out|network|fetch|ECONN/i.test(error.message))) break; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', listener); }
    if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw last;
}
async function candidates(book, options) {
  const { get, signal } = options;
  abort(signal);
  if (book.isbn) {
    try {
      const edition = JSON.parse(await request(get, `https://openlibrary.org/isbn/${encodeURIComponent(book.isbn)}.json`, { signal }));
      if (normal(edition.title) === normal(book.title) && /^\/books\/OL[0-9]+M$/.test(edition.key || '')) {
        const found = (edition.covers || []).filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 3);
        if (found.length) return found.map(id => ({ title: book.title, author: book.author, cover: `https://covers.openlibrary.org/b/id/${id}-L.jpg`, source: `https://openlibrary.org${edition.key}`, exact: true }));
      }
    } catch (error) { abort(signal); }
  }
  const query = new URLSearchParams({ title: normal(book.title), author: book.author, limit: '5', fields: 'key,title,author_name,cover_i' });
  const result = JSON.parse(await request(get, `https://openlibrary.org/search.json?${query}`, { signal }));
  return (Array.isArray(result.docs) ? result.docs : []).filter(item => Number.isSafeInteger(item.cover_i) && item.cover_i > 0 && /^\/works\/OL[0-9]+W$/.test(item.key || '')).map(item => ({
    title: item.title, author: (item.author_name || []).join(', '), cover: `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`, source: `https://openlibrary.org${item.key}`,
    exact: normal(item.title) === normal(book.title) && (item.author_name || []).some(name => normal(name) === normal(book.author)),
  }));
}
async function collect({ get, parse, books, ids, signal, progress = () => {}, verify = async () => {} }) {
  const warnings = [], records = {};
  const started = Date.now();
  const budgetAvailable = () => Date.now() - started < 60000;
  for (const shelf of ['read', 'currently-reading']) {
    let seen = new Set();
    for (let page = 1; page <= Math.min(6, Math.ceil(books.length / 100) + 1); page++) {
      abort(signal); if (!budgetAvailable()) { warnings.push('Lookup time limit reached. Retry unresolved covers later.'); break; } progress(`Fetching Goodreads ${shelf === 'read' ? 'reading history' : 'currently reading'}…`);
      try {
        const xml = await request(get, `https://www.goodreads.com/review/list_rss/${PROFILE}?shelf=${shelf}&per_page=100&page=${page}`, { signal });
        const current = await parse([xml]); abort(signal);
        const keys = Object.keys(current);
        if (!keys.length || keys.every(id => seen.has(id))) break;
        for (const id of keys) { seen.add(id); records[id] ||= current[id]; }
        if (keys.length < 100) break;
      } catch (error) { abort(signal); warnings.push(`Goodreads ${shelf}: ${error.message}`); break; }
    }
  }
  const verified = {};
  for (const id of ids) {
    abort(signal);
    if (!budgetAvailable()) { warnings.push('Lookup time limit reached. Retry unresolved covers later.'); break; }
    const book = books.find(book => book.id === id); if (!book) continue;
    let value = records[id];
    if (!value?.cover) {
      progress(`Finding a cover for ${book.title}…`);
      try {
        const matches = await candidates(book, { get, signal });
        const exact = matches.filter(item => item.exact);
        if (exact.length === 1 || (exact.length > 1 && book.isbn)) value = { ...value, cover: exact[0].cover, cover_source: exact[0].source };
      } catch (error) { abort(signal); warnings.push(`${book.title}: ${error.message}`); }
    }
    if (value?.cover && coverURL(value.cover)) {
      progress(`Checking the cover for ${book.title}…`);
      try {
        const bytes = await request(get, value.cover, { signal, binary: true });
        await verify(bytes); abort(signal); verified[id] = { ...value, cover_source: value.cover_source || book.source_url };
      } catch (error) { abort(signal); warnings.push(`${book.title}: ${error.message}`); if (value.review_source_url) verified[id] = { review_source_url: value.review_source_url }; }
    } else if (value?.review_source_url) verified[id] = value;
  }
  return { records: verified, warnings };
}
module.exports = { collect, candidates, request, coverURL, normal };
