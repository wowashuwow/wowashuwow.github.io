# Books: related blog-post management

15 October 2026. Approved scope: implement book-to-post linking in the existing PublishDesk manager, audit remaining workflow gaps, recommend a page name without renaming it.

## UX and storage

Each book row in all three manager sections gets a Blog posts button with its link count. Hidden current/history books remain manageable. Open a focused child dialog showing the book title and selected posts, with Add a blog post, remove and up/down controls. A native fuzzy picker searches actual published post titles; include publication date and source reference to distinguish duplicate titles. Selecting an already-linked post is prevented. The child dialog uses Done (update the parent dialog's unsaved choices) and Cancel (discard child edits). Only the parent Save locally writes files. Cancelling the parent discards all edits. No new commands, post properties, database or public editing UI.

Use existing overrides[id].posts, an ordered list of stable post source filenames. Resolve display titles and URLs through Jekyll. Relationships are many-to-many; they are not labelled reviews. Display On the blog in recommendation entries too. No content matching or tag inference. Link editing never changes the post itself, rating, Goodreads status, visibility, recommendation blurb or any other association. Goodreads re-import never rewrites overrides.

## Publication catalogue and validation

Build the picker catalogue from the current Git HEAD's committed _posts and _config.yml, read by Jekyll in an isolated temporary source with safe mode. Include only posts Jekyll considers published (exclude published:false and future posts under the site's normal configuration). Private Drafts/_drafts and uncommitted new posts cannot appear. Use filename references, actual Jekyll title/URL, and date; no guessed slugs. Discard temporary catalogue files after reading. Catalogue generation failure must be visible, not silently interpreted as no posts.

Re-read the catalogue when saving link changes. Added references must still be published. Existing unresolved references remain visible as unavailable and may be removed/replaced without silently losing them. Existing unchanged orphan settings remain recoverable. Settings token/stale-save protection, strict YAML/path validation, atomic write and private backups remain in force; cover/date fields remain protected. Reject duplicate refs, path traversal and newly linked unpublished/deleted refs. Post title/URL edits resolve automatically on preview. Source-file renames require explicit repair; do not guess the intended replacement. Books output validation flags unresolved configured links. New import leaves every association unchanged.

## Preview, installation and verification

Watch published-post changes while a Books preview is running, because a publication can change catalogue titles/URLs and available links. Keep full isolated preview builds, last-good-output recovery and no automatic publish. Test UI add/remove/order, duplicate exclusion, shared posts, hidden books, both cancellation levels and stale saves; test catalogue custom permalinks, duplicate titles, Unicode, unpublished/future/private/uncommitted posts; test new missing refs rejected, old missing refs retained/removable, other fields protected and import retention. Render/check related links in all visible instances without duplicate IDs.

Work in the already-authorized main-vault local test installation, backing up affected implementation/plugin files first. Preserve main-vault Books data and new Harry Potter blurb. Refresh the plugin only after checks pass. Sync implementation back to the existing codex/books branch without overwriting main-vault curation. No push/deployment. Native installed-dialog walkthrough and user test instructions complete this step.

## Workflow audit / remaining release work

- Cover replacement/quality management: still needs a user-facing control; current imported thumbnails remain.
- Verified Goodreads review-date correction: still needs a control; CSV cannot supply dates. Unknown dates must stay unknown.
- Books-specific publication with exact-file review: still unfinished; Save/import/preview remain local.
- Authored Goodreads status-update archive: later agreed scope, not part of linking.
- Books absent from eligible imports have no per-book shelf entry by design; existing Books-tag archive still exposes writing. Do not fabricate records or import all unrated books.
- This task does not change review display policy: author decided to keep Goodreads mini reviews and independent longer blog writing.

## Documentation/research

Use native Obsidian Modal, Setting and FuzzySuggestModal APIs and native Jekyll document reading. Current references: https://docs.obsidian.md/Plugins/User+interface/Modals ; https://github.com/obsidianmd/obsidian-api ; https://jekyllrb.com/docs/posts/ ; https://jekyllrb.com/docs/configuration/options/ . Naming examples: Patrick Collison /bookshelf and Ben Cuan's bookshelf; Booklog suggests a reading journal rather than a curated shelf. Name recommendation only; retain /books/.
