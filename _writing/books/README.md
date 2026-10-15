# Books import and curation

The Books feature is implemented locally on `codex/books`, not released or installed in the active writing vault yet. The public preview is at `http://127.0.0.1:4180/books/`. The source-built PublishDesk 1.1 bundle includes three commands; a real Obsidian walkthrough remains a release check.

## Routine workflow after installation

- **PublishDesk: Manage books**: choose Read before you die, Currently reading or Reading history. Recommendations support title/author selection, up/down order and an optional plain-text blurb. Current books support show/hide and up/down. History supports search and show/hide, including books already hidden. Save locally writes only website choices. Cancel discards dialog edits. Reload saved choices discards unsaved edits and loads the latest data after a stale-save error.
- **PublishDesk: Import Goodreads library**: choose a full CSV export, review added/updated/removed records and shelf changes, then Apply locally. Removals require explicit acknowledgement. Updated review text is flagged for date verification: CSV does not contain review dates.
- **PublishDesk: Preview Books page**: builds public committed files plus saved Books inputs, without private drafts. Subsequent saved Books choices/imports refresh the full build; the existing live-reload server keeps the previous successful page and displays the error if an update fails. Stop website preview stops it.

These commands do not commit, upload, change Goodreads or modify Obsidian's personal-vault settings. A separate selected-Books publication workflow and cover/post-link management remain later work before release.

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
