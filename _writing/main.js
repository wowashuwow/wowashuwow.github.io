'use strict';
const { Plugin, Modal, Setting, Notice, parseYaml, stringifyYaml, TFile, PluginSettingTab } = require('obsidian');
const path = require('node:path');
const fs = require('node:fs/promises');
const { PreviewSession } = require('./lib/preview');
const core = require('./lib/publishing');
const cleanup = require('./lib/cleanup');
const books = require('./lib/books');
const bookFetch = require('./lib/books-fetch');
const bookPublisher = require('./lib/books-publish');
const createBooksUI = require('./lib/books-ui');
const ui = require('./lib/ui');
const YAML = { parse: parseYaml, stringify: stringifyYaml };

class Ask extends Modal {
  constructor(app, title, label) { super(app); this.title = title; this.label = label; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    ui.layout(this, this.title);
    let value = '';
    new Setting(this.body).setName(this.label).addText(input => { input.inputEl.setAttribute('aria-label', this.label); input.onChange(v => value = v); setTimeout(() => input.inputEl.focus(), 0); });
    new Setting(this.footer).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Create draft').setCta().onClick(() => { if (value.trim()) { this.resolve(value.trim()); this.close(); } }));
  }
  onClose() { this.resolve?.(null); this.contentEl.empty(); }
}
class Confirm extends Modal {
  constructor(app, plan) { super(app); this.plan = plan; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    ui.layout(this, 'Publish this post?');
    this.body.createEl('p', { text: this.plan.title });
    this.body.createEl('p', { text: `Commit: ${core.commitSubject(this.plan)}` });
    let note = '';
    ui.multiline(new Setting(this.body)).setName('Publication note (optional)').setDesc('Stored in public Git history, not shown in the post. Leave blank to use only the commit subject.').addTextArea(input => {
      input.setPlaceholder('Context for this publication or what changed…').onChange(value => note = value);
      input.inputEl.rows = 4;
      input.inputEl.setAttribute('aria-label', 'Publication note (optional)');
    });
    if (this.plan.unpublished) this.body.createEl('p', { text: 'This post is marked published: false. Publishing will remove that property and make it public.' });
    this.body.createEl('p', { text: 'This uploads the following files to your public website. Other drafts stay private.' });
    const details = this.body.createEl('details');
    details.createEl('summary', { text: `Files to publish (${1 + this.plan.assets.size})` });
    const list = details.createEl('ul');
    for (const file of [this.plan.target, ...this.plan.assets.keys()]) list.createEl('li', { text: file });
    new Setting(this.footer).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Publish').setCta().onClick(() => { this.resolve({ note }); this.close(); }));
  }
  onClose() { this.resolve?.(false); this.contentEl.empty(); }
}
class CleanupConfirm extends Modal {
  constructor(app, plan) { super(app); this.plan = plan; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    ui.layout(this, this.plan.notePath ? 'Delete this draft and unused images?' : 'Clean up leftover draft images?');
    this.body.createEl('p', { text: 'Selected files move to recoverable trash. Published images are always preserved.' });
    const list = this.body.createEl('ul');
    for (const file of [this.plan.notePath, ...this.plan.remove].filter(Boolean)) list.createEl('li', { text: file });
    if (this.plan.keep.length) {
      this.body.createEl('h3', { text: 'Keep these files' });
      const kept = this.body.createEl('ul');
      for (const file of this.plan.keep) kept.createEl('li', { text: `${file.path}: ${file.reason}` });
    }
    new Setting(this.footer).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Move to trash').onClick(() => { this.resolve(true); this.close(); }));
  }
  onClose() { this.resolve?.(false); this.contentEl.empty(); }
}
class LeftoverFolders extends Modal {
  constructor(app, folders) { super(app); this.folders = folders; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    ui.layout(this, 'Choose a leftover draft image folder');
    for (const folder of this.folders) new Setting(this.body).setName(folder).addButton(b => b.setButtonText('Review').onClick(() => { this.resolve(folder); this.close(); }));
    new Setting(this.footer).addButton(b => b.setButtonText('Cancel').onClick(() => this.close()));
  }
  onClose() { this.resolve?.(null); this.contentEl.empty(); }
}
class ImageChoice extends Modal {
  constructor(app, files) { super(app); this.files = files; this.insert = false; }
  result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
  onOpen() {
    ui.layout(this, 'Featured image');
    new Setting(this.body).setName('Also insert into the post').setDesc('Uses the same image file. Leave off for a featured-only image.').addToggle(t => t.setValue(false).onChange(v => this.insert = v));
    const input = this.body.createEl('input', { attr: { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml' } });
    input.style.display = 'none';
    input.addEventListener('change', () => { const file = input.files?.[0]; if (file) { this.resolve({ imported: file, insert: this.insert }); this.close(); } });
    new Setting(this.body).setName('Import an image').addButton(b => b.setButtonText('Choose from Mac').onClick(() => input.click()));
    new Setting(this.body).setName('No featured image').addButton(b => b.setButtonText('Remove image').onClick(() => { this.resolve({ path: '' }); this.close(); }));
    let query = '';
    const search = new Setting(this.body).setName('Search existing images');
    const list = this.body.createDiv({ cls: 'publishdesk-list' });
    const render = () => {
      list.empty();
      const matches = this.files.filter(file => file.path.toLowerCase().includes(query.toLowerCase()));
      for (const file of matches.slice(0, 40)) new Setting(list).setName(file.path).addButton(b => b.setButtonText('Choose').onClick(() => { this.resolve({ path: file.path, insert: this.insert }); this.close(); }));
      if (matches.length > 40) list.createEl('p', { text: 'Showing 40 images. Search to narrow the list.' });
    };
    search.addText(t => t.setPlaceholder('Filename or folder').onChange(value => { query = value; render(); })); render();
    new Setting(this.footer).addButton(b => b.setButtonText('Cancel').onClick(() => this.close()));
  }
  onClose() { this.resolve?.(null); this.contentEl.empty(); }
}
class WriterSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    this.containerEl.empty();
    this.containerEl.classList.add('publishdesk-settings');
    new Setting(this.containerEl).setName('Featured image property').setDesc('Match the field used by your Jekyll theme. This site uses image.').addText(t => t.setValue(this.plugin.settings.imageProperty).onChange(async value => {
      if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value)) { this.plugin.settings.imageProperty = value; await this.plugin.saveData(this.plugin.settings); }
    }));
  }
}

module.exports = class WebsiteWriter extends Plugin {
  async onload() {
    this.root = this.app.vault.adapter.getBasePath();
    this.busy = false;
    this.settings = { imageProperty: 'image', ...(await this.loadData()) };
    this.addSettingTab(new WriterSettings(this.app, this));
    for (const event of ['modify', 'create', 'delete', 'rename']) this.registerEvent(this.app.vault.on(event, file => {
      if (event === 'delete' && file.path === this.previewNote) { this.closePreview().catch(console.error); return; }
      if (this.previewNote === '__books__') { if (/^(?:_posts\/|_data\/books(?:-overrides)?\.yml|images\/books\/|_pages\/books\.html|_includes\/book-|_sass\/4-layouts\/_books\.scss|js\/books\.js)/.test(file.path)) this.schedulePreview(); return; }
      if (this.previewNote && (file.path === this.previewNote || /\.(jpe?g|png|webp|gif|avif|svg|md)$/i.test(file.path))) this.schedulePreview();
    }));
    const commands = [
      ['manage-books', 'Manage books', () => this.manageBooks()],
      ['import-books', 'Import Goodreads library', () => this.importBooks()],
      ['preview-books', 'Preview Bookshelf page', () => this.previewBooks()],
      ['publish-books', 'Publish Bookshelf changes', () => this.publishBooks()],
      ['new-draft', 'New blog draft', () => this.newDraft()],
      ['preview', 'Preview current post on the website', () => this.preview()],
      ['stop-preview', 'Stop website preview', () => this.closePreview()],
      ['delete-draft', 'Delete current draft and unused images', () => this.deleteDraft()],
      ['cleanup-leftovers', 'Clean up leftover draft images', () => this.cleanupLeftovers()],
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
    if (this.busy || this.refreshing) return new Notice('A writing action or preview update is running. Try again when it finishes.');
    this.busy = true;
    try { await action(); } catch (error) { new Notice(error.message, 20000); console.error('PublishDesk:', error); }
    finally { this.busy = false; }
  }
  async current() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || !/^(Drafts|_drafts|_posts)\/[^/]+\.md$/.test(file.path)) throw new Error('Open a blog draft or post first.');
    // Flush the editor before validating files on disk.
    const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
    if (view?.save) await view.save();
    return file;
  }
  async deleteDraft() {
    const note = await this.current();
    const plan = await cleanup.planCleanup(this.root, note.path);
    if (!await new CleanupConfirm(this.app, plan).result()) return;
    const result = await cleanup.executeCleanup(this.app, this.root, plan, { beforeDelete: () => this.previewNote === note.path ? this.closePreview() : Promise.resolve() });
    new Notice(`Draft moved to trash with ${result.removed} unused files. ${result.preserved} files preserved.`);
  }
  async cleanupLeftovers() {
    const directory = path.join(this.root, 'Drafts/images');
    if (!await core.exists(directory)) return new Notice('No leftover draft image folders.');
    const folders = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !await core.exists(path.join(this.root, `Drafts/${entry.name}.md`)) && !await core.exists(path.join(this.root, `_posts/${entry.name}.md`))) folders.push(entry.name);
    }
    if (!folders.length) return new Notice('No leftover draft image folders.');
    const name = await new LeftoverFolders(this.app, folders.sort()).result();
    if (!name) return;
    const plan = await cleanup.planCleanup(this.root, `Drafts/${name}.md`, { allowMissing: true });
    if (!await new CleanupConfirm(this.app, plan).result()) return;
    const result = await cleanup.executeCleanup(this.app, this.root, plan);
    new Notice(`Moved ${result.removed} unused files to trash. ${result.preserved} files preserved.`);
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
    const privateNote = !note.path.startsWith('_posts/');
    const prefix = privateNote ? `Drafts/images/${note.basename}/` : `images/${note.basename}/`;
    const files = this.app.vault.getFiles().filter(f => /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(f.path) && (f.path.startsWith(prefix) || f.path.startsWith('images/')) && f.path !== 'images/2026-8-23-the-guilt-of-fitness-fi.jpg');
    const chosen = await new ImageChoice(this.app, files).result();
    if (!chosen) return;
    if (chosen.imported) {
      const file = chosen.imported;
      if (file.size > 25 * 1024 * 1024) throw new Error('Image exceeds 25 MB. Export a smaller web image first.');
      if (!/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(file.name)) throw new Error('Choose a JPEG, PNG, WebP, GIF, AVIF, or SVG image.');
      const bytes = await file.arrayBuffer();
      await this.validateImage(bytes, file.type);
      if (!this.app.vault.getAbstractFileByPath(prefix.slice(0, -1))) await this.app.vault.createFolder(prefix.slice(0, -1));
      const safeName = file.name.replace(/[\/\\\x00-\x1f]/g, '-');
      let destination = prefix + safeName, count = 1;
      while (this.app.vault.getAbstractFileByPath(destination)) {
        const existing = this.app.vault.getAbstractFileByPath(destination);
        const previous = Buffer.from(await this.app.vault.readBinary(existing));
        if (previous.equals(Buffer.from(bytes))) break;
        const ext = path.posix.extname(safeName); destination = prefix + path.posix.basename(safeName, ext) + '-' + count++ + ext;
      }
      if (!this.app.vault.getAbstractFileByPath(destination)) await this.app.vault.createBinary(destination, bytes);
      chosen.path = destination;
    } else if (chosen.path) {
      const file = this.app.vault.getAbstractFileByPath(chosen.path);
      await this.validateImage(await this.app.vault.readBinary(file), file.extension === 'svg' ? 'image/svg+xml' : '');
    }
    await this.app.fileManager.processFrontMatter(note, meta => {
      if (!chosen.path) delete meta[this.settings.imageProperty];
      else meta[this.settings.imageProperty] = chosen.path.startsWith('Drafts/') ? path.posix.relative(path.posix.dirname(note.path), chosen.path) : '/' + chosen.path;
    });
    if (chosen.insert && chosen.path) {
      const file = this.app.vault.getAbstractFileByPath(chosen.path);
      const editor = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView)?.editor;
      if (editor) await this.app.vault.process(note, text => text.trimEnd() + '\n\n!' + this.app.fileManager.generateMarkdownLink(file, note.path) + '\n');
    }
    new Notice(chosen.path ? 'Featured image selected. Existing images were preserved.' : 'Featured image removed; its file was preserved.');
  }
  async validateImage(bytes, type = '') {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    try { await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('This file cannot be decoded as an image. Choose a valid web image.')); image.src = url; }); }
    finally { URL.revokeObjectURL(url); }
  }
  async prepare(note, preview = false, publishUnpublished = false) {
    return core.prepare(this.root, note.path, YAML, { preview, publishUnpublished, imageProperty: this.settings.imageProperty, validateImage: (bytes, source) => this.validateImage(bytes, /\.svg$/i.test(source) ? 'image/svg+xml' : '') });
  }
  schedulePreview() {
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.refreshPreview(), 600);
  }
  async refreshPreview() {
    if (!this.previewNote || this.unloading) return;
    if (this.refreshing || this.busy) { this.schedulePreview(); return; }
    this.refreshing = true;
    try {
      if (this.previewNote === '__books__') { await this.session.update({ root: this.root }); return; }
      const note = this.app.vault.getAbstractFileByPath(this.previewNote);
      if (!(note instanceof TFile)) throw new Error('The previewed note was moved or deleted. Start Preview again for its new location.');
      await this.session.update(await this.prepare(note, true));
    } catch (error) {
      this.session?.send({ revision: this.session.revision, error: error.message });
      console.error('Website preview:', error);
    } finally { this.refreshing = false; }
  }
  async validateBookImage(bytes) {
    const url = URL.createObjectURL(new Blob([bytes]));
    let image, timer;
    try {
      await new Promise((resolve, reject) => {
        image = new Image();
        timer = setTimeout(() => reject(new Error('Cover decoding timed out.')), 10000);
        image.onerror = () => reject(new Error('This cover cannot be decoded.'));
        image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 && image.naturalWidth * image.naturalHeight <= 40_000_000 ? resolve() : reject(new Error('Cover dimensions are invalid or too large.'));
        image.src = url;
      });
    } finally { clearTimeout(timer); if (image) { image.onload = null; image.onerror = null; image.src = ''; } URL.revokeObjectURL(url); }
  }
  async fetchBookMetadata(library, ids, signal, progress) {
    return bookFetch.collect({ books: library, ids, signal, progress,
      get: input => require('obsidian').requestUrl(input),
      parse: async feeds => (await books.call(this.root, { mode: 'parse-feeds', feeds })).records,
      verify: bytes => this.validateBookImage(bytes),
    });
  }
  async bookCandidates(book, signal) {
    const primary = await this.fetchBookMetadata([book], [book.id], signal);
    const entry = primary.records[book.id];
    const matches = entry?.cover ? [{ title: book.title, author: book.author, cover: entry.cover, source: entry.cover_source || book.source_url, exact: true }] : [];
    try { matches.push(...await bookFetch.candidates(book, { get: input => require('obsidian').requestUrl(input), signal })); } catch (error) { if (signal?.aborted || !matches.length) throw error; }
    return matches.filter((match, index) => matches.findIndex(item => item.cover === match.cover) === index);
  }
  async retryBookMetadata(signal, progress) {
    const state = await books.call(this.root, { mode: 'read' });
    const ids = state.books.filter(book => { const c = state.overrides[book.id] || {}; return (!c.cover && !c.cover_disabled) || (book.review_html && !c.review_source_url); }).map(book => book.id);
    if (!ids.length) return { saved: false, resolved: 0, missing: 0, warnings: [] };
    const result = await this.fetchBookMetadata(state.books, ids, signal, progress);
    if (signal?.aborted || this.unloading) throw new Error('Cover lookup cancelled.');
    return { ...await books.call(this.root, { mode: 'enrich', token: state.token, records: result.records }), warnings: result.warnings };
  }
  async normalizeCover(file) {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw new Error('Choose a JPEG, PNG or WebP cover up to 10 MB.');
    const url = URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type }));
    try {
      const image = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('This cover cannot be decoded.')); image.src = url; });
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('This cover is too large. Export a smaller image.');
      const scale = Math.min(1, 440 / image.naturalWidth, 1200 / image.naturalHeight);
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      if (!blob || blob.type !== 'image/jpeg' || blob.size > 1024 * 1024) throw new Error('Could not prepare a small JPEG cover.');
      return { jpeg: Buffer.from(await blob.arrayBuffer()).toString('base64'), source: '' };
    } finally { URL.revokeObjectURL(url); }
  }
  booksUI() {
    return createBooksUI(require('obsidian'), {
      read: () => books.call(this.root, { mode: 'read' }),
      save: (token, overrides, metadata = {}) => books.call(this.root, { mode: 'save', token, overrides, metadata }),
      candidates: (book, signal) => this.bookCandidates(book, signal),
      normalizeCover: file => this.normalizeCover(file),
      retry: (signal, progress) => this.retryBookMetadata(signal, progress),
      capture: file => books.captureCsv(this.root, file),
      inspect: (file, signal, progress) => books.inspectImport(this.root, file, { signal, collect: (library, ids) => this.fetchBookMetadata(library, ids, signal, progress) }),
      apply: (file, plan, allow_removals) => books.call(this.root, { mode: 'apply', file, token: plan.token, fingerprint: plan.fingerprint, allow_removals, enrichment: plan.enrichment || {} }),
    });
  }
  async manageBooks() {
    const state = await books.call(this.root, { mode: 'read' });
    const { Manager } = this.booksUI();
    this.booksDialog = new Manager(this.app, state);
    const saved = await this.booksDialog.result(); this.booksDialog = null;
    if (saved !== null) new Notice(saved ? 'Books choices saved locally. Preview before publishing.' : 'No Books choices changed.');
    if (saved && this.previewNote === '__books__') this.schedulePreview();
  }
  async importBooks() {
    const { Importer } = this.booksUI();
    this.booksDialog = new Importer(this.app);
    const saved = await this.booksDialog.result(); this.booksDialog = null;
    if (saved) new Notice('Goodreads library imported locally. Website choices preserved. Nothing uploaded.');
    if (saved && this.previewNote === '__books__') this.schedulePreview();
  }
  async publishBooks() {
    await this.closePreview();
    const plan = await bookPublisher.prepare(this.root, YAML);
    if (!plan.changed.length) return new Notice('Bookshelf has no unpublished changes.');
    new Notice('Checking Bookshelf before publication…');
    const checked = await books.build(plan.ready ? plan : { root: this.root });
    try {
      const { Publication } = this.booksUI();
      this.booksDialog = new Publication(this.app, plan);
      const decision = await this.booksDialog.result(); this.booksDialog = null;
      if (!decision) return;
      const result = await bookPublisher.publish(plan, { ...decision, checked });
      if (result.unchanged) return new Notice('Bookshelf has no unpublished changes.');
      new Notice('Bookshelf uploaded. GitHub Pages is building; live content is not confirmed yet.', 12000);
      await this.status();
    } finally { await fs.rm(checked.temp, { recursive: true, force: true }); }
  }
  async previewBooks() {
    if (this.previewNote !== '__books__') await this.closePreview();
    this.session ||= new PreviewSession(() => {}, books.build);
    new Notice('Building the Books preview…');
    const url = await this.session.update({ root: this.root });
    this.previewNote = '__books__'; window.open(url);
    new Notice('Books preview opened. Saved Books choices/imports update it automatically.');
  }
  async preview() {
    const note = await this.current();
    if (this.previewNote !== note.path) await this.closePreview();
    this.session ||= new PreviewSession();
    new Notice('Building a private local preview…');
    const url = await this.session.update(await this.prepare(note, true));
    this.previewNote = note.path;
    window.open(url);
    new Notice('Preview opened. Saved edits now update this preview automatically.');
  }
  async publish() {
    const note = await this.current();
    await this.closePreview();
    await bookPublisher.noPending(this.root);
    await core.preflight(this.root);
    const meta = this.app.metadataCache.getFileCache(note)?.frontmatter;
    const plan = await this.prepare(note, false, meta?.published === false);
    new Notice('Checking the website and images before publishing…');
    const checked = await core.build(plan);
    try {
      const confirmation = await new Confirm(this.app, plan).result();
      if (!confirmation) return;
      // Close the draft editor before moving its file so autosave cannot recreate it.
      const leaf = this.app.workspace.getMostRecentLeaf();
      if (leaf) await leaf.setViewState({ type: 'empty' });
      let result;
      try { result = await core.publish(plan, { checked, note: confirmation.note }); }
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
    const pending = await bookPublisher.state(this.root);
    if (pending?.kind === 'books') await bookPublisher.retry(this.root); else await core.retry(this.root);
    new Notice('Upload completed. Checking deployment…');
    await this.status();
  }
  async status() {
    const stateFile = path.join(this.root, '.obsidian/plugins/site-writer/publication.json');
    if (!(await core.exists(stateFile))) throw new Error('There is no publication to check yet.');
    const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    if (['prepared', 'committed'].includes(state.phase)) throw new Error('The publication has not finished uploading. Use Retry the last failed upload.');
    const { requestUrl } = require('obsidian');
    if (state.kind === 'books') {
      const url = `https://wowashuwow.com${state.url}`;
      let live, runs;
      try { live = await requestUrl({ url: `${url}?publication=${state.commit.slice(0, 12)}`, throw: false }); } catch {}
      if (bookPublisher.publicationStatus(state, live).status !== 'live') {
        try { runs = (await requestUrl({ url: `https://api.github.com/repos/wowashuwow/wowashuwow.github.io/actions/runs?head_sha=${state.commit}&per_page=20`, headers: { Accept: 'application/vnd.github+json' } })).json; } catch {}
      }
      const result = bookPublisher.publicationStatus(state, live, runs);
      new Notice(result.message, 20000);
      if (result.status === 'live') window.open(url);
      else if (result.status === 'failed' && result.url) window.open(result.url);
      return;
    }
    const response = await requestUrl({ url: `https://api.github.com/repos/wowashuwow/wowashuwow.github.io/actions/runs?head_sha=${state.commit}&per_page=20`, headers: { Accept: 'application/vnd.github+json' } });
    const run = response.json.workflow_runs.find(r => r.name === 'pages build and deployment' && r.head_sha === state.commit);
    if (!run || run.status !== 'completed') {
      new Notice('Deployment pending. Use Check the last publication again shortly.', 12000);
      window.open(run?.html_url || 'https://github.com/wowashuwow/wowashuwow.github.io/actions'); return;
    }
    if (run.conclusion !== 'success') { window.open(run.html_url); throw new Error(`GitHub Pages deployment ${run.conclusion}. Open the build details to resolve it; the post is not confirmed live.`); }
    const label = state.kind === 'books' ? 'Bookshelf' : 'article';
    const marker = state.kind === 'books' ? `publishdesk-books: ${state.fingerprint}` : `site-writer content: ${state.fingerprint}`;
    const live = await requestUrl({ url: `https://wowashuwow.com${state.url}?publication=${state.commit.slice(0, 12)}`, throw: false });
    if (live.status !== 200 || !live.text.includes(marker)) throw new Error(`Deployment succeeded, but the updated ${label} is not available yet. Check again shortly.`);
    new Notice(`GitHub Pages deployment succeeded and the ${label} URL is available.`, 12000);
    window.open(`https://wowashuwow.com${state.url}`);
  }
  async closePreview() {
    this.previewNote = null; clearTimeout(this.previewTimer);
    while (this.refreshing) await new Promise(resolve => setTimeout(resolve, 50));
    await this.session?.close(); this.session = null;
  }
  onunload() { this.unloading = true; this.booksDialog?.close(); this.closePreview().catch(console.error); }
};
