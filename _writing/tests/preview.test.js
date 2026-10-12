'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');const {PreviewSession}=require('../lib/preview');
test('persistent preview swaps full builds, disables integrations, delivers reload events and retains last good output on failure',async t=>{
 const session=new PreviewSession();t.after(()=>session.close());let root=path.resolve(__dirname,'../..');
 // Reuse the historical draft destination to exercise its preview lifecycle.
 const plan=(title,body)=>({root,target:'_posts/2026-8-23-the-guilt-of-fitness.md',text:`---\nlayout: post\ntitle: ${title}\n---\n\n${body}\n`,assets:new Map()});
 const first=await session.update(plan('Preview first','FIRST BODY'));let html=await(await fetch(first)).text();assert(html.includes('FIRST BODY'));assert(!html.includes('disqus.com/embed'));assert(!html.includes('googletagmanager.com/gtag'));assert(html.includes('EventSource'));assert.equal((await fetch(first)).headers.get('x-robots-tag'),'noindex, nofollow');
 const second=await session.update(plan('Preview second','SECOND BODY'));assert.equal(new URL(first).origin,new URL(second).origin);html=await(await fetch(second)).text();assert(html.includes('SECOND BODY'));const archive=await(await fetch(session.address+'/blog/')).text();assert(archive.includes('Preview second'));
 await assert.rejects(session.update(plan('Broken','{% invalid_tag %}')),/validation failed/);assert((await(await fetch(second)).text()).includes('SECOND BODY'));
 await session.update(plan('Recovered','RECOVERED BODY'));assert((await(await fetch(session.address+session.url)).text()).includes('RECOVERED BODY'));
 assert.equal((await fs.readdir(session.temp)).filter(n=>/^site(?:-|$)/.test(n)).length,1);
});
