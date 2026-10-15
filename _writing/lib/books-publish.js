'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('./publishing');
const books = require('./books');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const RECORD = '_data/books-publication.json';
const STATE = '.obsidian/plugins/site-writer/publication.json';
async function state(root) { try { return JSON.parse(await core.readRegular(root, STATE)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function saveState(root, value) {
  const file = core.inside(root, STATE); await fs.mkdir(path.dirname(file), { recursive: true });
  const directory = await fs.mkdtemp(path.join(path.dirname(file), '.books-state-'));
  const temp = path.join(directory, 'state.json');
  try {
    const handle = await fs.open(temp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(value, null, 2)); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temp, file);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function noPending(root) {
  const current = await state(root);
  if (current && ['prepared', 'committed'].includes(current.phase)) throw new Error('A publication has not finished uploading. Use Retry the last failed upload before publishing again.');
}
async function previous(root, head, file) {
  try { return await core.git(root, 'show', `${head}:${file}`); } catch { return null; }
}
function summary(beforeBooks, beforeSettings, currentBooks, currentSettings) {
  const old = new Map(beforeBooks.map(book => [book.id, book]));
  const current = new Map(currentBooks.map(book => [book.id, book]));
  const result = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const book of currentBooks) {
    if (!old.has(book.id)) result.push(`Add: ${book.title}`);
    else if (!same(old.get(book.id), book)) result.push(`Update imported details: ${book.title}`);
    if (!same(beforeSettings[book.id] || {}, currentSettings[book.id] || {})) {
      const fields = [...new Set([...Object.keys(beforeSettings[book.id] || {}), ...Object.keys(currentSettings[book.id] || {})])].filter(key => !same(beforeSettings[book.id]?.[key], currentSettings[book.id]?.[key])).map(key => ({ recommended: 'recommendation', recommendation_order: 'recommendation order', recommendation_blurb: 'blurb', currently_reading_hidden: 'current visibility', currently_reading_order: 'current order', history_hidden: 'history visibility', cover: 'cover', cover_disabled: 'cover preference', cover_origin: 'cover source', cover_source: 'cover source', posts: 'blog links', review_date: 'review date', review_source_url: 'review source', review_fingerprint: 'date confirmation' })[key] || key);
      result.push(`Website choices: ${book.title} — ${[...new Set(fields)].join(', ')}`);
    }
  }
  for (const book of beforeBooks) if (!current.has(book.id)) result.push(`Remove from imported library: ${book.title}`);
  for (const id of Object.keys(currentSettings)) if (!current.has(id) && !same(currentSettings[id], beforeSettings[id])) result.push(`Update retained choices for missing book ID ${id}`);
  return result;
}
async function prepare(root, yaml) {
  await noPending(root);
  const head = (await core.git(root, 'rev-parse', 'HEAD')).trim();
  const library = await books.call(root, { mode: 'read' });
  const files = new Map();
  for (const file of ['_data/books.yml', '_data/books-overrides.yml']) files.set(file, await core.readRegular(root, file));
  for (const preferences of Object.values(library.overrides)) {
    if (!preferences.cover?.startsWith('/images/')) continue;
    const file = preferences.cover.slice(1); files.set(file, await core.readRegular(root, file));
  }
  const fingerprint = digest(Buffer.from(JSON.stringify([...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, data]) => [file, digest(data)]))));
  files.set(RECORD, Buffer.from(JSON.stringify({ fingerprint }) + '\n'));
  const originalRecord = await core.exists(core.inside(root, RECORD)) ? await core.readRegular(root, RECORD) : null;
  const committedPage = await previous(root, head, '_pages/books.html');
  const ready = !!committedPage?.includes('publishdesk-books:');
  const beforeBooks = yaml.parse(await previous(root, head, '_data/books.yml') || '[]') || [];
  const beforeSettings = yaml.parse(await previous(root, head, '_data/books-overrides.yml') || '{}') || {};
  const changed = [];
  for (const [file, bytes] of files) {
    const blob = await previous(root, head, file);
    // Covers are binary: compare Git blob IDs, not UTF-8 decoding.
    if (file.startsWith('images/')) {
      const expected = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
      let actual; try { actual = (await core.git(root, 'rev-parse', `${head}:${file}`)).trim(); } catch {}
      if (actual !== expected) changed.push(file);
    } else if (blob === null || !bytes.equals(Buffer.from(blob))) changed.push(file);
  }
  if ((await core.git(root, 'rev-parse', 'HEAD')).trim() !== head) throw new Error('Git changed while preparing Bookshelf. Review again.');
  if ((await books.call(root, { mode: 'read' })).token !== library.token) throw new Error('Books changed while preparing publication. Review again.');
  return { root, head, files, changed, originalRecord, fingerprint, ready, url: '/bookshelf/', summary: summary(beforeBooks, beforeSettings, library.books, library.overrides), branch: (await core.git(root, 'branch', '--show-current')).trim() };
}
async function unchangedInputs(plan) {
  for (const [file, data] of plan.files) {
    if (file === RECORD) continue;
    if (!data.equals(await core.readRegular(plan.root, file))) throw new Error('Bookshelf data or cover changed after review. Review/publish again.');
  }
  const record = await core.exists(core.inside(plan.root, RECORD)) ? await core.readRegular(plan.root, RECORD) : null;
  if ((record === null) !== (plan.originalRecord === null) || (record && !record.equals(plan.originalRecord))) throw new Error('Bookshelf publication record changed. Review again.');
}
async function publish(plan, { checked, note = '', remote = 'newtheme', branch = 'newtheme' } = {}) {
  if (!plan.ready) throw new Error('Release the Bookshelf page setup before publishing content-only changes. Nothing was uploaded.');
  if (!checked || checked.fingerprint !== plan.fingerprint || checked.head !== plan.head) throw new Error('Build and check this exact Bookshelf snapshot before publishing.');
  if (typeof note !== 'string' || note.includes('\0')) throw new Error('Publication note must be ordinary text.');
  await noPending(plan.root);
  const before = await core.preflight(plan.root, remote, branch);
  if (before !== plan.head) throw new Error('The website changed after Bookshelf was checked. Review again.');
  await unchangedInputs(plan);
  if (!plan.changed.length) return { unchanged: true, url: plan.url };
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'books-publication-index-'));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(temp, 'index') };
  try {
    await core.run(plan.root, 'git', ['read-tree', before], { env });
    let index = 0;
    for (const [file, data] of plan.files) {
      const input = path.join(temp, String(index++)); await fs.writeFile(input, data);
      const blob = (await core.git(plan.root, 'hash-object', '-w', '--no-filters', input)).trim();
      await core.run(plan.root, 'git', ['update-index', '--add', '--cacheinfo', '100644', blob, file], { env });
    }
    const changed = (await core.run(plan.root, 'git', ['diff', '--cached', '--name-only', '-z'], { env })).split('\0').filter(Boolean);
    if (changed.some(file => !plan.files.has(file))) throw new Error('Unexpected file in Bookshelf commit.');
    if (!changed.length) return { unchanged: true, url: plan.url };
    const tree = (await core.run(plan.root, 'git', ['write-tree'], { env })).trim();
    const message = 'Update Bookshelf' + (note.trim() ? '\n\n' + note.trim().replace(/\r\n?/g, '\n') : '');
    const commit = (await core.git(plan.root, 'commit-tree', tree, '-p', before, '-m', message)).trim();
    await unchangedInputs(plan);
    if ((await core.git(plan.root, 'diff', '--cached', '--name-only')).trim()) throw new Error('Files were staged while publishing. Nothing was committed.');
    const intent = { kind: 'books', phase: 'prepared', commit, before, branch, remote, url: plan.url, fingerprint: plan.fingerprint, files: changed, manifest: plan.files.get(RECORD).toString() };
    await saveState(plan.root, intent); // durable before the compare-and-swap
    await core.git(plan.root, 'update-ref', `refs/heads/${branch}`, commit, before);
    intent.phase = 'committed'; await saveState(plan.root, intent);
    await finishLocal(plan.root, intent);
    return await upload(plan.root, intent);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}
async function finishLocal(root, intent) {
  const file = core.inside(root, RECORD);
  // This generated record never stores a user's editorial content.
  if (!await core.exists(file)) await fs.writeFile(file, intent.manifest, { flag: 'wx' });
  else {
    const current = await fs.readFile(file, 'utf8');
    const before = await previous(root, intent.before, RECORD);
    if (current === before || current === intent.manifest) await fs.writeFile(file, intent.manifest);
  }
  await core.git(root, 'reset', '--quiet', 'HEAD', '--', ...intent.files);
}
async function upload(root, intent) {
  try { await core.git(root, 'push', intent.remote, `${intent.commit}:refs/heads/${intent.branch}`); }
  catch (error) { throw new Error(`Bookshelf was committed locally but upload is not confirmed. Use Retry the last failed upload. ${error.stderr || error.message}`); }
  intent.phase = 'uploaded'; await saveState(root, intent); return intent;
}
async function retry(root) {
  const intent = await state(root);
  if (!intent || intent.kind !== 'books' || !['prepared', 'committed', 'uploaded'].includes(intent.phase)) throw new Error('No recoverable Bookshelf upload was found.');
  const head = (await core.git(root, 'rev-parse', 'HEAD')).trim();
  if ((await core.git(root, 'branch', '--show-current')).trim() !== intent.branch) throw new Error('Switch back to the publication branch before retrying.');
  if (head === intent.before && intent.phase === 'prepared') {
    if ((await core.git(root, 'diff', '--cached', '--name-only')).trim()) throw new Error('Unstage other files before retrying.');
    await core.git(root, 'update-ref', `refs/heads/${intent.branch}`, intent.commit, intent.before);
  } else if (head !== intent.commit) throw new Error('Git changed since this publication. Review the history before retrying.');
  intent.phase = 'committed'; await saveState(root, intent); await finishLocal(root, intent);
  return upload(root, intent);
}
function publicationStatus(intent, live, runs) {
  if (live?.status === 200 && live.text?.includes(`publishdesk-books: ${intent.fingerprint}`)) return { status: 'live', message: 'Bookshelf content is confirmed live.' };
  const run = runs?.workflow_runs?.find(item => item.name === 'pages build and deployment' && item.head_sha === intent.commit);
  if (!run || run.status !== 'completed' || run.conclusion === 'cancelled') return { status: 'pending', message: 'Bookshelf is not confirmed live yet. A deployment may be pending or superseded. Check the last publication again shortly.', url: run?.html_url };
  if (run.conclusion !== 'success') return { status: 'failed', message: `GitHub Pages deployment ${run.conclusion}. Bookshelf is not confirmed live.`, url: run.html_url };
  return { status: 'pending', message: 'Deployment succeeded, but the expected Bookshelf content is not available yet. Check again shortly.', url: run.html_url };
}
module.exports = { prepare, publish, retry, noPending, state, summary, unchangedInputs, publicationStatus };
