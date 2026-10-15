'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
async function dialog(notePath,note,button) {
 const file=process.env.PUBLISHDESK_TEST_BUNDLE || path.resolve(__dirname,'../../.obsidian/plugins/site-writer/main.js');
 const realRequire=createRequire(file),buttons=new Map(),text=[],attributes={};let change;
 const element=()=>({createEl:(tag,options)=>{if(options?.text)text.push(options.text);return element();},empty(){}});
 class Modal {constructor(){this.contentEl=element();}open(){this.onOpen();queueMicrotask(()=>{change(note);buttons.get(button)();});}close(){this.onClose();}}
 class Setting {setName(){return this;}setDesc(){return this;}addTextArea(fn){fn({inputEl:{setAttribute:(k,v)=>attributes[k]=v},setPlaceholder(){return this;},onChange(fn){change=fn;return this;}});return this;}addButton(fn){let label;fn({setButtonText(v){label=v;return this;},setCta(){return this;},onClick(fn){buttons.set(label,fn);return this;}});return this;}}
 const obsidian={Plugin:class{},PluginSettingTab:class{},Modal,Setting};const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8')+'\nmodule.exports=Confirm;',{module,require:n=>n==='obsidian'?obsidian:realRequire(n),Buffer,console,queueMicrotask});
 const result=await new module.exports({}, {title:'Test post',notePath,target:'_posts/test.md',assets:new Map()}).result();
 return {result,text,attributes};
}
test('installed publication dialog shows subject and forwards optional multiline note for drafts and updates',async()=>{
 for(const notePath of ['Drafts/test.md','_posts/test.md']){
  const note='Context.\n\nSecond paragraph.';const {result,text,attributes}=await dialog(notePath,note,'Publish');
  assert.equal(result.note,note);assert(text.includes(`Commit: ${notePath.startsWith('_posts/')?'Update':'Publish'}: Test post`));assert.equal(attributes['aria-label'],'Publication note (optional)');
 }
 const blank=await dialog('Drafts/test.md','','Publish');assert.equal(blank.result.note,'');
 const cancel=await dialog('Drafts/test.md','Never commit this.','Cancel');assert.equal(cancel.result,false);
});
