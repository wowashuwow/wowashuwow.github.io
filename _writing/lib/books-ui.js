'use strict';
// Factory keeps Obsidian UI dependencies out of the testable storage/import core.
module.exports = function createBooksUI({ Modal, Setting, FuzzySuggestModal }, actions) {
  class BookPicker extends FuzzySuggestModal {
    constructor(app, books, choose) { super(app); this.books = books; this.choose = choose; this.setPlaceholder('Search imported books by title or author'); }
    getItems() { return this.books; }
    getItemText(book) { return `${book.title} — ${book.author}`; }
    onChooseItem(book) { this.choose(book); }
  }
  const rank = (settings, id, key) => settings[id]?.[key] ?? 999999;
  const ordered = (books, settings, key) => books.map((book, index) => ({ book, index })).sort((a, b) => rank(settings, a.book.id, key) - rank(settings, b.book.id, key) || a.index - b.index).map(item => item.book);
  class Manager extends Modal {
    constructor(app, state) { super(app); this.state = state; this.draft = JSON.parse(JSON.stringify(state.overrides)); this.section = 'recommended'; this.query = ''; }
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: 'Manage books' });
      this.contentEl.createEl('p', { text: 'These choices affect your website only. Save locally, then preview. Goodreads is unchanged.' });
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
        try { this.state = await actions.read(); this.draft = JSON.parse(JSON.stringify(this.state.overrides)); this.error.textContent = ''; this.render(); }
        catch (error) { this.error.textContent = error.message; }
      })).addButton(button => button.setButtonText('Save locally').setCta().onClick(async () => {
        button.setDisabled(true);
        this.operation = actions.save(this.state.token, this.draft);
        try { const result = await this.operation; this.saved = result.saved; this.close(); }
        catch (error) { this.error.textContent = error.message; button.setDisabled(false); }
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
        if (this.section === 'recommended') new Setting(this.list).setName('Your blurb (optional)').addTextArea(input => {
          input.setValue(preferences.recommendation_blurb || '').setPlaceholder('Add your own short note when ready').onChange(value => preferences.recommendation_blurb = value);
          input.inputEl.maxLength = 2000; input.inputEl.rows = 3; input.inputEl.setAttribute('aria-label', `Your recommendation blurb for ${book.title}`);
        });
      }
    }
    async onClose() { await this.operation?.catch(() => {}); this.resolve?.(this.saved ?? null); this.contentEl.empty(); }
  }
  class Importer extends Modal {
    result() { return new Promise(resolve => { this.resolve = resolve; this.open(); }); }
    onOpen() {
      this.contentEl.createEl('h2', { text: 'Import Goodreads library' });
      this.contentEl.createEl('p', { text: 'Choose a full Goodreads CSV export. Recommendations, hidden books, ordering, blurbs, covers and blog links are preserved. Nothing is uploaded.' });
      const input = this.contentEl.createEl('input', { attr: { type: 'file', accept: '.csv,text/csv', 'aria-label': 'Choose Goodreads CSV export' } });
      this.summaryEl = this.contentEl.createDiv(); this.error = this.contentEl.createEl('p', { attr: { role: 'alert' } });
      input.addEventListener('change', async () => {
        const file = input.files?.[0]; if (!file) return;
        input.disabled = true; this.error.textContent = ''; this.summaryEl.empty(); this.plan = null; this.applyButton.setDisabled(true);
        this.operation = (async () => {
          await this.captured?.cleanup(); this.captured = await actions.capture(file);
          this.plan = await actions.inspect(this.captured.file); this.showSummary();
        })();
        try { await this.operation; } catch (error) { this.error.textContent = error.message; } finally { input.disabled = false; }
      });
      new Setting(this.contentEl).addButton(button => button.setButtonText('Cancel').onClick(() => this.close())).addButton(button => {
        this.applyButton = button; button.setButtonText('Apply locally').setCta().setDisabled(true).onClick(async () => {
          button.setDisabled(true); input.disabled = true;
          this.operation = actions.apply(this.captured.file, this.plan, this.allowRemovals);
          try { const result = await this.operation; this.saved = result.saved; this.close(); }
          catch (error) { this.error.textContent = error.message; this.plan = null; input.disabled = false; }
        });
      });
    }
    showSummary() {
      const summary = this.plan.summary; this.allowRemovals = false;
      this.summaryEl.createEl('p', { text: `${summary.counts.finished} rated finished books · ${summary.counts.currently_reading} currently reading · ${summary.counts.reviews} reviews` });
      if (summary.unchanged) this.summaryEl.createEl('p', { text: 'This export matches the current library. No files need changing.' });
      for (const [key, label] of [['added', 'Add'], ['changed', 'Update'], ['removed', 'Remove from imported library'], ['shelf_changes', 'Reading status changes'], ['reviews_needing_date_check', 'Reviews whose dates need checking']]) {
        if (!summary[key].length) continue;
        this.summaryEl.createEl('h3', { text: `${label} (${summary[key].length})` });
        const list = this.summaryEl.createEl('ul');
        for (const book of summary[key]) list.createEl('li', { text: book.title + (book.from ? `: ${book.from} → ${book.to}` : '') });
      }
      if (summary.removed.length) new Setting(this.summaryEl).setName('Allow the listed removals').setDesc('Their saved website choices stay recoverable if the same records return.').addToggle(toggle => toggle.onChange(value => { this.allowRemovals = value; this.applyButton.setDisabled(!value); }));
      this.applyButton.setDisabled(summary.unchanged || summary.removed.length > 0);
    }
    async onClose() { await this.operation?.catch(() => {}); await this.captured?.cleanup(); this.resolve?.(this.saved ?? null); this.contentEl.empty(); }
  }
  return { Manager, Importer };
};
