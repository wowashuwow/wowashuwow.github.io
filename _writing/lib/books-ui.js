'use strict';
// Factory keeps Obsidian UI dependencies out of the testable storage/import core.
module.exports = function createBooksUI({ Modal, Setting, FuzzySuggestModal }, actions) {
  class BookPicker extends FuzzySuggestModal {
    constructor(app, books, choose) { super(app); this.books = books; this.choose = choose; this.setPlaceholder('Search imported books by title or author'); }
    getItems() { return this.books; }
    getItemText(book) { return `${book.title} — ${book.author}`; }
    onChooseItem(book) { this.choose(book); }
  }
  class PostPicker extends FuzzySuggestModal {
    constructor(app, posts, choose) { super(app); this.posts = posts; this.choose = choose; this.setPlaceholder('Search published posts by title'); }
    getItems() { return this.posts; }
    getItemText(post) { const duplicate = this.posts.filter(item => item.title === post.title).length > 1; return `${post.title} — ${post.date}${duplicate ? ' — ' + post.ref : ''}`; }
    onChooseItem(post) { this.choose(post); }
  }
  class PostLinks extends Modal {
    constructor(app, book, posts, references) { super(app); this.book = book; this.posts = posts; this.references = [...references]; }
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: `On the blog · ${this.book.title}` });
      this.contentEl.createEl('p', { text: 'Choose published writing related to this book. It can be a review, reflection or reading list. Done keeps these edits in Manage books; Save locally there writes them.' });
      new Setting(this.contentEl).addButton(button => button.setButtonText('Add a blog post').onClick(() => {
        const available = this.posts.filter(post => !this.references.includes(post.ref));
        if (!available.length) { this.error.textContent = 'No other published posts are available.'; return; }
        this.picker = new PostPicker(this.app, available, post => {
          if (!this.references.includes(post.ref)) this.references.push(post.ref);
          this.error.textContent = ''; this.render();
        }); this.picker.open();
      }));
      this.list = this.contentEl.createDiv(); this.list.style.maxHeight = '45vh'; this.list.style.overflowY = 'auto';
      this.error = this.contentEl.createEl('p', { attr: { role: 'status' } });
      new Setting(this.contentEl).addButton(button => button.setButtonText('Cancel').onClick(() => this.close()))
        .addButton(button => button.setButtonText('Done').setCta().onClick(() => { this.selection = [...this.references]; this.close(); }));
      this.render();
    }
    render() {
      this.list.empty();
      if (!this.references.length) this.list.createEl('p', { text: 'No blog posts linked yet.' });
      this.references.forEach((ref, index) => {
        const post = this.posts.find(post => post.ref === ref);
        const label = post?.title || `Unavailable post: ${ref}`;
        const row = new Setting(this.list).setName(label).setDesc(post ? `${post.date} · ${post.url}` : 'This source was renamed, deleted or is no longer published. Remove it or select its replacement.');
        row.addButton(button => { button.setButtonText('Remove').setTooltip(`Unlink ${label}`).onClick(() => { this.references.splice(index, 1); this.render(); }); button.buttonEl.setAttribute('aria-label', `Unlink ${label}`); });
        for (const delta of [-1, 1]) row.addButton(button => {
          button.setButtonText(delta < 0 ? '↑' : '↓').setDisabled(index + delta < 0 || index + delta >= this.references.length).onClick(() => {
            const next = index + delta; [this.references[index], this.references[next]] = [this.references[next], this.references[index]];
            this.render();
            const preferred = this.list.querySelector(`[data-post-move="${index + delta}:${delta}"]`);
            const target = preferred && !preferred.disabled ? preferred : this.list.querySelector(`[data-post-move="${index + delta}:${-delta}"]`); target?.focus();
          });
          button.buttonEl.setAttribute('aria-label', `Move ${label} ${delta < 0 ? 'up' : 'down'}`);
          button.buttonEl.setAttribute('data-post-move', `${index}:${delta}`);
        });
      });
    }
    onClose() { this.resolve?.(this.selection ?? null); this.contentEl.empty(); }
  }
  class Cover extends Modal {
    constructor(app, book, preferences, pending = {}) { super(app); this.book = book; this.preferences = preferences; this.pending = pending; this.controller = new AbortController(); }
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: `Cover · ${this.book.title}` });
      this.contentEl.createEl('p', { text: 'Covers are fetched during import. Correct a missing or wrong cover here. Done keeps the change in Manage books; Save locally applies it.' });
      this.preview = this.contentEl.createDiv();
      const pending = this.pending.cover;
      if (pending && typeof pending === 'object') this.showImage('data:image/jpeg;base64,' + pending.jpeg);
      else if (typeof pending === 'string') this.showImage(pending);
      else if (!Object.hasOwn(this.pending, 'cover') && this.preferences.cover) this.showImage(this.preferences.cover);
      this.error = this.contentEl.createEl('p', { attr: { role: 'status' } });
      this.matches = this.contentEl.createDiv();
      new Setting(this.contentEl).setName('Find another cover').addButton(button => button.setButtonText('Search automatically').onClick(async () => {
        button.setDisabled(true); this.error.textContent = 'Looking for matching covers…';
        try {
          const matches = await actions.candidates(this.book, this.controller.signal);
          if (this.closed) return;
          this.matches.empty(); this.error.textContent = matches.length ? 'Choose the correct book/edition.' : 'No confident source results. Keep the current cover or use a file.';
          for (const match of matches) {
            const row = this.matches.createDiv(); row.createEl('img', { attr: { src: match.cover, alt: '', width: '70', loading: 'lazy' } });
            new Setting(row).setName(match.title).setDesc(`${match.author} · ${new URL(match.source).hostname}`).addButton(b => b.setButtonText('Use this cover').onClick(() => { this.selection = { cover: match.cover }; this.preview.empty(); this.showImage(match.cover); }));
          }
        } catch (error) { if (!this.closed) this.error.textContent = error.message; }
        finally { if (!this.closed) button.setDisabled(false); }
      }));
      const file = this.contentEl.createEl('input', { attr: { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': `Choose a cover file for ${this.book.title}` } });
      file.addEventListener('change', async () => {
        if (!file.files?.[0]) return;
        this.processing = true; this.done.setDisabled(true); this.error.textContent = 'Preparing cover…';
        try {
          const image = await actions.normalizeCover(file.files[0]);
          if (this.closed) return;
          this.selection = { cover: image }; this.preview.empty(); this.showImage('data:image/jpeg;base64,' + image.jpeg); this.error.textContent = 'Ready. Save locally in Manage books to apply.';
        } catch (error) { if (!this.closed) this.error.textContent = error.message; }
        finally { this.processing = false; if (!this.closed) this.done.setDisabled(false); }
      });
      new Setting(this.contentEl).setName('No cover').addButton(b => b.setButtonText('Use no cover').onClick(() => { this.selection = { cover: null }; this.preview.empty(); this.error.textContent = 'The text fallback will be used. Future imports will respect this choice.'; }));
      new Setting(this.contentEl).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => { this.done = b; b.setButtonText('Done').setCta().onClick(() => { if (!this.processing) { this.accepted = this.selection; this.close(); } }); });
    }
    showImage(value) {
      const src = value.startsWith('/images/') ? this.app.vault?.adapter?.getResourcePath(value.slice(1)) : value;
      if (src) {
        const image = this.preview.createEl('img', { attr: { src, alt: `Cover of ${this.book.title}`, referrerpolicy: 'no-referrer', style: 'max-width:160px;max-height:240px;object-fit:contain' } });
        const info = this.preview.createEl('p');
        image.addEventListener('load', () => { info.textContent = `${image.naturalWidth} × ${image.naturalHeight} pixels${image.naturalWidth < 220 ? ' — small image; keep it or choose a sharper cover.' : ''}`; });
        image.addEventListener('error', () => { info.textContent = 'This cover could not load. Search automatically or choose a file.'; });
      }
    }
    onClose() { this.closed = true; this.controller.abort(); this.resolve?.(this.accepted ?? null); this.contentEl.empty(); }
  }
  class ReviewDate extends Modal {
    constructor(app, book, preferences, pending = {}) { super(app); this.book = book; this.preferences = { ...preferences }; if (Object.hasOwn(pending, 'review')) { this.preferences.review_date = pending.review?.date || ''; this.preferences.review_source_url = pending.review?.source || preferences.review_source_url; } }
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: `Review date · ${this.book.title}` });
      this.contentEl.createEl('p', { text: 'Optional. Use the date displayed on your Goodreads review; it may be an updated date. Completion and date-added are different. Unknown dates are fine.' });
      this.contentEl.createEl('p', { text: this.book.review_html.replace(/<[^>]*>/g, ' ').slice(0, 500) });
      let date = this.preferences.review_date || '', source = this.preferences.review_source_url || '', confirmed = false;
      if (source) this.contentEl.createEl('a', { text: 'Open Goodreads review ↗', attr: { href: source, target: '_blank', rel: 'noopener noreferrer' } });
      new Setting(this.contentEl).setName('Date on Goodreads review').addText(input => { input.inputEl.type = 'date'; input.inputEl.setAttribute('aria-label', 'Date on Goodreads review'); input.setValue(date).onChange(value => date = value); });
      new Setting(this.contentEl).setName('Goodreads review URL').addText(input => { input.inputEl.setAttribute('aria-label', 'Goodreads review URL'); input.setValue(source).setPlaceholder('https://www.goodreads.com/review/show/…').onChange(value => source = value); });
      new Setting(this.contentEl).setName('I checked this date on my review').addToggle(input => input.setValue(false).onChange(value => confirmed = value));
      this.error = this.contentEl.createEl('p', { attr: { role: 'alert' } });
      new Setting(this.contentEl).addButton(b => b.setButtonText('Clear date').onClick(() => { this.selection = { review: null }; this.close(); })).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Done').setCta().onClick(() => {
        if (!date || !source || !confirmed) { this.error.textContent = 'Enter the date and review URL, then confirm you checked them. Or Cancel to keep the existing date.'; return; }
        this.selection = { review: { date, source, confirmed } }; this.close();
      }));
    }
    onClose() { this.resolve?.(this.selection ?? null); this.contentEl.empty(); }
  }
  const rank = (settings, id, key) => settings[id]?.[key] ?? 999999;
  const ordered = (books, settings, key) => books.map((book, index) => ({ book, index })).sort((a, b) => rank(settings, a.book.id, key) - rank(settings, b.book.id, key) || a.index - b.index).map(item => item.book);
  class Manager extends Modal {
    constructor(app, state) { super(app); this.state = state; this.draft = JSON.parse(JSON.stringify(state.overrides)); this.section = 'recommended'; this.query = ''; this.metadata = {}; }
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: 'Manage books' });
      this.contentEl.createEl('p', { text: 'These choices affect your website only. Save locally, then preview. Goodreads is unchanged.' });
      const published = new Set((this.state.posts || []).map(post => post.ref));
      const broken = this.state.books.filter(book => (this.draft[book.id]?.posts || []).some(ref => !published.has(ref)));
      if (broken.length) this.contentEl.createEl('p', { text: `Unavailable blog links: ${broken.map(book => book.title).join(', ')}. Open each book's Blog posts controls to remove or replace them.`, attr: { role: 'alert' } });
      if (this.state.missing.length) this.contentEl.createEl('p', { text: `Saved settings retained for missing book IDs: ${this.state.missing.join(', ')}. They will apply again if those records return.`, attr: { role: 'status' } });
      for (const id of this.state.missing.filter(id => this.draft[id]?.recommended)) new Setting(this.contentEl).setName(`Missing recommended record: ${id}`).addButton(button => button.setButtonText('Remove recommendation').onClick(() => { this.preferences(id).recommended = false; button.setDisabled(true); }));
      new Setting(this.contentEl).setName('Section').addDropdown(input => { input.selectEl.setAttribute('aria-label', 'Books section'); return input.addOptions({ recommended: 'Read before you die', current: 'Currently reading', history: 'Reading history' }).setValue(this.section).onChange(value => { this.section = value; this.query = ''; this.search.setValue(''); this.render(); }); });
      new Setting(this.contentEl).setName('Search this section').addText(input => { this.search = input; input.inputEl.setAttribute('aria-label', 'Search books in this section'); input.setPlaceholder('Title or author').onChange(value => { this.query = value; this.render(); }); });
      this.addRow = new Setting(this.contentEl).setName('Add a recommendation').addButton(button => button.setButtonText('Choose a book').onClick(() => {
        const books = this.state.books.filter(book => !this.draft[book.id]?.recommended);
        if (!books.length) { this.error.textContent = 'All imported books are already recommended.'; return; }
        new BookPicker(this.app, books, book => {
          const selected = this.sectionBooks();
          this.preferences(book.id).recommended = true;
          selected.push(book);
          this.reorder(selected, 'recommendation_order');
          this.query = ''; this.search.setValue(''); this.render();
        }).open();
      }));
      this.list = this.contentEl.createDiv(); this.list.style.maxHeight = '45vh'; this.list.style.overflowY = 'auto';
      this.error = this.contentEl.createEl('p', { attr: { role: 'alert' } });
      new Setting(this.contentEl).addButton(button => button.setButtonText('Cancel').onClick(() => this.close())).addButton(button => button.setButtonText('Reload saved choices').onClick(async () => {
        if (this.fetching) { this.error.textContent = 'Wait for cover lookup or cancel it first.'; return; }
        try { this.state = await actions.read(); this.draft = JSON.parse(JSON.stringify(this.state.overrides)); this.metadata = {}; this.error.textContent = ''; this.render(); }
        catch (error) { this.error.textContent = error.message; }
      })).addButton(button => button.setButtonText('Save locally').setCta().onClick(async () => {
        if (this.fetching) { this.error.textContent = 'Wait for cover lookup or cancel it first.'; return; }
        button.setDisabled(true);
        this.operation = actions.save(this.state.token, this.draft, this.metadata);
        try { const result = await this.operation; this.saved = result.saved; this.close(); }
        catch (error) { this.error.textContent = error.message; button.setDisabled(false); }
      }));
      if (actions.retry) new Setting(this.contentEl).setName('Missing covers').setDesc('Automatically retry sources. Save or cancel your current edits first.').addButton(b => b.setButtonText('Retry missing data').onClick(async () => {
        if (JSON.stringify(this.draft) !== JSON.stringify(this.state.overrides) || Object.keys(this.metadata).length) { this.error.textContent = 'Save locally or cancel these edits before retrying metadata.'; return; }
        this.fetching = true; this.list.inert = true; b.setDisabled(true); this.retryController = new AbortController(); this.error.textContent = 'Fetching missing covers…';
        try { const result = await actions.retry(this.retryController.signal, text => { if (!this.closed) this.error.textContent = text; }); if (this.closed) return; this.state = await actions.read(); if (this.closed) return; this.draft = JSON.parse(JSON.stringify(this.state.overrides)); this.error.textContent = `${result.resolved} metadata updates. ${result.missing} covers still missing.${result.warnings?.length ? ' Some sources were unavailable; retry later.' : ''}`; this.render(); }
        catch (error) { if (!this.closed) this.error.textContent = error.message; }
        finally { this.fetching = false; if (!this.closed) { this.list.inert = false; b.setDisabled(false); } }
      }));
      this.render();
    }
    preferences(id) { return this.draft[id] ||= {}; }
    sectionBooks() {
      const books = this.state.books;
      if (this.section === 'recommended') return ordered(books.filter(b => this.draft[b.id]?.recommended), this.draft, 'recommendation_order');
      if (this.section === 'current') return ordered(books.filter(b => b.status === 'currently-reading'), this.draft, 'currently_reading_order');
      return books.filter(b => b.status === 'read' && b.rating);
    }
    reorder(books, key) { books.forEach((book, index) => this.preferences(book.id)[key] = index); }
    move(book, delta) {
      const books = this.sectionBooks(), index = books.findIndex(b => b.id === book.id), next = index + delta;
      if (next < 0 || next >= books.length) return;
      [books[index], books[next]] = [books[next], books[index]];
      this.reorder(books, this.section === 'recommended' ? 'recommendation_order' : 'currently_reading_order');
      this.render();
      const preferred = this.list.querySelector(`[data-move-id="${book.id}:${delta}"]`);
      const target = preferred && !preferred.disabled ? preferred : this.list.querySelector(`[data-move-id="${book.id}:${-delta}"]`);
      target?.focus();
    }
    render() {
      this.list.empty(); this.addRow.settingEl.hidden = this.section !== 'recommended'; this.addRow.settingEl.style.display = this.section === 'recommended' ? '' : 'none';
      const all = this.sectionBooks();
      const books = all.filter(b => `${b.title} ${b.author}`.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
      if (!books.length) this.list.createEl('p', { text: all.length ? 'No matching books.' : 'No books in this section.' });
      for (const book of books) {
        const preferences = this.preferences(book.id);
        const row = new Setting(this.list).setName(book.title).setDesc(book.author);
        if (this.section === 'recommended') {
          row.addButton(button => button.setButtonText('Remove').setTooltip(`Remove ${book.title} from Read before you die`).onClick(() => { preferences.recommended = false; this.render(); this.search.inputEl.focus(); }));
        } else {
          const key = this.section === 'current' ? 'currently_reading_hidden' : 'history_hidden';
          row.addToggle(toggle => { toggle.setValue(!preferences[key]).setTooltip(`Show ${book.title} on the website`).onChange(value => preferences[key] = !value); toggle.toggleEl.setAttribute('aria-label', `Show ${book.title} in ${this.section === 'current' ? 'Currently reading' : 'Reading history'}`); });
        }
        if (this.section !== 'history') {
          for (const delta of [-1, 1]) row.addButton(button => {
            const index = all.findIndex(b => b.id === book.id);
            button.setButtonText(delta < 0 ? '↑' : '↓').setTooltip(`Move ${book.title} ${delta < 0 ? 'up' : 'down'}`).setDisabled(index + delta < 0 || index + delta >= all.length).onClick(() => this.move(book, delta));
            button.buttonEl.setAttribute('aria-label', `Move ${book.title} ${delta < 0 ? 'up' : 'down'}`);
            button.buttonEl.setAttribute('data-move-id', `${book.id}:${delta}`);
          });
        }
        new Setting(this.list).setName('On the blog').setDesc('Related writing on your website').addButton(button => {
          button.setButtonText(`Blog posts (${preferences.posts?.length || 0})`).setTooltip(`Manage blog posts for ${book.title}`).onClick(async () => {
            this.linksModal = new PostLinks(this.app, book, this.state.posts || [], preferences.posts || []);
            const selected = await this.linksModal.result();
            if (selected !== null) { if (selected.length) preferences.posts = selected; else delete preferences.posts; this.render(); this.search.inputEl.focus(); }
          });
          button.buttonEl.setAttribute('aria-label', `Manage blog posts for ${book.title}`);
        });
        new Setting(this.list).setName('Cover').addButton(button => button.setButtonText('Cover…').onClick(async () => {
          this.coverModal = new Cover(this.app, book, preferences, this.metadata[book.id]);
          const edit = await this.coverModal.result();
          if (edit && !this.closed) { this.metadata[book.id] = { ...this.metadata[book.id], ...edit }; this.error.textContent = 'Cover choice ready. Save locally to apply.'; }
        }));
        if (book.review_html) new Setting(this.list).setName('Review date').setDesc((this.state.review_changed || []).includes(book.id) ? 'Review text changed; the saved date has not been reconfirmed.' : preferences.review_date || 'Date unknown — optional').addButton(button => button.setButtonText('Review date…').onClick(async () => {
          this.dateModal = new ReviewDate(this.app, book, preferences, this.metadata[book.id]);
          const edit = await this.dateModal.result();
          if (edit && !this.closed) { this.metadata[book.id] = { ...this.metadata[book.id], ...edit }; this.error.textContent = 'Date choice ready. Save locally to apply.'; }
        }));
        if (this.section === 'recommended') new Setting(this.list).setName('Your blurb (optional)').addTextArea(input => {
          input.setValue(preferences.recommendation_blurb || '').setPlaceholder('Add your own short note when ready').onChange(value => preferences.recommendation_blurb = value);
          input.inputEl.maxLength = 2000; input.inputEl.rows = 3; input.inputEl.setAttribute('aria-label', `Your recommendation blurb for ${book.title}`);
        });
      }
    }
    async onClose() { this.closed = true; this.retryController?.abort(); this.coverModal?.close(); this.dateModal?.close(); await this.operation?.catch(() => {}); this.resolve?.(this.saved ?? null); this.contentEl.empty(); }
  }
  class Importer extends Modal {
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.controller = new AbortController();
      this.contentEl.createEl('h2', { text: 'Import Goodreads library' });
      this.contentEl.createEl('p', { text: 'Choose a full Goodreads CSV export. Recommendations, hidden books, ordering, blurbs, covers and blog links are preserved. Nothing is uploaded.' });
      const input = this.contentEl.createEl('input', { attr: { type: 'file', accept: '.csv,text/csv', 'aria-label': 'Choose Goodreads CSV export' } });
      this.summaryEl = this.contentEl.createDiv(); this.error = this.contentEl.createEl('p', { attr: { role: 'alert' } });
      input.addEventListener('change', async () => {
        const file = input.files?.[0]; if (!file) return;
        input.disabled = true; this.error.textContent = ''; this.summaryEl.empty(); this.plan = null; this.applyButton.setDisabled(true);
        this.working = true;
        this.operation = (async () => {
          await this.captured?.cleanup(); this.captured = await actions.capture(file);
          this.plan = await actions.inspect(this.captured.file, this.controller.signal, text => { if (!this.closed) this.error.textContent = text; }); if (!this.closed) { this.error.textContent = ''; this.showSummary(); }
        })();
        try { await this.operation; } catch (error) { if (!this.closed) this.error.textContent = error.message; } finally { this.working = false; if (!this.closed) input.disabled = false; }
      });
      new Setting(this.contentEl).addButton(button => button.setButtonText('Cancel').onClick(() => this.close())).addButton(button => {
        this.applyButton = button; button.setButtonText('Apply locally').setCta().setDisabled(true).onClick(async () => {
          this.applying = true; button.setDisabled(true); input.disabled = true;
          this.operation = actions.apply(this.captured.file, this.plan, this.allowRemovals);
          try { const result = await this.operation; this.saved = result.saved; this.close(); }
          catch (error) { this.error.textContent = error.message; this.plan = null; input.disabled = false; } finally { this.applying = false; }
        });
      });
    }
    showSummary() {
      const summary = this.plan.summary; this.allowRemovals = false;
      this.summaryEl.createEl('p', { text: `${summary.counts.finished} rated finished books · ${summary.counts.currently_reading} currently reading · ${summary.counts.reviews} reviews` });
      if (summary.unchanged) this.summaryEl.createEl('p', { text: 'The library and available metadata are unchanged.' });
      if (summary.metadata_updates) this.summaryEl.createEl('p', { text: `${summary.metadata_updates} books have automatically fetched cover/source updates.` });
      if (this.plan.warnings?.length) this.summaryEl.createEl('p', { text: 'Some cover sources were unavailable. Existing covers are preserved; missing covers can retry on your next import or in Manage books.', attr: { role: 'status' } });
      for (const [key, label] of [['added', 'Add'], ['changed', 'Update'], ['removed', 'Remove from imported library'], ['shelf_changes', 'Reading status changes'], ['reviews_needing_date_check', 'New or changed reviews (dates stay optional)']]) {
        if (!summary[key].length) continue;
        this.summaryEl.createEl('h3', { text: `${label} (${summary[key].length})` });
        const list = this.summaryEl.createEl('ul');
        for (const book of summary[key]) list.createEl('li', { text: book.title + (book.from ? `: ${book.from} → ${book.to}` : '') });
      }
      if (summary.removed.length) new Setting(this.summaryEl).setName('Allow the listed removals').setDesc('Their saved website choices stay recoverable if the same records return.').addToggle(toggle => toggle.onChange(value => { this.allowRemovals = value; this.applyButton.setDisabled(!value); }));
      this.applyButton.setDisabled(summary.unchanged || summary.removed.length > 0);
    }
    async onClose() { this.closed = true; this.controller?.abort(); if (this.applying) { await this.operation?.catch(() => {}); await this.captured?.cleanup(); } else if (this.working) { this.operation?.catch(() => {}).finally(() => this.captured?.cleanup()); } else await this.captured?.cleanup(); this.resolve?.(this.saved ?? null); this.contentEl.empty(); }
  }
  class Publication extends Modal {
    constructor(app, plan) { super(app); this.plan = plan; }
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: 'Publish Bookshelf changes?' });
      this.contentEl.createEl('p', { text: `Destination: wowashuwow.com/bookshelf/ · ${this.plan.branch}. Commit: Update Bookshelf.` });
      if (!this.plan.ready) this.contentEl.createEl('p', { text: 'The initial Bookshelf feature release is still required. You can review changes here; uploading data alone is disabled until the page code is released.', attr: { role: 'status' } });
      const summary = this.contentEl.createEl('ul'); for (const line of this.plan.summary) summary.createEl('li', { text: line });
      this.contentEl.createEl('p', { text: 'Saved library data and website choices are public source, including books hidden from the page. Private drafts, CSV exports and unrelated website edits are excluded.' });
      const details = this.contentEl.createEl('details'); details.createEl('summary', { text: `Files to publish (${this.plan.changed.length})` });
      const files = details.createEl('ul'); for (const file of this.plan.changed) files.createEl('li', { text: file });
      let note = '';
      new Setting(this.contentEl).setName('Publication note (optional)').setDesc('Stored in public Git history.').addTextArea(input => { input.setPlaceholder('What changed or why…').onChange(value => note = value); input.inputEl.rows = 3; input.inputEl.setAttribute('aria-label', 'Bookshelf publication note (optional)'); });
      new Setting(this.contentEl).addButton(b => b.setButtonText('Cancel').onClick(() => this.close())).addButton(b => b.setButtonText('Publish').setCta().setDisabled(!this.plan.ready).onClick(() => { if (this.plan.ready) { this.selection = { note }; this.close(); } }));
    }
    onClose() { this.resolve?.(this.selection || null); this.contentEl.empty(); }
  }
  return { Manager, Importer, PostLinks, PostPicker, Cover, ReviewDate, Publication };
};
