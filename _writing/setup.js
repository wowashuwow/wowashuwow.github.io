'use strict';
// Run with Node on the Mac. Only this repository's .obsidian directory is changed.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
let config = path.join(root, '.obsidian');
const attachmentVersion = '0.12.1';
async function json(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n'); }
async function installWriter(target) {
  await fs.mkdir(target, { recursive: true });
  const modules = {};
  for (const name of ['publishing', 'preview', 'cleanup']) modules[name] = await fs.readFile(path.join(__dirname, 'lib', name + '.js'), 'utf8');
  let bundled = await fs.readFile(path.join(__dirname, 'main.js'), 'utf8');
  const wrap = source => `(() => { const module = { exports: {} };\n${source}\nreturn module.exports; })()`;
  modules.cleanup = modules.cleanup.replace("const core = require('./publishing');", '');
  modules.preview = modules.preview.replace("const core = require('./publishing');", '');
  bundled = bundled.replace("const core = require('./lib/publishing');", () => `const core = ${wrap(modules.publishing)};`)
    .replace("const { PreviewSession } = require('./lib/preview');", () => `const { PreviewSession } = ${wrap(modules.preview)};`)
    .replace("const cleanup = require('./lib/cleanup');", () => `const cleanup = ${wrap(modules.cleanup)};`);
  await fs.writeFile(path.join(target, 'main.js'), bundled);
  await fs.copyFile(path.join(__dirname, 'manifest.json'), path.join(target, 'manifest.json'));
}
async function main() {
  if (process.argv.includes('--refresh')) {
    await installWriter(path.join(config, 'plugins/site-writer'));
    console.log('Writing helper refreshed; settings and publication recovery records preserved. Reload the PublishDesk plugin in Obsidian.');
    return;
  }
  if (await fs.stat(config).catch(() => null)) throw new Error('This website already has Obsidian settings. Preserve them and review the setup before re-running; the existing vault was not overwritten.');
  const destination = config;
  config = await fs.mkdtemp(path.join(os.tmpdir(), 'website-obsidian-setup-'));
  const target = path.join(config, 'plugins/site-writer');
  await installWriter(target);
  const attachments = path.join(config, 'plugins/attachment-management');
  await fs.mkdir(attachments, { recursive: true });
  for (const file of ['main.js', 'manifest.json', 'styles.css']) {
    const response = await fetch(`https://github.com/trganda/obsidian-attachment-management/releases/download/${attachmentVersion}/${file}`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Attachment plugin download failed: ${response.status}`);
    await fs.writeFile(path.join(attachments, file), Buffer.from(await response.arrayBuffer()));
  }
  const attachPath = { attachmentRoot: 'images', saveAttE: 'inFolderBelow', attachmentPath: '${notename}', attachFormat: '${originalname}-${date}', type: 'GLOBAL' };
  await json(path.join(attachments, 'data.json'), {
    attachPath, dateFormat: 'YYYYMMDDHHmmssSSS', excludeExtensionPattern: '', autoRenameAttachment: false,
    excludedPaths: '_writing;_includes;_layouts;_sass;_site;docs', excludePathsArray: ['_writing', '_includes', '_layouts', '_sass', '_site', 'docs'],
    excludeSubpaths: true, originalNameStorage: {}, disableNotification: false,
    overridePath: { Drafts: { ...attachPath, attachmentRoot: 'Drafts/images', type: 'FOLDER' } }
  });
  const hidden = ['_includes', '_layouts', '_sass', '_data', '_pages', '_site', '_writing', 'docs', 'css', 'js', 'blog', 'vendor', 'README.md', 'index.md', '404.html', 'feed.xml', 'robots.txt', 'search.js'];
  await json(path.join(config, 'app.json'), {
    useMarkdownLinks: true, newLinkFormat: 'relative', alwaysUpdateLinks: true,
    newFileLocation: 'folder', newFileFolderPath: 'Drafts', attachmentFolderPath: 'Drafts/images',
    deleteUnlinkedAttachments: 'never', trashOption: 'system',
    showInlineTitle: false, userIgnoreFilters: hidden
  });
  await json(path.join(config, 'appearance.json'), { enabledCssSnippets: ['writing-view'] });
  await json(path.join(config, 'community-plugins.json'), ['attachment-management', 'site-writer']);
  await fs.mkdir(path.join(config, 'snippets'), { recursive: true });
  // Hide entire development-folder rows; CSS only changes the interface.
  const rules = hidden.map(p => `.nav-folder:has(> .nav-folder-title[data-path="${p}"]), .nav-file:has(> .nav-file-title[data-path="${p}"])`).join(',\n');
  await fs.writeFile(path.join(config, 'snippets/writing-view.css'), `${rules} { display: none; }\n`);
  await fs.rename(config, destination);
  await fs.mkdir(path.join(root, 'Drafts/images'), { recursive: true });
  console.log('Website vault configured. Open the website root as a vault in Obsidian and enable community plugins. Your personal vault was not changed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
