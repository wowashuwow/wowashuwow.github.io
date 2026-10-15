'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
function load(file,choice){
 const element=()=>({style:{},createEl:element,createDiv:element,empty(){},addEventListener(){}});
 class Modal{constructor(){this.contentEl=element();}open(){this.onOpen();queueMicrotask(()=>{this.resolve(choice);this.close();});}close(){this.onClose();}}
 class Setting{setName(){return this;}setDesc(){return this;}addButton(fn){fn({setButtonText(){return this;},onClick(){return this;},setCta(){return this;}});return this;}addText(fn){fn({setPlaceholder(){return this;},onChange(){return this;}});return this;}addToggle(fn){fn({setValue(){return this;},onChange(){return this;}});return this;}}
 const obsidian={Plugin:class{},Modal,Setting,Notice:class{},PluginSettingTab:class{},TFile:class{},MarkdownView:class{}};let module={exports:{}};let requireReal=createRequire(file);
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,require:n=>n==='obsidian'?obsidian:requireReal(n),Buffer,setTimeout,clearTimeout,queueMicrotask,URL,Blob,console});return module.exports;
}
test('installed bundle loads without executing an Obsidian action',()=>{assert.equal(typeof load(process.env.PUBLISHDESK_TEST_BUNDLE || path.resolve(__dirname,'../../.obsidian/plugins/site-writer/main.js'),null),'function');});
test('featured-only import, same-file body insertion, deduplication, collision suffixes and cancel preserve files',async()=>{
 let choice;const main=path.resolve(__dirname,'../main.js');const Writer=load(main,{get imported(){return choice.imported;},get insert(){return choice.insert;},get path(){return choice.path;},set path(v){choice.path=v;}});
 const note={path:'Drafts/2026-10-12-test.md',basename:'2026-10-12-test'},files=new Map(),meta={},writes=[];
 const writer=new Writer();writer.settings={imageProperty:'image'};writer.current=async()=>note;writer.validateImage=async()=>{};
 writer.app={vault:{getFiles:()=>[],getAbstractFileByPath:p=>files.has(p)?{path:p,name:path.basename(p)}:null,createFolder:async p=>files.set(p,null),readBinary:async f=>files.get(f.path),createBinary:async(p,b)=>files.set(p,Buffer.from(b)),process:async(n,fn)=>writes.push(fn('Body'))},fileManager:{processFrontMatter:async(n,fn)=>fn(meta),generateMarkdownLink:f=>`[Alt](${f.path})`},workspace:{getActiveViewOfType:()=>({editor:{}})}};
 const file={name:'photo.png',size:3,type:'image/png',arrayBuffer:async()=>Buffer.from('one')};choice={imported:file,insert:false};await writer.featured();assert.equal(writes.length,0);assert.equal(files.size,2);
 choice={imported:file,insert:true};await writer.featured();assert.equal(files.size,2);assert.equal(writes.length,1);assert.match(writes[0],/!\[Alt\]/);
 choice={imported:{...file,arrayBuffer:async()=>Buffer.from('two')},insert:false};await writer.featured();assert.equal(files.size,3);assert.match(meta.image,/photo-1.png$/);
 choice={path:'',insert:false};await writer.featured();assert.equal(meta.image,undefined);assert.equal(files.size,3);
 writer.validateImage=async()=>{throw Error('Invalid image');};choice={imported:file,insert:false};await assert.rejects(writer.featured(),/Invalid image/);assert.equal(files.size,3);
 const CancelWriter=load(main,null);const cancel=new CancelWriter();cancel.current=async()=>note;cancel.app=writer.app;cancel.settings=writer.settings;await cancel.featured();assert.equal(files.size,3);
});

test('cancelling draft cleanup never trashes a note or attachment',async()=>{
 const fsp=require('node:fs/promises'),os=require('node:os'),core=require('../lib/publishing');
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'cleanup-cancel-'));
 try {await core.git(root,'init');await fsp.mkdir(path.join(root,'Drafts'));const note='Drafts/2026-10-12-cancel.md';await fsp.writeFile(path.join(root,note),'Private draft');
 const Writer=load(path.resolve(__dirname,'../main.js'),false);const writer=new Writer();writer.root=root;writer.current=async()=>({path:note});let count=0;writer.app={vault:{trash:async()=>count++}};await writer.deleteDraft();assert.equal(count,0);assert.equal(await fsp.readFile(path.join(root,note),'utf8'),'Private draft');
 }finally{await fsp.rm(root,{recursive:true,force:true});}
});
