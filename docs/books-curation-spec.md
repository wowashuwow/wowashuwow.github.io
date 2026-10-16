# Books curation specification

15 October 2026. Local implementation on `codex/books`; no production release or active-vault installation in this step.

## Outcome and design

The Books page has three sections in order: **Read before you die**, **Currently reading**, **Reading history**. Keep the existing typography, colours, covers and inline review disclosures. Recommendations use a restrained two-column cover-and-text layout on desktop, one column on phones, with room for the author's short personal blurbs. No fabricated blurbs, rating-based recommendations, carousel or extra marketing copy. Current books retain their horizontal shelf. History retains written reviews grouped by verified review year above rating-only entries. Show known completion dates on finished entries, clearly distinguished from review dates.

Seed recommendations in the author's order: Carol Dweck's *Mindset: The New Psychology of Success*; Kiran Nagarkar's *Cuckold*; the first Harry Potter book only; Larry McMurtry's *Lonesome Dove*. Use exact imported Goodreads editions. The first Harry Potter book is an explicit exception to excluding unrated finished books; do not invent a rating or import every unrated book.

## Source of truth

Keep the two existing public files. `_data/books.yml` holds whitelisted Goodreads facts; `_data/books-overrides.yml` holds site-owned cover/post links, review dates and editorial choices keyed by Goodreads edition ID. No new database, reading-tracker plugin, book notes or build plugin. Native Jekyll renders these files on GitHub Pages.

New per-book override fields: `recommended` boolean (default false), `recommendation_order` integer, `recommendation_blurb` plain text (default absent), `currently_reading_hidden` boolean (default false), `currently_reading_order` integer, `history_hidden` boolean (default false). Orders are 0–999998; unspecified entries sort afterward by title/ID. No arrays keyed by list positions; never identify a book by its mutable title or ISBN.

- Recommendation membership/order is independent of ratings and shelf. It may repeat a book in history. It does not confer a star rating.
- Current visibility/order applies only while Goodreads marks the book currently reading. Finishing it removes it from Current automatically. A stale current preference cannot hide it from History.
- History visibility applies only to rated finished books. Hiding is reversible and never deletes source data, reviews, assets or Goodreads records. Reviews and rating-only books use the same history visibility control.
- New eligible imports default visible, after manually ordered current books. Recommendations require explicit selection. Hiding a current book, then finishing/restarting it, preserves the old current visibility preference; the manager makes that choice visible and editable.
- Removed/ineligible non-recommended books leave the data only after import removal acknowledgement. Their overrides are retained indefinitely, so the same ID returning restores prior choices. Do not silently migrate preferences to a different edition with a similar title. Show unresolved IDs in management.
- Recommended books are included from the CSV even if unrated/ineligible for history. If any recommended ID is missing from the export, refuse to apply it and identify the missing recommendation. Resolve the export/edition or explicitly remove the recommendation before retrying. This is simpler and safer than silently retaining stale ratings or deleting curated selections.

## Local management UX

One PublishDesk **Manage books** command opens three section views. Recommendation view supports selecting an imported book, removing it, moving it up/down and optional plain-text blurb. Current view supports show/hide and up/down. History view searches title/author and supports show/hide, including already hidden entries. Use labelled native controls, keyboard-operable buttons and explicit Save/Cancel. Save affects local files only; a book excluded from one section remains eligible in another. Show missing-ID configuration warnings, never delete them automatically. Reopening after a failed save must show the unchanged saved configuration.

Keep imported facts read-only. Reuse existing native Obsidian APIs and installed Ruby/Bundler runtime. Import uses a native CSV file picker, prints additions/changes/removals and curated status transitions before Apply; cancel leaves files untouched. Management cannot change Goodreads. A private local Books preview builds the whole site with no analytics/comments and no private drafts included; failure keeps the previous successful preview. Publication remains a separate reviewed action; no save/import triggers a commit or upload.

## Dates and content safety

`date_read` is completion, not review publication. Review dates come from verified review pages, stored with exact source URLs, and may represent Goodreads' updated review date. CSV alone cannot refresh them. New reviews without verified dates go under Date unknown. Existing date metadata survives imports; report changed review text for date verification. An absent completion date renders no invented date. Year groupings work for future years without hardcoding.

Blurbs are plain text, length-limited, escaped on the website. Imported review HTML remains sanitized by the existing importer. Spoiler disclosures stay closed by default. Repeated recommendations/history entries have unique DOM IDs and accessible heading structure. Covers remain proportional; omitted covers use the existing fallback. Empty sections do not leave empty headings/scroll controls. Site-wide URLs, existing posts and blog publishing stay unchanged.

## Failure handling and verification

1. Reimport same export: no output rewrite; overrides byte-identical. New books, shelf changes, title/rating/review updates and CSV reorder must preserve all manual fields. Removal/reappearance restores preferences. Distinct editions stay distinct.
2. Corrupt CSV/YAML, duplicate IDs, invalid dates/ratings, unexpected fields/types, missing pinned recommendations and symlinks: reject before replacing files. Never repair by discarding configuration.
3. Open manager/import summary while another action changes library/settings: reject stale save/apply; ask to reload the current state. Serialize local actions; atomic same-directory replacement with recoverable private backups and state recheck before rename. Failed validation/write must preserve the original file.
4. Failed import, cancelled dialog, build failure or unavailable Ruby/Bundler: persistent useful error; no partial upload, blank preview or preference reset. Raw CSV, backups, locks and logs stay private and excluded from generated output/Git.
5. Test recommendations overlapping other sections, hidden first/last/all items, no recommendations, future/unknown dates, rating removed from a recommendation, current→read→current, missing/returning IDs, title/edition changes, malformed settings, stale edits, no-op saves, HTML-like blurbs, repeated IDs and no-JavaScript rendering.
6. Verify real desktop/mobile layout, light/dark theme, keyboard focus/ordering controls, independent history sorting, unique IDs, all cover/post URLs, canonical/sitemap and private-folder exclusion. Re-run existing publishing/cleanup tests after plugin changes. No release until source and preview checks pass and the author can review it.

## Implementation sequence

1. Write this specification and verify source editions/documentation (this document).
2. Add validated settings storage and importer invariants; exercise re-import/failure scenarios before UI work.
3. Build the three public sections, seed the four books, and display known completion dates.
4. Add local PublishDesk management/import/preview controls and integrate the existing bundling setup without changing active-vault settings.
5. Run automated and visual checks, document exact behavior/remaining release work, and present a local preview. Production publication is separate.

References: [Jekyll data files](https://jekyllrb.com/docs/datafiles/), [Obsidian modal APIs](https://docs.obsidian.md/Plugins/User+interface/Modals), [official Obsidian API types](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts). Revisited [Derek Sivers](https://sive.rs/book) for readable cover/notes rows and explicit date labels and [Patrick Collison](https://patrickcollison.com/bookshelf) for editorial selection without dashboard clutter. The existing local design remains the base; no theme replacement.
