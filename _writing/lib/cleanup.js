'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('./publishing');
const TEXT = /\.(?:md|markdown|txt|html?|css|s[ac]ss|less|js|[cm]js|ts|tsx|jsx|json|ya?ml|xml|svg|csv|canvas|base|liquid|drawio)$/i;
const SKIP = new Set(['.git', '.obsidian', '.trash', '_site', 'vendor', 'node_modules', '.jekyll-cache', '.sass-cache']);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function normal(text) {
  // Broad filename matching deliberately preserves doubtful/shared assets.
  return text.replace(/&#(x[a-f0-9]+|[0-9]+);/gi, (all, value) => { const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all; }).replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/(?:%[a-f0-9]{2})+/gi, value => { try { return decodeURIComponent(value); } catch { return value; } }).normalize('NFC').toLowerCase();
}
async function inventory(root, prefix = '') {
  let files = [];
  for (const entry of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(root, relative));
    else files.push(relative);
  }
  return files.sort();
}
async function planCleanup(root, notePath, { allowMissing = false } = {}) {
  root = await fs.realpath(root);
  if (!/^Drafts\/[^/]+\.md$/.test(notePath)) throw new Error('Cleanup only handles private notes directly inside Drafts. Published posts are never deleted by this command.');
  const name = path.posix.basename(notePath, '.md');
  const folder = `Drafts/images/${name}`;
  const noteExists = await core.exists(core.inside(root, notePath));
  if (!noteExists && !allowMissing) throw new Error('This draft no longer exists. Use Clean up leftover draft images.');
  if (allowMissing && noteExists) throw new Error('The draft still exists. Use Delete current draft and unused images.');
  if (allowMissing && await core.exists(core.inside(root, `_posts/${name}.md`))) throw new Error('This folder belongs to a published post’s private recovery files. It will be preserved.');
  if (noteExists) await core.readRegular(root, notePath);
  const folderPath = core.inside(root, folder);
  if (await core.exists(folderPath) && (await fs.realpath(folderPath)) !== folderPath) throw new Error('The image folder is a symbolic link; cleanup refused.');
  const files = await inventory(root);
  const candidates = files.filter(file => file.startsWith(folder + '/'));
  const tracked = new Set((await core.git(root, 'ls-files', '-z', '--', notePath, folder)).split('\0'));
  if (tracked.has(notePath)) throw new Error('This draft is tracked by Git. Cleanup refused; review it separately.');
  const texts = [], snapshot = [];
  for (const file of files) {
    if (file === notePath || TEXT.test(file)) {
      const bytes = await core.readRegular(root, file);
      texts.push({ path: file, text: normal(bytes.toString()) });
      snapshot.push([file, hash(bytes)]);
    }
  }
  const remove = [], keep = [];
  for (const file of candidates) {
    const full = core.inside(root, file);
    const stat = await fs.lstat(full);
    snapshot.push([file, stat.size, stat.mtimeMs]);
    if (!stat.isFile() || (await fs.realpath(full)) !== full) { keep.push({ path: file, reason: 'Symbolic link or unsupported file' }); continue; }
    snapshot.push([file, hash(await core.readRegular(root, file))]);
    const basename = normal(path.posix.basename(file));
    const reference = texts.find(other => other.path !== notePath && other.path !== file && other.text.includes(basename));
    if (tracked.has(file)) keep.push({ path: file, reason: 'Tracked by Git' });
    else if (reference) keep.push({ path: file, reason: `Possibly used by ${reference.path}` });
    else remove.push(file);
  }
  return { notePath: noteExists ? notePath : null, folder, remove, keep, signature: hash(JSON.stringify(snapshot)) };
}
async function executeCleanup(app, root, expected, { beforeDelete = async () => {} } = {}) {
  root = await fs.realpath(root);
  const source = expected.notePath || `Drafts/${path.posix.basename(expected.folder)}.md`;
  const options = { allowMissing: !expected.notePath };
  const current = await planCleanup(root, source, options);
  if (current.signature !== expected.signature || JSON.stringify(current.remove) !== JSON.stringify(expected.remove)) throw new Error('Files changed while the cleanup dialog was open. Review cleanup again. Nothing was deleted.');
  await beforeDelete();
  const ready = await planCleanup(root, source, options);
  if (ready.signature !== expected.signature) throw new Error('Files changed before cleanup started. Review again. Nothing was deleted.');
  if (expected.notePath) {
    const file = app.vault.getAbstractFileByPath(expected.notePath);
    if (!file) throw new Error('The selected draft disappeared. Review cleanup again.');
    await app.vault.trash(file, true);
  }
  let removed = 0;
  for (const relative of expected.remove) {
    // Recheck references before each image, including edits made during cleanup.
    const latest = await planCleanup(root, source, { allowMissing: true });
    if (!latest.remove.includes(relative)) continue;
    const file = app.vault.getAbstractFileByPath(relative);
    if (file) { await app.vault.trash(file, true); removed++; }
  }
  // Empty directories only: never recursively trash a folder with retained files.
  async function emptyFolders(relative) {
    const full = core.inside(root, relative);
    if (!await core.exists(full) || (await fs.realpath(full)) !== full) return;
    for (const entry of await fs.readdir(full, { withFileTypes: true })) if (entry.isDirectory()) await emptyFolders(path.posix.join(relative, entry.name));
    const file = app.vault.getAbstractFileByPath(relative);
    if (file && !(await fs.readdir(full)).length) await app.vault.trash(file, true);
  }
  await emptyFolders(expected.folder);
  return { removed, preserved: expected.remove.length - removed + expected.keep.length };
}
module.exports = { planCleanup, executeCleanup };
