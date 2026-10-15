# Books import and curation

PublishDesk 1.1.2 is installed locally in this website vault for testing (16 October). The Books feature originates on `codex/books`; its files are copied into this vault as uncommitted local changes on `newtheme`. No merge, push or deployment has occurred. Use the three commands below. The installed plugin opened Manage books with the real library and built its Books preview successfully. User testing of visibility, ordering, blurb changes and CSV import remains before release. Books publication is not implemented yet.

## Routine workflow after installation

- **PublishDesk: Manage books**: choose Read before you die, Currently reading or Reading history. Recommendations support title/author selection, up/down order and an optional plain-text blurb. Current books support show/hide and up/down. History supports search and show/hide, including books already hidden. Save locally writes only website choices. Cancel discards dialog edits. Reload saved choices discards unsaved edits and loads the latest data after a stale-save error.
- **PublishDesk: Import Goodreads library**: choose a full CSV export, review added/updated/removed records and shelf changes, then Apply locally. Removals require explicit acknowledgement. Updated review text is flagged for date verification: CSV does not contain review dates.
- **PublishDesk: Preview Bookshelf page**: builds public committed files plus saved Books inputs, without private drafts. Subsequent saved Books choices/imports refresh the full build; the existing live-reload server keeps the previous successful page and displays the error if an update fails. Stop website preview stops it.

These commands do not commit, upload, change Goodreads or modify Obsidian's personal-vault settings. A separate selected-Books publication workflow, cover replacement/quality and verified review-date management remain later work before release.

## Link writing to a book

Open Manage books, find the book in any section (hidden entries are included), then click its Blog posts button. Add a blog post opens a native title-search picker of committed, published posts. Dates/source references distinguish posts sharing a title. Select one or more, remove links or change their order. Done returns these changes to the manager; Cancel discards the child-dialog changes. **Save locally in the manager is still required**. Cancelling the manager discards all unsaved edits, including links.

A post can belong to several books, and a book can have several related posts. These can be essays, roundups or reflections; they are not automatically called reviews. Links appear under On the blog in every visible occurrence of the book, including recommendations. Title/URL changes resolve from Jekyll's posts on the next build; filename renames/deletions need manual repair. Unavailable references are shown in the manager, never silently discarded. Newly selected posts must still be published at save time. Publish a new blog post first, then reopen the manager (or Reload saved choices, which discards unsaved edits) to select it. Drafts and uncommitted new posts do not appear. No post front matter needs changing.

## What persists

`_data/books.yml` holds whitelisted imported facts; `_data/books-overrides.yml` holds website-owned choices by exact Goodreads ID. An import never rewrites overrides: recommendations, blurbs, visibility, ordering, covers, review dates and blog links survive. The same ID returning after removal restores its old choices. Different editions do not inherit preferences automatically.

Default import includes rated finished books and all current books. Explicitly recommended IDs are also included, even if unrated: the author-selected first Harry Potter book is the initial exception. It has no invented rating and is not placed in rated History. A recommended ID missing from the export blocks applying it; fix the export or explicitly unselect the recommendation first. Other removals require acknowledgement and preserve orphaned settings. New eligible current/history books default visible; new current books follow manually ordered books. Recommendations are always explicitly chosen. Current preferences do not affect History when a book is finished; if it becomes current again, its previous current preference applies.

History shows written reviews by verified displayed Goodreads review year/date, followed by rating-only records. Known completion dates are labelled Finished; never substitute date added or completion dates for review dates. Unknown review dates have their own group. Blurby notes are plain text, escaped in HTML; HTML/Markdown markup is not executed or interpreted.

## Safety and recovery

Validation rejects malformed/duplicate configuration, unsupported fields/types and symlinks. A change to the library or settings while a manager/import summary is open rejects the stale save/apply. Native actions use a private lock, atomic file replacement and recoverable backups in `Drafts/.imports/goodreads/backups/`. Import/settings writes preserve the prior files on validation or disk-write failure. Request files and staged CSVs are private and removed when actions finish/cancel. A force-quit can leave temporary files in the private import folder; never expose or publish that folder. Private notes, want-to-read records and the raw CSV are never copied into public data.

## Developer commands

```sh
bundle exec ruby _writing/books/import.rb '/path/to/goodreads_library_export.csv'
```

Dry run is the default. Apply with `--apply`; acknowledged removals also need `--allow-removals`. The CLI uses the same recommendation rules. No-op imports leave the public data untouched.

```sh
bundle exec ruby _writing/tests/books-curation.test.rb
bundle exec ruby _writing/tests/books-render.test.rb
node --test _writing/tests/books-ui.test.js _writing/tests/books-bridge.test.js
node _writing/setup.js --bundle-only /private/tmp/publishdesk-test-bundle
PUBLISHDESK_TEST_BUNDLE=/private/tmp/publishdesk-test-bundle/main.js node --test --test-concurrency=1 _writing/tests/*.test.js
bundle exec ruby _writing/books/check.rb /path/to/generated/site
```

The temporary bundle path avoids installing or altering an active vault while testing. Serial integration tests limit temporary disk use. Native Jekyll YAML/Liquid and the existing Ruby/Bundler/Nokogiri runtime are sufficient; no new build plugin or database.

The public page is now **Bookshelf**, at `/bookshelf/`. Ratings-only history is ordered by completion date (newest first), then title for ties; undated entries follow alphabetically. Goodreads date-added is never used as completion date. This applies automatically to future imports.
