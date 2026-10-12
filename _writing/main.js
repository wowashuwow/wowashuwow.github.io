'use strict';
const { Plugin, Modal, Setting, Notice, parseYaml, stringifyYaml, TFile } = require('obsidian');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
const core = require('./lib/publishing');
const YAML = { parse: parseYaml, stringify: stringifyYaml };

class Ask extends Modal {
  constructor(app, title, label) { super(app); this.title = title; this.label = label; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    this.contentEl.createEl('h2', { text: this.title });
    let value = '';
    new Setting(this.contentEl).setName(this.label).addText(input => { input.onChange(v => value = v); setTimeout(() => input.inputEl.focus(), 0); });
    new Setting(this.contentEl).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Create draft').setCta().onClick(() => { if (value.trim()) { this.resolve(value.trim()); this.close(); } }));
  }
  onClose() { this.resolve?.(null); this.contentEl.empty(); }
}
class Confirm extends Modal {
  constructor(app, plan) { super(app); this.plan = plan; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    this.contentEl.createEl('h2', { text: 'Publish this post?' });
    this.contentEl.createEl('p', { text: this.plan.title });
    this.contentEl.createEl('p', { text: 'This uploads the following files to your public website. Other drafts stay private.' });
    const list = this.contentEl.createEl('ul');
    for (const file of [this.plan.target, ...this.plan.assets.keys()]) list.createEl('li', { text: file });
    new Setting(this.contentEl).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Publish').setCta().onClick(() => { this.resolve(true); this.close(); }));
  }
  onClose() { this.resolve?.(false); this.contentEl.empty(); }
}
class ImageChoice extends Modal {
  constructor(app, files) { super(app); this.files = files; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    this.contentEl.createEl('h2', { text: 'Choose a featured image (optional)' });
    new Setting(this.contentEl).setName('No featured image').addButton(b => b.setButtonText('Remove image').onClick(() => { this.resolve(''); this.close(); }));
    for (const file of this.files) new Setting(this.contentEl).setName(file.name).addButton(b => b.setButtonText('Choose').onClick(() => { this.resolve(file.path); this.close(); }));
  }
  onClose() { this.resolve?.(null); this.contentEl.empty(); }
}

module.exports = class WebsiteWriter extends Plugin {
  async onload() {
    this.root = this.app.vault.adapter.getBasePath();
    this.busy = false;
    const commands = [
      ['new-draft', 'New blog draft', () => this.newDraft()],
      ['preview', 'Preview current post on the website', () => this.preview()],
      ['featured-image', 'Choose featured image for current post', () => this.featured()],
      ['publish', 'Publish current post / publish changes', () => this.publish()],
      ['retry-upload', 'Retry the last failed upload', () => this.retry()],
      ['publication-status', 'Check the last publication', () => this.status()],
    ];
    for (const [id, name, action] of commands) this.addCommand({ id, name, callback: () => this.guard(action) });
    this.addRibbonIcon('pen-line', 'New blog draft', () => this.guard(() => this.newDraft()));
    this.addRibbonIcon('eye', 'Preview current post', () => this.guard(() => this.preview()));
  }
  async guard(action) {
    if (this.busy) return new Notice('A writing action is already running.');
    this.busy = true;
    try { await action(); } catch (error) { new Notice(error.message, 20000); console.error('Website writing:', error); }
    finally { this.busy = false; }
  }
  async current() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || !/^(Drafts|_posts)\/[^/]+\.md$/.test(file.path)) throw new Error('Open a blog draft or post first.');
    // Flush the editor before validating files on disk.
    const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
    if (view?.save) await view.save();
    return file;
  }
  async newDraft() {
    const title = await new Ask(this.app, 'New blog draft', 'Title').result();
    if (!title) return;
    const slug = core.slug(title); if (!slug) throw new Error('Use a title containing letters or numbers.');
    const date = window.moment().format('YYYY-MM-DD');
    const name = `${date}-${slug}`;
    const filePath = `Drafts/${name}.md`;
    if (this.app.vault.getAbstractFileByPath(filePath) || this.app.vault.getAbstractFileByPath(`_posts/${name}.md`)) throw new Error('A draft or post with this filename already exists.');
    if (!this.app.vault.getAbstractFileByPath('Drafts')) await this.app.vault.createFolder('Drafts');
    const text = core.combine({ layout: 'post', title, date, description: '', tags: [] }, '\n', YAML);
    const file = await this.app.vault.create(filePath, text);
    await this.app.workspace.getLeaf(false).openFile(file);
    new Notice('Private draft created. Saving does not upload it.');
  }
  async featured() {
    const note = await this.current();
    const prefix = note.path.startsWith('Drafts/') ? `Drafts/images/${note.basename}/` : `images/${note.basename}/`;
    const files = this.app.vault.getFiles().filter(f => f.path.startsWith(prefix) && /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(f.path));
    const chosen = await new ImageChoice(this.app, files).result();
    if (chosen === null) return;
    await this.app.fileManager.processFrontMatter(note, meta => {
      if (!chosen) delete meta.image;
      else meta.image = note.path.startsWith('Drafts/') ? chosen.replace(/^Drafts\//, '') : '/' + chosen;
    });
    new Notice(chosen ? 'Featured image selected.' : 'The post will have no featured image.');
  }
  async preview() {
    const note = await this.current();
    new Notice('Building a private local preview…');
    const plan = await core.prepare(this.root, note.path, YAML);
    const built = await core.build(plan);
    await this.closePreview();
    this.previewTemp = built.temp;
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };
    this.server = http.createServer(async (req, res) => {
      try {
        let relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
        if (relative.endsWith('/')) relative += 'index.html';
        let file = core.inside(built.output, relative);
        if (!(await core.exists(file)) && !path.extname(file)) file += '.html';
        const data = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    await new Promise((resolve, reject) => { this.server.once('error', reject); this.server.listen(0, '127.0.0.1', resolve); });
    window.open(`http://127.0.0.1:${this.server.address().port}${built.url}`);
    new Notice('Local preview opened. Nothing was uploaded.');
  }
  async publish() {
    const note = await this.current();
    await core.preflight(this.root);
    const plan = await core.prepare(this.root, note.path, YAML);
    new Notice('Checking the website and images before publishing…');
    const checked = await core.build(plan);
    try {
      if (!(await new Confirm(this.app, plan).result())) return;
      // Close the draft editor before moving its file so autosave cannot recreate it.
      const leaf = this.app.workspace.getMostRecentLeaf();
      if (leaf) await leaf.setViewState({ type: 'empty' });
      let result;
      try { result = await core.publish(plan, { checked }); }
      catch (error) {
        await this.openPost(await core.exists(path.join(this.root, plan.target)) ? plan.target : plan.notePath);
        throw error;
      }
      await this.openPost(plan.target);
      if (result.unchanged) return new Notice('This post has no unpublished changes.');
      new Notice('Uploaded. GitHub Pages is building; the post is not confirmed live yet.', 12000);
      await this.status();
    } finally { await fs.rm(checked.temp, { recursive: true, force: true }); }
  }
  async openPost(filePath) {
    // Wait for Obsidian's filesystem watcher to register a newly published file.
    for (let attempt = 0; attempt < 20; attempt++) {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) return this.app.workspace.getLeaf(false).openFile(file);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    new Notice(`Open ${filePath} from the file explorer to continue editing.`);
  }
  async retry() {
    await core.retry(this.root);
    new Notice('Upload completed. Checking deployment…');
    await this.status();
  }
  async status() {
    const stateFile = path.join(this.root, '.obsidian/plugins/site-writer/publication.json');
    if (!(await core.exists(stateFile))) throw new Error('There is no publication to check yet.');
    const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    if (state.phase === 'committed') throw new Error('The post is committed locally but upload is not confirmed. Use Retry the last failed upload.');
    const { requestUrl } = require('obsidian');
    const response = await requestUrl({ url: `https://api.github.com/repos/wowashuwow/wowashuwow.github.io/actions/runs?head_sha=${state.commit}&per_page=20`, headers: { Accept: 'application/vnd.github+json' } });
    const run = response.json.workflow_runs.find(r => r.name === 'pages build and deployment' && r.head_sha === state.commit);
    if (!run || run.status !== 'completed') {
      new Notice('Deployment pending. Use Check the last publication again shortly.', 12000);
      window.open(run?.html_url || 'https://github.com/wowashuwow/wowashuwow.github.io/actions'); return;
    }
    if (run.conclusion !== 'success') { window.open(run.html_url); throw new Error(`GitHub Pages deployment ${run.conclusion}. Open the build details to resolve it; the post is not confirmed live.`); }
    const live = await requestUrl({ url: `https://wowashuwow.com${state.url}?publication=${state.commit.slice(0, 12)}`, throw: false });
    if (live.status !== 200 || !live.text.includes(`site-writer content: ${state.fingerprint}`)) throw new Error('Deployment succeeded, but the updated article is not available yet. Check again shortly.');
    new Notice('GitHub Pages deployment succeeded and the article URL is available.', 12000);
    window.open(`https://wowashuwow.com${state.url}`);
  }
  async closePreview() {
    if (this.server) await new Promise(resolve => this.server.close(resolve));
    this.server = null;
    if (this.previewTemp) await fs.rm(this.previewTemp, { recursive: true, force: true });
    this.previewTemp = null;
  }
  onunload() { this.closePreview().catch(console.error); }
};
