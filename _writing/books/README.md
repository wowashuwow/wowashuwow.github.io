# Books import and curation

PublishDesk 1.2.1 includes automatic cover fetching, optional cover/review-date corrections and Bookshelf publication. Released on 16 October 2026 through [PR #5](https://github.com/wowashuwow/wowashuwow.github.io/pull/5); Bookshelf is live at https://wowashuwow.com/bookshelf/. Use the authoring/publishing branch `newtheme`. The initial setup is released, so normal content-only Bookshelf publication is enabled. All routine commands work without AI, book-note plugins, paid services or API keys.

## Routine workflow after installation

1. Export a full Goodreads CSV from Goodreads, then run **PublishDesk: Import Goodreads library** and select it. PublishDesk validates the CSV and automatically fetches missing covers and available review-source links. Exact Goodreads IDs are the primary match; Open Library is the fallback. A bounded lookup shows progress and supports Cancel. No changes are applied during lookup.
2. Review the one import summary and choose **Apply locally** (acknowledge removals if any). The imported library and supplemental metadata are saved together with recovery. Existing ratings/reviews/eligibility rules and your recommendations, visibility, order, blurbs, links and cover choices are preserved. If a source is unavailable, other data can still import; existing covers are retained. An unchanged CSV still retries missing metadata.
3. Use **PublishDesk: Manage books** for optional editorial choices. Save locally applies them; Cancel discards them. The three sections and existing post-link picker work as before.
4. Run **PublishDesk: Preview Bookshelf page**. Saved choices/imports update the preview. Errors keep the last successful page visible. Stop website preview stops it. Saving/importing/previewing never uploads anything.
5. Run **PublishDesk: Publish Bookshelf changes**. It builds/checks the page, shows a human-readable summary, exact changed files and an optional public commit note. Publish uploads only saved Books data, referenced covers and a small generated `_data/books-publication.json` content marker. Unrelated edits, private exports, drafts and backups are excluded. Default commit subject: `Update Bookshelf`. An unchanged publication makes no commit.
6. Upload is distinct from deployment. **Check the last publication** confirms the expected content is live; **Retry the last failed upload** resumes the same commit after a network/push interruption. These shared commands also retain normal post behavior.

Before the initial feature release, publication review explicitly disables Publish: the live site needs the page/templates/navigation first. After setup is committed, routine content publication uses committed implementation plus only the reviewed data/covers. Wrong branches, staged files, divergence and changed inputs block upload with an explanation. Do not switch branches or edit Git staging during a publication.

### Covers and optional date corrections

Covers are normally fetched automatically. Fetched covers use trusted HTTPS provider URLs, avoiding bulk downloads and extra asset files; existing local covers remain supported. Reader requests omit referrers and failed image loads show the text fallback. Hosted images depend on their provider remaining available; the site's text/data and normal publishing do not require a cover response to render/build.

In Manage books, **Cover… -> Search automatically** offers source candidates if a cover is missing/wrong. **Use this cover -> Done -> Save locally** applies a choice. An exceptional file upload accepts JPEG/PNG/WebP up to 10 MB, normalizes one JPEG at no more than 440px wide/1200px tall without upscaling, and validates its decode/dimensions before saving under `images/books/`. It creates no source/thumbnail folder tree. **Use no cover** explicitly selects the text fallback; future imports respect that choice. No replacement, hide action or import deletes an existing shared image. Parent Cancel writes no image files.

**Retry missing data** in Manage books reruns source lookup without needing another CSV. Save/cancel unsaved edits first. Successful existing covers are not repeatedly downloaded. Failed/missing sources do not trigger per-book manual work; a later import or retry can resolve them. Ambiguous fallback results are not silently assigned to a different book.

Written reviews have **Review date…** for optional corrections. Open the review, enter its displayed date and URL, confirm and choose Done, then Save locally. Clear date returns the review to Date unknown and retains the useful source link. The field is not completion/date-added; it can be the displayed updated-review date. Goodreads RSS supplies source links but does not expose a timestamp proven to mean this review date, so no feed timestamp is silently substituted. Confirmed-date metadata stores a digest of the imported review; a later changed review produces an advisory status, never a mandatory editing task. Unknown dates never block publishing. Rating-only completion dates continue to come from the CSV.

All these actions are ordinary software operations, independent of a coding agent. No routine file editing, terminal commands, image downloading/resizing or AI assistance is required.

## Link writing to a book

Open Manage books, find the book in any section (hidden entries are included), then click its Blog posts button. Add a blog post opens a native title-search picker of committed, published posts. Dates/source references distinguish posts sharing a title. Select one or more, remove links or change their order. Done returns these changes to the manager; Cancel discards the child-dialog changes. **Save locally in the manager is still required**. Cancelling the manager discards all unsaved edits, including links.

A post can belong to several books, and a book can have several related posts. These can be essays, roundups or reflections; they are not automatically called reviews. Links appear under On the blog in every visible occurrence of the book, including recommendations. Title/URL changes resolve from Jekyll's posts on the next build; filename renames/deletions need manual repair. Unavailable references are shown in the manager, never silently discarded. Newly selected posts must still be published at save time. Publish a new blog post first, then reopen the manager (or Reload saved choices, which discards unsaved edits) to select it. Drafts and uncommitted new posts do not appear. No post front matter needs changing.

## What persists

`_data/books.yml` holds whitelisted imported facts; `_data/books-overrides.yml` holds website-owned choices by exact Goodreads ID. The CSV reconciliation never resets editorial overrides; the supplemental fetching step only fills missing eligible cover/source fields: recommendations, blurbs, visibility, ordering, covers, review dates and blog links survive. The same ID returning after removal restores its old choices. Different editions do not inherit preferences automatically.

Default import includes rated finished books and all current books. Explicitly recommended IDs are also included, even if unrated: the author-selected first Harry Potter book is the initial exception. It has no invented rating and is not placed in rated History. A recommended ID missing from the export blocks applying it; fix the export or explicitly unselect the recommendation first. Other removals require acknowledgement and preserve orphaned settings. New eligible current/history books default visible; new current books follow manually ordered books. Recommendations are always explicitly chosen. Current preferences do not affect History when a book is finished; if it becomes current again, its previous current preference applies.

History shows written reviews by verified displayed Goodreads review year/date, followed by rating-only records. Known completion dates are labelled Finished; never substitute date added or completion dates for review dates. Unknown review dates have their own group. Blurby notes are plain text, escaped in HTML; HTML/Markdown markup is not executed or interpreted.

## Safety and recovery

Validation rejects malformed/duplicate configuration, unsupported fields/types and symlinks. A change to the library or settings while a manager/import summary is open rejects the stale save/apply. Native actions use a private lock, recoverable multi-file transactions, atomic file replacement and private backups in `Drafts/.imports/goodreads/backups/`. Validation failures leave the saved state unchanged. Interrupted multi-file saves retain a durable private intent and recover known files on the next operation; unexpected external edits are preserved and reported for recovery. Request files and staged CSVs are private and removed when actions finish/cancel. A force-quit can leave temporary files in the private import folder; never expose or publish that folder. Private notes, want-to-read records and the raw CSV are never copied into public data.

## Developer commands

```sh
bundle exec ruby _writing/books/import.rb '/path/to/goodreads_library_export.csv'
```

Dry run is the default. Apply with `--apply`; acknowledged removals also need `--allow-removals`. The CLI uses the same recommendation rules. No-op imports leave the public data untouched.

```sh
bundle exec ruby _writing/tests/books-curation.test.rb
bundle exec ruby _writing/tests/books-render.test.rb
node --test --test-concurrency=1 _writing/tests/books-ui.test.js _writing/tests/books-bridge.test.js _writing/tests/books-fetch.test.js _writing/tests/books-publish.test.js
bundle exec ruby _writing/tests/books-metadata.test.rb
node _writing/setup.js --bundle-only /private/tmp/publishdesk-test-bundle
PUBLISHDESK_TEST_BUNDLE=/private/tmp/publishdesk-test-bundle/main.js node --test --test-concurrency=1 _writing/tests/*.test.js
bundle exec ruby _writing/books/check.rb /path/to/generated/site
```

The temporary bundle path avoids installing or altering an active vault while testing. Serial integration tests limit temporary disk use. Native Jekyll YAML/Liquid and the existing Ruby/Bundler/Nokogiri runtime are sufficient; no new build plugin or database.

The public page is now **Bookshelf**, at `/bookshelf/`. Ratings-only history is ordered by completion date (newest first), then title for ties; undated entries follow alphabetically. Goodreads date-added is never used as completion date. This applies automatically to future imports.

Implementation/recovery detail: [remaining workflow specification](../../docs/bookshelf-release-spec.md) and [source/provider audit](../../docs/bookshelf-fetch-audit.md). No existing public image or post URLs are moved by this feature.

### Interface update (1.2.1)

Manage books groups each book and its controls in its own panel; blurbs have wider fields. Task dialogs use the same action-footer layout. Cover/date changes marked unsaved still require Save locally; saving still does not publish. After refreshing installed files, reload PublishDesk in Obsidian (Settings → Community plugins, toggle PublishDesk off/on). No vault theme/settings changes or data migration are required.
