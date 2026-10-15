# Bookshelf fetching: source and regression audit

16 October 2026. Read-only code/provider inspection and baseline tests; documentation updated afterward. No plugin installation, implementation edit, cover replacement, library import, account change or deployment. Reference downloads and generated test fixtures live under /private/tmp; no raw Goodreads feed is added to Git.

## Findings from the actual library

- Current sanitized library: 45 books, 34 with ISBN, 11 without. ISBN-only fetching cannot satisfy this workflow. Mindset, Endurance and The Hobbit are relevant ISBN-less examples.
- Certificate-verified requests to the author's Goodreads read and currently-reading RSS endpoints both returned HTTP 200 XML. Read supplied 44 items, of which 36 match imported IDs (35 rated plus the explicitly selected unrated Harry Potter). Current supplied nine matching items. Combined, all 45 imported Goodreads IDs matched a feed item with a cover URL. Unimported read items remain excluded; RSS does not change CSV eligibility.
- Six representative exact-ID large cover URLs returned HTTP 200 image/jpeg and decoded successfully using macOS sips: Cuckold 193x300, Lonesome Dove 305x475, Mindset 312x475, Harry Potter #1 317x475, Endurance 294x475, The Hobbit 306x475. These are actual bytes/dimensions, not guessed image URL size substitutions. They demonstrate source availability, not completed integration or a guarantee for every future title. Cuckold remains below a strict 2x target in width; never upscale to claim extra detail.
- The exact Goodreads RSS book IDs solve the missing-ISBN problem for every current library entry without guessing titles/editions. The feeds also supply the user's review/show URLs.
- Review timestamps are different: Cuckold's RSS pubDate equals user_date_added in July 2026, while its saved verified displayed review date is August 2023. user_date_created is another different date. Therefore none can silently stand in for displayed review publication/update dates. Automatic source link retrieval is feasible; automatic trustworthy review dates need separately validated review-page extraction or remain unknown.
- Read-only Open Library probes: Cuckold ISBN resolved to an edition with cover IDs; Endurance title/author resolved to the expected work with a cover ID; a strict full-title Mindset query returned zero results. A naive fallback that grabs a first search hit or assumes every title query works is not sufficient.

## Existing solutions inspected

Fetched current repository metadata, README and relevant command/provider source; no downloaded code executed. All four repositories were unarchived at inspection. Actual license files must be retained if reusing code; GitHub metadata and README wording are not always consistent (Librarian README says 0-BSD, actual LICENSE says MIT).

- [Booksidian](https://github.com/MichaBrugger/booksidian_plugin): inspected src/Shelf.ts, src/Book.ts, const/goodreads.ts, const/rssParser.ts. It already fetches Goodreads RSS cover URLs by ID and can download covers. It is oriented around book-note/frontmatter creation and optional overwrite, not our two YAML files and publication workflow. README warns of 100-item feeds; current source attempts page/per_page pagination. Do not assume pagination works forever or is complete: use bounded pages, ID deduplication/repeated-page detection and the full CSV as membership authority. Do not silently swallow provider errors as an empty library.
- [Global Book Search](https://github.com/DuckTapeKiller/global-book-search): inspected command registration, global enrichment, Goodreads/Open Library adapters and edition scoring. It supplies useful provider/matching approaches but has a much wider provider/settings/note-creation system. No documented stable headless CSV-to-our-data API was found in the inspected interface. Do not depend on its private plugin internals or require users to create/select notes for every imported book.
- [Librarian](https://github.com/LastRatAlive/Librarian): current README still lists Goodreads CSV import/export as roadmap work. Inspected command registration and Open Library suggestion modal; selection creates book notes. It is not a ready-made importer for this site. Its exact Open Library URL approach is useful as reference.
- [Book Search + Covers](https://github.com/lksrpp/obsidian-book-search-covers): inspected command registration, cover processing and Apple/Open Library provider code. Fetch/replace operates on the selected Markdown note; not a headless drop-in bulk YAML import. Provider code explicitly guards against summary/workbook/companion false matches, reinforcing conservative matching. Google Books key is optional for its richer metadata; there is no need to introduce that setup just to solve our currently covered IDs.

These findings support a narrow Goodreads RSS adapter integrated with PublishDesk, rather than installing a second library manager or reproducing a many-provider search platform. Reuse appropriate small permissively licensed components when materially useful, with attribution; do not copy code merely to claim reuse. Existing provider/storage rules still apply. Keep a fallback adapter boundary, but avoid building numerous providers before there is a demonstrated coverage need.

## Revised implementation boundary

1. Leave the CSV parser's membership/rating/review/completion rules intact. Keep exact ID matching and all curation invariants.
2. Add an isolated supplemental fetch/parse/cover-validation module invoked by the Books import orchestration. Reuse existing network facilities and XML parser where possible; do not add AI or another plugin. Parsed network responses are whitelisted, identity checked and size bounded; do not treat descriptions or average ratings as author data.
3. Fetch the two relevant feeds once per eligible import/refresh, join to imported IDs, fill missing/eligible automatic covers, normalize and persist using the planned staging/recovery boundary. Preserve manual/current known-good covers; no unsolicited mass replacement. Report lookup failure distinctly from no match. Automatic quality upgrades apply only to owned automatic selections under an explicit policy.
4. Verify provider storage/display terms before choosing download versus hosted reference. If hosted references are needed, extend Books-only schema/render/checker without loosening post image/path rules. Keep failure fallback and provenance. No query to third parties is needed to render or build already saved local metadata; remote image display, if used, is an explicitly separate dependency.
5. CSV membership does not depend on RSS completeness. When a feed is truncated, blocked or an ID is absent, retain entries and prior metadata, retry boundedly, and use a validated fallback/candidate picker. Never silently change an edition to fill a cover.
6. Successful cached images need no repeat download; unchanged CSV must still retry unresolved entries. Fetches cannot overlap a settings transaction or race a reviewed publication snapshot. Retry state is private and no callbacks remain after cancellation/unload.
7. Keep all current commands/settings/appearance, post preview/publishing, featured-image handling, draft cleanup and existing publication recovery intact. Books fetching must not become a dependency of normal post actions. No broad shared publisher or preview refactor; add only the small Books-aware extensions required and test both operation types.

## Baseline regression evidence

Generated a temporary PublishDesk bundle without touching the installed plugin. All 37 JavaScript test cases passed across the suite run plus a separately rerun preview test: the suite's first preview result was a sandbox EPERM when opening loopback, and the same test passed with loopback permission. No code fix was needed. Existing coverage includes draft/image cleanup, featured-only/body image selection, commit-note UI, preview refresh/last-good recovery, publication path isolation and Books management/import/link behavior.

Ruby checks: 22 import/curation tests / 105 assertions; four published-post catalogue tests / 22 assertions; six Liquid rendering tests / 31 assertions. All passed. Total baseline: 69 test cases, including 158 Ruby assertions. Tests establish the current baseline; they cannot prove future changes correct before those changes exist.

## Gates still required before release

- [x] Current plugin/source comparison, real-library exact-ID metadata matching, representative image response/decode checks and baseline regressions.
- [ ] Implement isolated adapter, storage/provenance, staging/recovery and import/manager integration; no broad unrelated rewrite.
- [ ] Automated fixtures for malformed XML, repeated RSS pages, more than 100 books, missing/placeholder images, exact-ID mismatch, corrupt images, offline/429/403, retries, cancellation/unload, stale saves, manual no-cover/override and unchanged CSV retry. No fetching may erase existing curation.
- [ ] Prove a fresh import record with no pre-seeded cover gets its cover without agent/file work. Current 45-book metadata availability is not that full integration test.
- [ ] Run existing 69 cases against the changed temporary bundle, plus new tests; verify no active-vault data/settings/plugin differences until deliberate installation.
- [ ] Verify native user-operated import -> optional curation -> preview -> selected Books publication, full site build/privacy/SEO and no regressions in post commands. Installed version and native success must be recorded separately from source tests.

The plan is now evidence-backed enough to implement the narrow adapter first. End-to-end integration and provider fallbacks are not already completed or guaranteed. Follow books-helf-release-spec.md (actual filename bookshelf-release-spec.md) for the detailed remaining publication, cover correction and optional review-date controls.
