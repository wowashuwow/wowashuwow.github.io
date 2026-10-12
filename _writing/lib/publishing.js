'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const IMAGE = /\.(?:jpe?g|png|gif|webp|avif|svg|heic)$/i;
const PRIVATE = /^(?:Drafts|\.obsidian|\.trash)(?:\/|$)/;
const protectedFiles = new Set(['images/2026-8-23-the-guilt-of-fitness-fi.jpg']);

async function run(root, command, args, options = {}) {
  const env = { ...process.env, PATH: `${os.homedir()}/.rbenv/shims:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`, GIT_TERMINAL_PROMPT: '0' };
  const result = await exec(command, args, { cwd: root, env, maxBuffer: 20 * 1024 * 1024, ...options });
  return result.stdout;
}
const git = (root, ...args) => run(root, 'git', args);
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function inside(root, relative) {
  if (relative.includes('\0') || path.isAbsolute(relative)) throw new Error('Invalid file path.');
  const target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('File path leaves the website folder.');
  return target;
}
async function readRegular(root, relative) {
  const target = inside(root, relative);
  if ((await fs.realpath(target)) !== target || !(await fs.lstat(target)).isFile()) throw new Error(`Not a regular local file: ${relative}`);
  return fs.readFile(target);
}
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
function split(text, yaml) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('The post needs YAML properties at the top.');
  const meta = yaml.parse(match[1]);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('Invalid post properties.');
  return { meta, body: match[2] };
}
function combine(meta, body, yaml) { return `---\n${yaml.stringify(meta).trim()}\n---\n${body}`; }
function slug(title) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// No source file is changed while preparing or building a publication.
async function prepare(root, notePath, yaml, options = {}) {
  root = await fs.realpath(root);
  if (!/^(?:Drafts|_drafts|_posts)\/[^/]+\.md$/.test(notePath) || protectedFiles.has(notePath)) throw new Error('Select a draft or published blog post.');
  const name = path.basename(notePath, '.md');
  if (!notePath.startsWith('_drafts/') && !/^\d{4}-\d{1,2}-\d{1,2}-.+/.test(name)) throw new Error('Use a stable dated filename, such as 2026-10-12-my-post.md.');
  const original = await readRegular(root, notePath);
  const parsed = split(original.toString(), yaml);
  const meta = parsed.meta;
  const body = parsed.body.replace(/\n?<!-- site-writer content: [a-f0-9]{64} -->\n?/g, '');
  if (typeof meta.title !== 'string' || !meta.title.trim()) throw new Error('Add a title.');
  if (!options.preview && !body.trim()) throw new Error('The post has no writing yet.');
  if (meta.published === false && !options.preview && !options.publishUnpublished) throw new Error('This post is marked published: false. Confirm making it public before publishing.');
  if (options.preview || options.publishUnpublished) delete meta.published;
  if (meta.layout && meta.layout !== 'post') throw new Error('Blog posts must use layout: post.');
  meta.layout = 'post';
  if (meta.tags != null && (!Array.isArray(meta.tags) || meta.tags.some(t => typeof t !== 'string' || /\s/.test(t)))) throw new Error('Tags must be a list with no spaces; use Software-Review.');
  if (meta.primary_topic && !meta.tags?.includes(meta.primary_topic)) throw new Error('The primary_topic must be one of the assigned tags.');
  const code = [];
  const hideCode = value => { const token = `SITE_CODE_${code.length}_TOKEN`; code.push({ token, value }); return token; };
  let prose = body.replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g, hideCode).replace(/(`+)[^\n]*?\1/g, hideCode);
  // No Obsidian syntax translation: use Markdown shared by both editors.
  // Refuse hidden Obsidian comments rather than accidentally making them public.
  if (prose.includes('%%')) throw new Error('Obsidian %% comments are not supported on the website. Remove them or use HTML comments <!-- like this -->.');
  if (/(?<!\\)\[\[/.test(prose)) throw new Error('Use ordinary Markdown links and images, not [[wikilinks]]. For posts, use [Readable title](https://wowashuwow.com/blog/post-slug).');
  const draftDate = meta.date instanceof Date ? meta.date.toISOString().slice(0, 10) : String(meta.date || new Date().toISOString()).slice(0, 10);
  if (notePath.startsWith('_drafts/') && !/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) throw new Error('Use a YYYY-MM-DD date for this draft.');
  const target = `_posts/${notePath.startsWith('_drafts/') ? draftDate + '-' : ''}${name}.md`;
  if (notePath.startsWith('Drafts/') && await exists(inside(root, target))) throw new Error('A published post already has this filename. Choose another draft filename.');
  const tracked = new Set((await git(root, 'ls-files', '-z')).split('\0').filter(Boolean));
  const assets = new Map();
  const refs = new Set();
  const markers = [];
  const mark = raw => { const id = `SITE_IMAGE_${markers.length}_TOKEN`; markers.push({ id, raw }); return id; };
  // Handle inline Markdown images/links, reference definitions, and raw HTML images.
  // Liquid-based legacy paths remain for Jekyll to expand and are checked after the build.
  let converted = prose.replace(/(!?\[[^\]\n]*\]\(\s*)(<[^>\n]+>|[^\s)]+)([^)\n]*\))/g,
    (all, a, url, b) => url.includes('{{') ? all : `${a}${mark(url)}${b}`);
  converted = converted.replace(/^(\s*\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm, (all, a, url) => url.includes('{{') ? all : `${a}${mark(url)}`);
  converted = converted.replace(/((?:src|href)=["'])([^"']+)(["'])/g, (all, a, url, b) => url.includes('{{') ? all : `${a}${mark(url)}${b}`);
  async function resolve(raw, featured = false) {
    const angled = raw.startsWith('<') && raw.endsWith('>');
    const value = angled ? raw.slice(1, -1) : raw;
    if (/^(?:https?:|\/\/)/i.test(value)) return raw;
    if (/^[a-z]+:/i.test(value)) { if (featured) throw new Error('Featured images must be a local image or HTTPS URL.'); return raw; }
    const suffix = value.match(/[?#].*$/)?.[0] || '';
    let decoded;
    try { decoded = decodeURIComponent(value.slice(0, value.length - suffix.length)); } catch { throw new Error(`Invalid image URL: ${value}`); }
    if (!IMAGE.test(decoded)) {
      if (/\.md$/i.test(decoded)) throw new Error('Local note links do not work on the website. Replace the .md destination with the published page URL.');
      return raw;
    }
    if (/\.heic$/i.test(decoded)) throw new Error('Export HEIC photos as JPEG or WebP before adding them to the website.');
    const source = decoded.startsWith('/') ? path.posix.normalize(decoded.slice(1)) : path.posix.normalize(path.posix.join(path.posix.dirname(notePath), decoded));
    let destination;
    if (source.startsWith(`Drafts/images/${name}/`)) destination = source.replace(/^Drafts\//, '');
    else if (source.startsWith('images/') && (tracked.has(source) || source.startsWith(`images/${name}/`))) destination = source;
    else throw new Error(`Image is outside this post's allowed image folders: ${source}`);
    if (protectedFiles.has(source)) throw new Error('This image belongs to the existing protected draft.');
    const data = await readRegular(root, source);
    if (data.length > 25 * 1024 * 1024) throw new Error(`Image exceeds 25 MB; export a web-sized copy: ${source}`);
    if (source !== destination && await exists(inside(root, destination))) {
      if (digest(await readRegular(root, destination)) !== digest(data)) throw new Error(`A different image already exists at ${destination}.`);
    }
    if (options.validateImage) await options.validateImage(data, source);
    assets.set(destination, { source, data });
    refs.add(destination);
    const url = (featured ? '/' : '../') + destination.split('/').map(encodeURIComponent).join('/') + suffix;
    return angled ? `<${url}>` : url;
  }
  for (const item of markers) {
    const resolved = await resolve(item.raw);
    converted = converted.replace(item.id, () => resolved);
  }
  for (const item of code) converted = converted.replace(item.token, () => item.value);
  const imageProperty = options.imageProperty || 'image';
  if (meta[imageProperty]) {
    if (typeof meta[imageProperty] !== 'string') throw new Error('image must be a single file path or URL.');
    meta[imageProperty] = await resolve(meta[imageProperty], true);
    if (!/^https?:\/\/|^\/images\//.test(meta[imageProperty])) throw new Error('Select a valid featured image.');
  } else delete meta[imageProperty];
  if (!options.preview && !converted.trim()) throw new Error('The post has no visible writing yet.');
  const base = combine(meta, converted, yaml);
  const fingerprint = digest(base);
  const text = `${base.trimEnd()}\n\n<!-- site-writer content: ${fingerprint} -->\n`;
  return { unpublished: parsed.meta.published === false || options.publishUnpublished, root, notePath, target, name, title: meta.title, text, original, assets, refs, yaml, fingerprint };
}

async function build(plan, options = {}) {
  const head = (await git(plan.root, 'rev-parse', 'HEAD')).trim();
  const temp = options.temp || await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'wowashuwow-preview-')));
  try {
  const source = path.join(temp, 'source');
  const output = options.output || path.join(temp, 'site');
  if (!options.temp) {
  await fs.mkdir(source);
  // The committed website plus this selected post: unrelated edits cannot invalidate
  // the build or sneak into the preview/publication.
  const archive = path.join(temp, 'website.tar');
  await git(plan.root, 'archive', '--format=tar', `--output=${archive}`, 'HEAD');
  await run(plan.root, 'tar', ['-xf', archive, '-C', source]);
  await fs.unlink(archive);
  }
  for (const relative of ['Drafts', '_drafts', '.obsidian', '.trash', ...protectedFiles]) await fs.rm(inside(source, relative), { recursive: true, force: true });
  if (options.preview) {
    for (const relative of ['_includes/head.html', '_layouts/default.html', '_layouts/post.html', 'css/site.scss']) {
      const file = inside(plan.root, relative);
      if (await exists(file)) { await fs.mkdir(path.dirname(inside(source, relative)), { recursive: true }); await fs.copyFile(file, inside(source, relative)); }
    }
    // The selected private draft may have an explicit historical exclusion.
    // Adjust only the isolated copy, so inspection and rendering agree while
    // the actual website configuration continues to protect unpublished files.
    const allowSelected = "require 'yaml'; file=ARGV[0]; config=YAML.load_file(file); config['exclude']=Array(config['exclude']).reject { |entry| entry.to_s.sub(%r{\\A\\./}, '') == ARGV[1] }; File.write(file, YAML.dump(config))";
    await run(plan.root, 'bundle', ['exec', 'ruby', '-EUTF-8', '-e', allowSelected, inside(source, '_config.yml'), plan.target]);
    await fs.writeFile(inside(source, '_config.preview.yml'), 'website_preview: true\n');
  }
  await fs.mkdir(path.join(source, '_posts'), { recursive: true });
  await fs.writeFile(inside(source, plan.target), plan.text);
  for (const [relative, asset] of plan.assets) {
    const dest = inside(source, relative); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, asset.data);
  }
  const inspect = `require 'jekyll'; require 'json'; site = Jekyll::Site.new(Jekyll.configuration({'source'=>ARGV[0], 'destination'=>ARGV[1], 'quiet'=>true})); site.read; post = site.posts.docs.find { |d| File.basename(d.path) == ARGV[2] }; abort 'Selected post was not read by Jekyll' unless post; collisions = (site.posts.docs + site.pages).reject { |d| d.equal?(post) }.select { |d| d.destination(ARGV[1]) == post.destination(ARGV[1]) }; abort 'This post URL collides with an existing page or post' unless collisions.empty?; puts JSON.generate({'article'=>post.destination(ARGV[1]).delete_prefix(ARGV[1] + '/'), 'url'=>site.baseurl.to_s + post.url, 'baseurl'=>site.baseurl.to_s})`;
  // Desktop apps may inherit an ASCII locale instead of the terminal's UTF-8
  // locale. Set Ruby's encoding at startup for both inspection and Sass rendering.
  const metadata = JSON.parse((await run(plan.root, 'bundle', ['exec', 'ruby', '-EUTF-8', '-e', inspect, source, output, path.basename(plan.target)])).trim());
  await run(plan.root, 'bundle', ['exec', 'ruby', '-EUTF-8', '-S', 'jekyll', 'build', '--safe', '--source', source, '--destination', output, ...(options.preview ? ['--config', path.join(source, '_config.yml') + ',' + path.join(source, '_config.preview.yml')] : [])]);
  const generated = await walk(output);
  if (generated.some(file => /^(?:Drafts|\.obsidian|_writing)\//.test(file))) throw new Error('A private writing folder appeared in the website build.');
  const article = metadata.article;
  for (const file of generated.filter(f => f.endsWith('.html'))) {
    const html = await fs.readFile(inside(output, file), 'utf8');
    // All emitted references to local images must resolve, including legacy Liquid paths and metadata.
    for (const match of html.matchAll(/(?:src|data-src|href|content)=["']([^"']+)["']/g)) {
      const url = match[1].replace(/&amp;/g, '&');
      let pathname;
      try {
        const parsed = new URL(url, 'https://wowashuwow.com/' + file);
        if (parsed.origin !== 'https://wowashuwow.com') continue;
        pathname = decodeURIComponent(parsed.pathname);
      } catch { continue; }
      if (!pathname.startsWith('/images/') || !IMAGE.test(pathname)) continue;
      if (!(await exists(inside(output, pathname.slice(1))))) throw new Error(`Broken image in ${file}: ${pathname}`);
    }
  }
  if (!generated.includes(article)) throw new Error('The selected article was not generated. Check its date, permalink and published properties.');
  return { temp, output, article, url: metadata.url, baseurl: metadata.baseurl, head };
  } catch (error) {
    if (!options.temp) await fs.rm(temp, { recursive: true, force: true });
    else if (options.output) await fs.rm(options.output, { recursive: true, force: true });
    throw new Error(`Website validation failed: ${error.stderr || error.message}`);
  }
}
async function walk(root, prefix = '') {
  let files = [];
  for (const entry of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    const rel = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, rel)); else files.push(rel);
  }
  return files;
}

async function preflight(root, remote = 'newtheme', branch = 'newtheme') {
  if ((await git(root, 'branch', '--show-current')).trim() !== branch) throw new Error(`Publishing is disabled on this development branch. Finish the setup release and switch to ${branch} first.`);
  if ((await git(root, 'diff', '--cached', '--name-only')).trim()) throw new Error('Other files are already staged in Git. Commit or unstage them before publishing.');
  await git(root, 'fetch', remote, branch);
  const head = (await git(root, 'rev-parse', 'HEAD')).trim();
  if (head !== (await git(root, 'rev-parse', 'FETCH_HEAD')).trim()) throw new Error('Your branch and GitHub differ. Resolve incoming or unpushed commits before publishing; nothing was uploaded.');
  return head;
}

async function publish(plan, options = {}) {
  const remote = options.remote || 'newtheme'; const branch = options.branch || 'newtheme';
  const before = await preflight(plan.root, remote, branch);
  const checked = options.checked || await build(plan);
  if (checked.head && checked.head !== before) throw new Error('The website changed after the preview was built. Preview/publish again.');
  if (digest(await readRegular(plan.root, plan.notePath)) !== digest(plan.original)) throw new Error('The note changed after validation. Preview/publish it again.');
  for (const asset of plan.assets.values()) if (digest(await readRegular(plan.root, asset.source)) !== digest(asset.data)) throw new Error('An image changed after validation. Preview/publish again.');
  // Use a temporary Git index: unrelated working-tree edits are never staged or committed.
  const indexDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wowashuwow-index-'));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(indexDir, 'index'), GIT_TERMINAL_PROMPT: '0' };
  const backups = new Map();
  const whitelist = [plan.target, ...plan.assets.keys()];
  let committed = false;
  try {
    for (const relative of whitelist) {
      const file = inside(plan.root, relative);
      backups.set(relative, await exists(file) ? await fs.readFile(file) : null);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, relative === plan.target ? plan.text : plan.assets.get(relative).data);
    }
    await run(plan.root, 'git', ['read-tree', before], { env });
    await run(plan.root, 'git', ['add', '--', ...whitelist], { env });
    const changed = (await run(plan.root, 'git', ['diff', '--cached', '--name-only', '-z'], { env })).split('\0').filter(Boolean);
    if (changed.some(f => !whitelist.includes(f))) throw new Error('Unexpected file in publication commit.');
    if (!changed.length) return { unchanged: true, url: checked.url };
    const tree = (await run(plan.root, 'git', ['write-tree'], { env })).trim();
    const commit = (await git(plan.root, 'commit-tree', tree, '-p', before, '-m', `Publish: ${plan.title}`)).trim();
    await git(plan.root, 'update-ref', `refs/heads/${branch}`, commit, before);
    committed = true;
    // Refresh only our paths in the normal index; preserve all unrelated working-tree edits.
    await git(plan.root, 'reset', '--quiet', 'HEAD', '--', ...whitelist);
    const state = { commit, before, branch, remote, target: plan.target, url: checked.url, fingerprint: plan.fingerprint, phase: 'committed' };
    const statePath = path.join(plan.root, '.obsidian', 'plugins', 'site-writer', 'publication.json');
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    // Retain authoring syntax/comments privately, including revisions of published posts.
    {
      const archive = path.join(plan.root, 'Drafts', '.published-backups');
      await fs.mkdir(archive, { recursive: true });
      await fs.writeFile(path.join(archive, `${Date.now()}-${path.basename(plan.notePath)}`), plan.original);
      if (/^(Drafts|_drafts)\//.test(plan.notePath)) await fs.unlink(inside(plan.root, plan.notePath));
    }
    try { await git(plan.root, 'push', remote, `HEAD:refs/heads/${branch}`); }
    catch (error) { throw new Error(`The post was committed locally but upload failed. Use Retry upload; don't create another post. ${error.stderr || error.message}`); }
    state.phase = 'uploaded'; await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    return state;
  } catch (error) {
    if (!committed) for (const [relative, data] of backups) {
      if (data === null) await fs.unlink(inside(plan.root, relative)).catch(() => {}); else await fs.writeFile(inside(plan.root, relative), data);
    }
    throw error;
  } finally { await fs.rm(indexDir, { recursive: true, force: true }); }
}

async function retry(root) {
  const file = path.join(root, '.obsidian/plugins/site-writer/publication.json');
  const state = JSON.parse(await fs.readFile(file, 'utf8'));
  if ((await git(root, 'rev-parse', 'HEAD')).trim() !== state.commit || (await git(root, 'branch', '--show-current')).trim() !== state.branch) throw new Error('Git changed since this publication. Review it before retrying.');
  await git(root, 'push', state.remote, `HEAD:refs/heads/${state.branch}`);
  state.phase = 'uploaded'; await fs.writeFile(file, JSON.stringify(state, null, 2)); return state;
}
module.exports = { readRegular, prepare, build, publish, preflight, retry, run, git, slug, split, combine, walk, inside, exists };
