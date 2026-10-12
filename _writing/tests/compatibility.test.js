'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const core=require('../lib/publishing');
const yaml={parse:JSON.parse,stringify:JSON.stringify};
async function fixture(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'writing-markdown-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));await core.git(root,'init');
 await fs.mkdir(path.join(root,'Drafts'));
 const note='Drafts/2026-10-12-check.md';
 const write=async(body,meta={title:'Test'})=>{const text=core.combine(meta,body,yaml);await fs.writeFile(path.join(root,note),text);return text;};
 return {root,note,write};
}
test('ordinary Markdown links, labels, titles, escapes and code survive preparation unchanged',async t=>{
 const {root,note,write}=await fixture(t);
 const body='# Heading\n\n[Readable title](https://wowashuwow.com/blog/other#heading "Optional title")\n[Docs](https://example.com/readme.md)\n[Same page](#heading)\n[Reference][ref]\n\n[ref]: https://wowashuwow.com/blog/other "Reference title"\n\n\\[[literal]]\n`[[example]] %%literal%%`\n```md\n![[image.png]]\n%%example%%\n```\n';
 const original=await write(body);const plan=await core.prepare(root,note,yaml,{preview:true});
 assert.equal(core.split(plan.text,yaml).body.replace(/\n?<!-- site-writer content: [a-f0-9]{64} -->\n?/g,''),body);
 assert.equal(await fs.readFile(path.join(root,note),'utf8'),original);
});
test('unsupported note links and hidden comments receive actionable errors without editing source',async t=>{
 const {root,note,write}=await fixture(t);
 for(const [body,message] of [
  ['[[Other]]',/ordinary Markdown/],['![[photo.png]]',/ordinary Markdown/],
  ['[Read](Other.md "title")',/published page URL/],
  ['[Read][other]\n\n[other]: Other.md#heading',/published page URL/],
  ['%%private thought%%\nPublic writing',/HTML comments/]
 ]) {const original=await write(body);await assert.rejects(core.prepare(root,note,yaml,{preview:true}),message);assert.equal(await fs.readFile(path.join(root,note),'utf8'),original);}
});
test('Markdown images migrate once and featured-only posts require no body embed',async t=>{
 const {root,note,write}=await fixture(t);const name=path.basename(note,'.md');
 const image=`Drafts/images/${name}/photo.png`;await fs.mkdir(path.dirname(path.join(root,image)),{recursive:true});await fs.writeFile(path.join(root,image),'test image bytes');
 const relative=`images/${name}/photo.png`;
 await write(`![Useful alt text](${relative} "Image title")\n`,{title:'Test',image:relative});
 let plan=await core.prepare(root,note,yaml,{preview:true});assert.equal(plan.assets.size,1);assert.match(plan.text,/!\[Useful alt text\]\(\.\.\/images\/.* "Image title"\)/);assert.equal(core.split(plan.text,yaml).meta.image,`/images/${name}/photo.png`);
 await write('Writing without a body image.\n',{title:'Test',image:relative});plan=await core.prepare(root,note,yaml,{preview:true});assert.equal(plan.assets.size,1);assert(!plan.text.includes('!['));
});
test('preview accepts an empty unpublished draft; publication requires explicit transition',async t=>{
 const {root,note,write}=await fixture(t);const original=await write('',{title:'Test',published:false});
 await assert.rejects(core.prepare(root,note,yaml),/no writing/);
 const plan=await core.prepare(root,note,yaml,{preview:true});assert.equal(core.split(plan.text,yaml).meta.published,undefined);assert.equal(await fs.readFile(path.join(root,note),'utf8'),original);
 await write('Public writing',{title:'Test',published:false});await assert.rejects(core.prepare(root,note,yaml),/published: false/);await core.prepare(root,note,yaml,{publishUnpublished:true});
});
