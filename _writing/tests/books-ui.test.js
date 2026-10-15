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

test('post links support title search, duplicate prevention, ordering and child Cancel', async () => {
  const { PostLinks, PostPicker } = harness({});
  const posts = [{ref:'2020-01-01-a.md',title:'Same title',date:'2020-01-01',url:'/a/'},{ref:'2020-01-02-b.md',title:'Same title',date:'2020-01-02',url:'/b/'}];
  const original = [posts[0].ref]; const dialog = new PostLinks({}, {title:'Book'},posts,original); const result=dialog.result();
  const add=dialog.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Add a blog post');
  add.click(); assert.deepEqual(dialog.picker.getItems(),[posts[1]]);
  assert.equal(dialog.picker.getItemText(posts[1]),'Same title — 2020-01-02');
  assert.match(new PostPicker({},posts,()=>{}).getItemText(posts[1]),/Same title.*2020-01-02.*b.md/);
  dialog.picker.onChooseItem(posts[1]); dialog.picker.onChooseItem(posts[1]); assert.equal(dialog.references.length,2);
  dialog.list.settings[1].controls[1].click(); assert.deepEqual(dialog.references,[posts[1].ref,posts[0].ref]);
  dialog.list.settings[0].controls[0].click(); assert.deepEqual(dialog.references,original);
  await dialog.close(); assert.equal(await result,null); assert.deepEqual(original,[posts[0].ref]);
});
test('child Done edits only the parent draft; parent Cancel never saves; missing links remain repairable', async () => {
  let saves=0;const { Manager }=harness({save:async()=>{saves++;}});
  const initial=state();initial.posts=[{ref:'2020-01-01-a.md',title:'A published essay',date:'2020-01-01',url:'/essay/'}];initial.overrides['1'].posts=['2020-01-01-missing.md'];
  const modal=new Manager({},initial);const result=modal.result();
  const manage=modal.list.settings.find(s=>s.name==='On the blog').controls[0];const pending=manage.click();
  assert.match(modal.linksModal.list.settings[0].name,/Unavailable post/);
  modal.linksModal.references=[initial.posts[0].ref];
  modal.linksModal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Done').click();await pending;
  assert.deepEqual(modal.draft['1'].posts,[initial.posts[0].ref]);assert.deepEqual(initial.overrides['1'].posts,['2020-01-01-missing.md']);
  modal.section='current';modal.render();assert.ok(modal.list.settings.some(s=>s.name==='On the blog')); // hidden current book still manageable
  await modal.close();assert.equal(await result,null);assert.equal(saves,0);
});
test('the same post can be linked to several books and final Save forwards their separate associations',async()=>{
 let saved;const {Manager}=harness({save:async(token,overrides)=>{saved=overrides;return{saved:true};}});
 const modal=new Manager({},state());const result=modal.result();modal.draft['1'].posts=['2020-01-01-a.md'];modal.preferences('3').posts=['2020-01-01-a.md'];
 await modal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Save locally').click();assert.equal(await result,true);
 assert.deepEqual(saved['1'].posts,saved['3'].posts);assert.equal(saved['1'].recommendation_blurb,'Keep this');
});

test('cover Done stays in manager until Save; parent Cancel never writes or removes images', async () => {
 let saved; const {Manager}=harness({save:async(token,overrides,metadata)=>{saved={overrides,metadata};return{saved:true};}});
 const initial=state(), before=JSON.stringify(initial),modal=new Manager({},initial);const result=modal.result();
 const open=modal.list.settings.find(s=>s.name==='Cover').controls[0].click();
 modal.coverModal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Use no cover').click();
 modal.coverModal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Done').click();await open;
 assert.deepEqual(modal.metadata['1'],{cover:null});assert.equal(JSON.stringify(initial),before);assert.equal(saved,undefined);
 await modal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Save locally').click();assert.equal(await result,true);assert.deepEqual(saved.metadata['1'],{cover:null});
 const cancelled=new Manager({},initial);const cancelResult=cancelled.result();cancelled.metadata['1']={cover:null};saved=undefined;await cancelled.close();assert.equal(await cancelResult,null);assert.equal(saved,undefined);
});
test('review date requires explicit confirmation and forwards a separate optional edit', async () => {
 const {ReviewDate}=harness({});const modal=new ReviewDate({}, {title:'Book',review_html:'<p>My review</p>'},{});const result=modal.result();
 const done=modal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Done');done.click();assert.match(modal.error.textContent,/confirm/);
 modal.contentEl.settings.find(s=>s.name==='Date on Goodreads review').controls[0].change('2024-02-29');
 modal.contentEl.settings.find(s=>s.name==='Goodreads review URL').controls[0].change('https://www.goodreads.com/review/show/22');
 modal.contentEl.settings.find(s=>s.name==='I checked this date on my review').controls[0].change(true);done.click();
 assert.deepEqual(await result,{review:{date:'2024-02-29',source:'https://www.goodreads.com/review/show/22',confirmed:true}});
});
test('cancelling an import during lookup resolves promptly, never applies late results and cleans the captured CSV', async()=>{
 let complete,applied=0,cleaned=0;
 const {Importer}=harness({capture:async()=>({file:'private.csv',cleanup:async()=>cleaned++}),inspect:()=>new Promise(resolve=>complete=resolve),apply:async()=>applied++});
 const modal=new Importer({}),result=modal.result(),input=modal.contentEl.children.find(el=>el.tag==='input');input.files=[{name:'library.csv'}];const change=input.events.change();await new Promise(resolve=>setImmediate(resolve));await modal.close();assert.equal(await result,null);assert.equal(modal.controller.signal.aborted,true);assert.equal(applied,0);
 complete({summary:{counts:{finished:1,currently_reading:0,reviews:0}}});await change;await new Promise(resolve=>setImmediate(resolve));assert.equal(cleaned,1);assert.equal(applied,0);
});
test('publication review disables data-only publishing until initial page setup is committed',async()=>{
 const {Publication}=harness({});const modal=new Publication({}, {ready:false,branch:'newtheme',summary:['Add: Book'],changed:['_data/books.yml']});const result=modal.result();
 const publish=modal.contentEl.settings.flatMap(s=>s.controls).find(c=>c.text==='Publish');assert.equal(publish.disabled,true);publish.click();await modal.close();assert.equal(await result,null);
});
