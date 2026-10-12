'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../lib/publishing'),{planCleanup,executeCleanup}=require('../lib/cleanup');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'draft-cleanup-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await core.git(root,'init');
 const note='Drafts/2026-10-12-delete-test.md',folder='Drafts/images/2026-10-12-delete-test',trashed=[];
 const write=async(file,text='image bytes')=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);};
 await write(note,'---\ntitle: Test\nimage: images/2026-10-12-delete-test/featured.png\n---\nBody');
 const app={vault:{getAbstractFileByPath:relative=>({path:relative}),trash:async(file,system)=>{assert.equal(system,true);trashed.push(file.path);let to=path.join(root,'.trash',file.path);if(await core.exists(to))to+='-empty-'+trashed.length;await fs.mkdir(path.dirname(to),{recursive:true});await fs.rename(path.join(root,file.path),to);}}};
 return {root,note,folder,write,app,trashed};
}
test('draft cleanup includes featured-only, abandoned and nested images; preserves public reuse; trashes empty folders',async t=>{
 const f=await fixture(t);for(const name of ['featured.png','abandoned.png','nested/body.png'])await f.write(f.folder+'/'+name);
 await f.write('images/published.jpg');await f.write('_posts/existing.md','image: /images/published.jpg');
 const plan=await planCleanup(f.root,f.note);assert.equal(plan.remove.length,3);let stopped=false;
 const result=await executeCleanup(f.app,f.root,plan,{beforeDelete:async()=>{stopped=true;}});assert(stopped);assert.equal(result.removed,3);assert(!await core.exists(path.join(f.root,f.folder)));assert(await core.exists(path.join(f.root,'images/published.jpg')));assert(await core.exists(path.join(f.root,'.trash',f.note)));assert(f.trashed.every(p=>p.startsWith('Drafts/')));
});
test('all source formats and encoded names preserve potentially shared attachments',async t=>{
 const f=await fixture(t);const refs={
  'Drafts/other.md':'image: '+f.folder+'/featured.png',
  '_posts/other.md':'![shared](../'+f.folder+'/body.png)',
  '_includes/example.html':'<img src="{{ site.baseurl }}/'+f.folder+'/liquid.png">',
  '_data/settings.yml':'photo: '+f.folder+'/gallery.png',
  'style.css':'background:url('+f.folder+'/space%20name.png)',
  'entities.html':'<img src="'+f.folder+'/a&amp;b.png">',
  'notes.canvas':JSON.stringify({file:f.folder+'/canvas.png'}),
  'Drafts/.published-backups/old.md':'image: '+f.folder+'/backup.png'
 };
 for(const [file,text]of Object.entries(refs))await f.write(file,text);
 for(const name of ['featured.png','body.png','liquid.png','gallery.png','space name.png','canvas.png','backup.png','a&b.png','unused.png'])await f.write(f.folder+'/'+name);
 const plan=await planCleanup(f.root,f.note);assert.deepEqual(plan.remove,[f.folder+'/unused.png']);assert.equal(plan.keep.length,8);
 await executeCleanup(f.app,f.root,plan);assert(await core.exists(path.join(f.root,f.folder)));for(const item of plan.keep)assert(await core.exists(path.join(f.root,item.path)));
});
test('leftover folders can be reviewed without a draft; live or published counterparts are protected',async t=>{
 const f=await fixture(t);await f.write(f.folder+'/leftover.png');await fs.unlink(path.join(f.root,f.note));
 const plan=await planCleanup(f.root,f.note,{allowMissing:true});assert.equal(plan.notePath,null);await executeCleanup(f.app,f.root,plan);assert(!await core.exists(path.join(f.root,f.folder)));
 await f.write(f.note,'live draft');await assert.rejects(planCleanup(f.root,f.note,{allowMissing:true}),/still exists/);await fs.unlink(path.join(f.root,f.note));await f.write('_posts/2026-10-12-delete-test.md','published');await assert.rejects(planCleanup(f.root,f.note,{allowMissing:true}),/published post/);
});
test('changed references, added files and changed draft abort before any trash operation',async t=>{
 const f=await fixture(t);await f.write(f.folder+'/featured.png');let plan=await planCleanup(f.root,f.note);
 await f.write('Drafts/other.md','image: '+f.folder+'/featured.png');await assert.rejects(executeCleanup(f.app,f.root,plan),/Files changed/);assert.equal(f.trashed.length,0);
 plan=await planCleanup(f.root,f.note);await f.write(f.folder+'/new.png');await assert.rejects(executeCleanup(f.app,f.root,plan),/Files changed/);assert.equal(f.trashed.length,0);
 plan=await planCleanup(f.root,f.note);await f.write(f.note,'revised draft');await assert.rejects(executeCleanup(f.app,f.root,plan),/Files changed/);assert.equal(f.trashed.length,0);
});
test('new references during deletion preserve attachments',async t=>{
 const f=await fixture(t);await f.write(f.folder+'/featured.png');const plan=await planCleanup(f.root,f.note);const trash=f.app.vault.trash;
 f.app.vault.trash=async(file,system)=>{await trash(file,system);if(file.path===f.note)await f.write('Drafts/new.md','image: '+f.folder+'/featured.png');};
 const result=await executeCleanup(f.app,f.root,plan);assert.equal(result.removed,0);assert(await core.exists(path.join(f.root,f.folder+'/featured.png')));
});
test('published notes, traversal, tracked files and symlinks are protected',async t=>{
 const f=await fixture(t);await assert.rejects(planCleanup(f.root,'_posts/article.md'),/private notes/);await assert.rejects(planCleanup(f.root,'Drafts/../article.md'),/private notes/);
 await f.write(f.folder+'/tracked.png');await core.git(f.root,'add','--',f.folder+'/tracked.png');let plan=await planCleanup(f.root,f.note);assert.equal(plan.remove.length,0);assert.match(plan.keep[0].reason,/Tracked/);
 await fs.symlink(path.join(f.root,'images'),path.join(f.root,f.folder,'link'));plan=await planCleanup(f.root,f.note);assert(plan.keep.some(item=>item.path.endsWith('/link')));
 await core.git(f.root,'add','--',f.note);await assert.rejects(planCleanup(f.root,f.note),/tracked by Git/);
});
