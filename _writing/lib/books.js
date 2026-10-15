'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const core = require('./publishing');

async function privateDirectory(root) {
  let directory = await fs.realpath(root);
  for (const segment of ['Drafts', '.imports', 'goodreads']) {
    directory = path.join(directory, segment);
    try { await fs.mkdir(directory, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const entry = await fs.lstat(directory);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error('Books workspace must contain regular folders, not symlinks.');
  }
  return directory;
}
async function call(root, request) {
  const payload = JSON.stringify(request);
  // File-backed request avoids shell interpolation and stdin support differences.
  const directory = await privateDirectory(root);
  const temp = await fs.mkdtemp(path.join(directory, 'request-'));
  const input = path.join(temp, 'request.json');
  await fs.writeFile(input, payload, { mode: 0o600 });
  try {
    const bridge = "STDIN.reopen(ARGV.shift); load ARGV.shift";
    return JSON.parse(await core.run(root, 'bundle', ['exec', 'ruby', '-EUTF-8', '-e', bridge, input, path.join(root, '_writing/books/manage.rb')]));
  } catch (error) {
    throw new Error((error.stderr || error.message).trim());
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}
async function captureCsv(root, file) {
  if (!/\.csv$/i.test(file.name) || file.size > 16 * 1024 * 1024) throw new Error('Choose a Goodreads CSV export of at most 16 MB.');
  const directory = await privateDirectory(root);
  const temp = await fs.mkdtemp(path.join(directory, 'csv-'));
  const input = path.join(temp, 'export.csv');
  try { await fs.writeFile(input, Buffer.from(await file.arrayBuffer()), { mode: 0o600 }); }
  catch (error) { await fs.rm(temp, { recursive: true, force: true }); throw error; }
  return { file: input, cleanup: () => fs.rm(temp, { recursive: true, force: true }) };
}
async function build(plan, options = {}) {
  const temp = options.temp || await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'books-preview-')));
  const output = options.output || path.join(temp, 'site');
  const source = path.join(temp, 'source');
  try {
    // Every refresh starts from committed public files, then overlays only Books inputs.
    await fs.rm(source, { recursive: true, force: true });
    await fs.mkdir(source, { recursive: true });
    const archive = path.join(temp, 'public.tar');
    await core.git(plan.root, 'archive', '--format=tar', `--output=${archive}`, 'HEAD');
    await core.run(plan.root, 'tar', ['-xf', archive, '-C', source]);
    await fs.unlink(archive);
    for (const directory of ['Drafts', '_drafts', '.obsidian', '.trash', 'docs', '_writing']) await fs.rm(core.inside(source, directory), { recursive: true, force: true });
    const inputs = ['_data/books.yml', '_data/books-overrides.yml', '_data/settings.yml', '_pages/books.html', '_includes/book-entry.html', '_includes/book-selection.html', '_includes/main.scss', '_sass/4-layouts/_books.scss', 'js/books.js'];
    for (const file of inputs) {
      const data = await core.readRegular(plan.root, file);
      await fs.mkdir(path.dirname(core.inside(source, file)), { recursive: true });
      await fs.writeFile(core.inside(source, file), data);
    }
    for (const entry of await fs.readdir(core.inside(plan.root, 'images/books'), { withFileTypes: true })) {
      if (!entry.isFile() || !/^[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif|avif)$/i.test(entry.name)) continue;
      const file = `images/books/${entry.name}`;
      const data = await core.readRegular(plan.root, file);
      await fs.mkdir(path.dirname(core.inside(source, file)), { recursive: true });
      await fs.writeFile(core.inside(source, file), data);
    }
    await fs.writeFile(path.join(source, '_books-preview.yml'), 'website_preview: true\n');
    await core.run(plan.root, 'bundle', ['exec', 'ruby', '-EUTF-8', '-S', 'jekyll', 'build', '--safe', '--source', source, '--destination', output, '--config', `${source}/_config.yml,${source}/_books-preview.yml`]);
    await core.run(plan.root, 'bundle', ['exec', 'ruby', '-EUTF-8', '_writing/books/check.rb', output]);
    return { temp, output, url: '/bookshelf/', baseurl: '' };
  } catch (error) {
    if (!options.temp) await fs.rm(temp, { recursive: true, force: true });
    else await fs.rm(output, { recursive: true, force: true });
    throw new Error(`Books preview failed: ${(error.stderr || error.message).trim()}`);
  }
}
module.exports = { call, captureCsv, build };
