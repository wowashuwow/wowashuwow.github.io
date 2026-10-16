'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const publisher = require('../lib/books-publish');
const core = require('../lib/publishing');
const yaml = { parse: JSON.parse };
async function fixture() {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'books publish-'))), root = path.join(base, 'vault'), remote = path.join(base, 'remote.git');
  await fs.mkdir(root); await fs.mkdir(path.join(root, '_data')); await fs.mkdir(path.join(root, '_pages')); await fs.mkdir(path.join(root, 'images/books'), { recursive: true });
  const source = path.resolve(__dirname, '../..');
  await fs.cp(path.join(source, '_writing/books'), path.join(root, '_writing/books'), { recursive: true });
  for (const file of ['Gemfile', 'Gemfile.lock', '.ruby-version']) await fs.copyFile(path.join(source, file), path.join(root, file));
  await fs.writeFile(path.join(root, '_pages/books.html'), 'permalink: /bookshelf/\n<!-- publishdesk-books: -->');
  await fs.writeFile(path.join(root, '_data/books.yml'), JSON.stringify([{ id: '12', title: 'Book', author: 'Author', status: 'read', rating: 4, source_url: 'https://www.goodreads.com/book/show/12' }]));
  await fs.writeFile(path.join(root, '_data/books-overrides.yml'), JSON.stringify({ '12': { cover: '/images/books/12.jpg' } }));
  await fs.writeFile(path.join(root, 'images/books/12.jpg'), Buffer.from([255, 216, 255, 217]));
  await core.git(root, 'init', '-b', 'newtheme'); await core.git(root, 'config', 'user.name', 'Books Test'); await core.git(root, 'config', 'user.email', 'books@example.invalid');
  await core.git(root, 'add', '_data', '_pages', 'images', '_writing', 'Gemfile', 'Gemfile.lock', '.ruby-version'); await core.git(root, 'commit', '-m', 'Initial setup');
  await core.git(root, 'init', '--bare', remote); await core.git(root, 'remote', 'add', 'newtheme', remote); await core.git(root, 'push', 'newtheme', 'newtheme');
  return { root, remote, cleanup: () => fs.rm(base, { recursive: true, force: true }) };
}
const checked = plan => ({ head: plan.head, fingerprint: plan.fingerprint });
test('Books commit includes only checked data, referenced covers and generated marker, preserving unrelated edits and public notes', async () => {
  const f = await fixture();
  try {
    await fs.writeFile(path.join(f.root, '_data/books-overrides.yml'), JSON.stringify({ '12': { cover: '/images/books/12.jpg', history_hidden: true } }));
    await fs.writeFile(path.join(f.root, 'unrelated.txt'), 'untracked work');
    const plan = await publisher.prepare(f.root, yaml);
    assert.equal(plan.ready, true); assert.match(plan.summary.join('\n'), /history visibility/);
    await assert.rejects(publisher.publish(plan), /Build and check/);
    const result = await publisher.publish(plan, { checked: checked(plan), note: 'Hide this entry\nKeep its source data.' });
    assert.equal(result.phase, 'uploaded'); assert.equal(result.kind, 'books');
    const changed = (await core.git(f.root, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD')).trim().split('\n');
    assert.deepEqual(changed.sort(), ['_data/books-overrides.yml', '_data/books-publication.json'].sort());
    assert.equal(await fs.readFile(path.join(f.root, 'unrelated.txt'), 'utf8'), 'untracked work');
    assert.match(await core.git(f.root, 'log', '-1', '--format=%B'), /Update Bookshelf\n\nHide this entry\nKeep its source data\./);
    assert.deepEqual((await publisher.prepare(f.root, yaml)).changed, []);
  } finally { await f.cleanup(); }
});
test('stale data, wrong branch, existing staged files and unreleased setup stop before commit/upload', async () => {
  const f = await fixture();
  try {
    const original = (await core.git(f.root, 'rev-parse', 'HEAD')).trim();
    let plan = await publisher.prepare(f.root, yaml);
    await fs.writeFile(path.join(f.root, '_data/books-overrides.yml'), JSON.stringify({ '12': { recommended: true } }));
    await assert.rejects(publisher.publish(plan, { checked: checked(plan) }), /changed after review/);
    plan = await publisher.prepare(f.root, yaml);
    await core.git(f.root, 'add', '_data/books-overrides.yml');
    await assert.rejects(publisher.publish(plan, { checked: checked(plan) }), /already staged/);
    await core.git(f.root, 'reset', '--quiet'); await core.git(f.root, 'switch', '-c', 'development');
    await assert.rejects(publisher.publish(plan, { checked: checked(plan) }), /development branch/);
    assert.equal((await core.git(f.root, 'rev-parse', 'HEAD')).trim(), original);
    await assert.rejects(publisher.publish({ ...plan, ready: false }, { checked: checked(plan) }), /setup/);
  } finally { await f.cleanup(); }
});
test('rejected push is recoverable and retry uploads the same commit after new local editorial edits', async () => {
  const f = await fixture();
  try {
    const plan = await publisher.prepare(f.root, yaml);
    const hook = path.join(f.remote, 'hooks/pre-receive'); await fs.writeFile(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    await assert.rejects(publisher.publish(plan, { checked: checked(plan) }), /committed locally/);
    const failed = await publisher.state(f.root); assert.equal(failed.phase, 'committed');
    await assert.rejects(publisher.prepare(f.root, yaml), /not finished uploading/);
    await fs.writeFile(path.join(f.root, '_data/books-overrides.yml'), JSON.stringify({ '12': { recommended: true } }));
    await fs.unlink(hook);
    const result = await publisher.retry(f.root); assert.equal(result.commit, failed.commit); assert.equal(result.phase, 'uploaded');
    assert.equal((await core.git(f.root, 'rev-list', '--count', 'HEAD')).trim(), '2');
    assert.match(await fs.readFile(path.join(f.root, '_data/books-overrides.yml'), 'utf8'), /recommended/);
    assert.equal((await core.git(f.root, 'diff', '--name-only')).trim(), '_data/books-overrides.yml');
  } finally { await f.cleanup(); }
});
test('live marker beats cancelled/superseded deployment; old HTTP 200 alone is never success',()=>{
 const intent={fingerprint:'abc',commit:'sha'};const runs={workflow_runs:[{name:'pages build and deployment',head_sha:'sha',status:'completed',conclusion:'cancelled'}]};
 assert.equal(publisher.publicationStatus(intent,{status:200,text:'old page'},runs).status,'pending');
 assert.equal(publisher.publicationStatus(intent,{status:200,text:'<!-- publishdesk-books: abc -->'},runs).status,'live');
 runs.workflow_runs[0].conclusion='failure';assert.equal(publisher.publicationStatus(intent,{status:404,text:''},runs).status,'failed');
});
test('restart recovery handles interruption after durable intent but before branch update',async()=>{
 const f=await fixture(),originalGit=core.git;
 try{
  const plan=await publisher.prepare(f.root,yaml);let blocked=false;
  core.git=async(root,...args)=>{if(args[0]==='update-ref'&&!blocked){blocked=true;throw Error('simulated interruption');}return originalGit(root,...args);};
  await assert.rejects(publisher.publish(plan,{checked:checked(plan)}),/simulated interruption/);core.git=originalGit;
  const intent=await publisher.state(f.root);assert.equal(intent.phase,'prepared');assert.equal((await core.git(f.root,'rev-parse','HEAD')).trim(),intent.before);
  const result=await publisher.retry(f.root);assert.equal(result.commit,intent.commit);assert.equal((await core.git(f.root,'rev-list','--count','HEAD')).trim(),'2');
 }finally{core.git=originalGit;await f.cleanup();}
});
