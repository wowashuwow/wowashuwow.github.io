'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const createUI = require('../lib/books-ui');

function harness(actions) {
  function element() { return { children: [], settings: [], style: {}, attributes: {}, events: {}, textContent: '', createEl(tag, options = {}) { const el = element(); el.tag = tag; el.textContent = options.text || ''; Object.assign(el.attributes, options.attr); this.children.push(el); return el; }, createDiv() { return this.createEl('div'); }, empty() { this.children = []; this.settings = []; }, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(key, fn) { this.events[key] = fn; }, querySelector() { return null; }, focus() {} }; }
  class Modal { constructor(app) { this.app = app; this.contentEl = element(); } open() { this.onOpen?.(); } close() { return this.onClose?.(); } }
  class FuzzySuggestModal extends Modal { setPlaceholder() {} }
  class Control {
    constructor() { this.inputEl = element(); this.selectEl = element(); this.buttonEl = element(); this.toggleEl = element(); }
    setValue(value) { this.value = value; return this; } setButtonText(value) { this.text = value; return this; }
    setTooltip() { return this; } setPlaceholder() { return this; } setCta() { return this; }
    setDisabled(value) { this.disabled = value; return this; } addOptions() { return this; }
    onChange(fn) { this.change = fn; return this; } onClick(fn) { this.click = fn; return this; }
  }
  class Setting {
    constructor(el) { this.settingEl = element(); this.controls = []; el.settings.push(this); }
    setName(name) { this.name = name; return this; } setDesc() { return this; }
    add(fn) { const control = new Control(); this.controls.push(control); fn(control); return this; }
    addButton(fn) { return this.add(fn); } addText(fn) { return this.add(fn); } addTextArea(fn) { return this.add(fn); }
    addToggle(fn) { return this.add(fn); } addDropdown(fn) { return this.add(fn); }
  }
  return createUI({ Modal, Setting, FuzzySuggestModal }, actions);
}
const state = () => ({ token: 'original', missing: ['99'], books: [
  { id: '1', title: 'Current A', author: 'Author', status: 'currently-reading' },
  { id: '2', title: 'Current B', author: 'Author', status: 'currently-reading' },
  { id: '3', title: 'Finished', author: 'Author', status: 'read', rating: 5 },
], overrides: { '1': { recommended: true, recommendation_blurb: 'Keep this', currently_reading_hidden: true }, '99': { history_hidden: true } } });

test('manager changes a private draft of settings; Cancel never saves', async () => {
  let saves = 0; const { Manager } = harness({ save: async () => { saves++; } });
  const initial = state(), before = JSON.stringify(initial);
  const modal = new Manager({}, initial), result = modal.result();
  modal.move(initial.books[0], 1); modal.section = 'current'; modal.render();
  const toggle = modal.list.settings[0].controls.find(c => c.change);
  toggle.change(true);
  modal.section = 'history'; modal.render(); modal.list.settings[0].controls[0].change(false);
  assert.equal(modal.draft['3'].history_hidden, true);
  assert.equal(JSON.stringify(initial), before);
  await modal.close(); assert.equal(await result, null); assert.equal(saves, 0);
});
test('current order and visibility are independent of history and recommendations', () => {
  const { Manager } = harness({}); const modal = new Manager({}, state()); modal.onOpen();
  modal.section = 'current'; modal.render(); modal.move(modal.state.books[1], -1);
  assert.deepEqual(modal.sectionBooks().map(b => b.id), ['2', '1']);
  assert.equal(modal.draft['1'].currently_reading_hidden, true);
  assert.equal(modal.draft['1'].recommended, true);
  assert.equal(modal.draft['1'].history_hidden, undefined);
  modal.section = 'history'; modal.query = 'missing'; modal.render(); assert.equal(modal.list.settings.length, 0);
});
test('stale/failed Save leaves dialog open with error and the saved state unchanged', async () => {
  const { Manager } = harness({ save: async () => { throw Error('Library changed; reload'); } });
  const initial = state(), before = JSON.stringify(initial), modal = new Manager({}, initial); modal.onOpen();
  const save = modal.contentEl.settings.flatMap(s => s.controls).find(c => c.text === 'Save locally');
  await save.click(); assert.match(modal.error.textContent, /Library changed/); assert.equal(save.disabled, false);
  assert.equal(JSON.stringify(initial), before); assert.equal(modal.saved, undefined);
});
test('import requires review and explicit removal acknowledgement before Apply', async () => {
  let applied = 0, cleaned = 0;
  const plan = { token: 't', fingerprint: 'f', summary: { counts: { finished: 1, currently_reading: 1, reviews: 0 }, added: [], changed: [], removed: [{ id: '3', title: 'Removed book' }], shelf_changes: [], reviews_needing_date_check: [], unchanged: false } };
  const { Importer } = harness({ capture: async () => ({ file: 'private.csv', cleanup: async () => { cleaned++; } }), inspect: async () => plan, apply: async (file, reviewed, allowed) => { assert.equal(file, 'private.csv'); assert.equal(reviewed, plan); assert.equal(allowed, true); applied++; return { saved: true }; } });
  const modal = new Importer({}); const result = modal.result();
  const input = modal.contentEl.children.find(el => el.tag === 'input'); input.files = [{ name: 'export.csv' }];
  await input.events.change(); assert.equal(applied, 0); assert.equal(modal.applyButton.disabled, true);
  modal.summaryEl.settings[0].controls[0].change(true); assert.equal(modal.applyButton.disabled, false);
  await modal.applyButton.click(); assert.equal(await result, true); assert.equal(applied, 1); assert.equal(cleaned, 1);
});
