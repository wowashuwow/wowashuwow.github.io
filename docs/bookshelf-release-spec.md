# Bookshelf: remaining workflow and release specification

Released 16 October 2026 through [PR #5](https://github.com/wowashuwow/wowashuwow.github.io/pull/5), merge d33b6bf43653e2bbb9d13ef24fe19a820ec378d0. PublishDesk 1.2.1 is installed and the author confirmed the workflow works before authorizing release. Pages deployment and live /bookshelf/ verified; see [release checks](release-checks.md). Native agent UI input remained unavailable; author acceptance and browser-harness/native automation evidence are distinguished in those records. This specification retains the intended safeguards; it is not a claim that every failure case was exercised manually.

## Outcome and constraints

Finish automatic cover/metadata enrichment integrated with Goodreads import, saved Bookshelf publication, and exceptional cover/date corrections in Manage books. Keep the existing Bookshelf design, three sections, rating-only ordering, Goodreads import policy and independent blog writing. Use the existing Manage books dialog and PublishDesk. Do not add a database, community plugin, book-note collection, image build plugin or automatic Goodreads scraping. Work on the existing codex/books branch, preserving the main website vault as the source of current curation. Existing uncommitted edits must remain intact.

Required responsibilities: native Obsidian interaction/accessibility; Node/Git publication and recovery; Ruby validation/import preservation; image decoding and sizing; Jekyll rendering; automated integration and browser verification. Use the existing stack and native APIs. No external service/account setup is required for these three tasks. The GitHub Pages publishing source must be checked before the first real release; local code currently targets remote newtheme, branch newtheme.

## Permanent requirement: no AI dependency

The author requires every routine website workflow, existing and future, to work without a coding agent, LLM, chat session or AI service. This includes writing, previewing/publishing posts, importing/managing/publishing Bookshelf, covers, related-post links, review dates and recovery. Implement ordinary deterministic software with understandable Obsidian controls, documented instructions and portable files. Do not leave agent-operated file edits, image sourcing, Git commands or troubleshooting as required routine workflow steps. AI may assist development but must not be a runtime or operational dependency. New feature development or exceptional environment/dependency failures can still need ordinary developer maintenance; do not promise software never requires maintenance. Test completion through user-operated controls with no agent intervention. Clearly distinguish implemented functionality from future plans.

Current Bookshelf gap (16 October): Goodreads CSV import is implemented but automatic cover/metadata fetching is not. Existing covers were prepared during development. This is a release gap, not an acceptable routine workflow. The required normal flow is export Goodreads CSV -> import in PublishDesk; software fetches supplemental metadata/covers automatically. User curation and a deliberate Publish action remain normal controls; manual sourcing, downloading, resizing, sorting or file editing must not be required per book. Rare missing/ambiguous matches must be recoverable inside Manage books without AI. See the automatic-enrichment requirements below.

## Verified starting point

- PublishDesk 1.1.2 has local import, management, related-post controls and Bookshelf preview. Local saves/imports do not publish.
- Facts live in _data/books.yml; ID-keyed site choices in _data/books-overrides.yml. Re-import preserves choices. Covers are local in images/books/.
- cover, cover_source, review_date and review_source_url exist but the manager cannot edit them. General editorial saves deliberately protect those fields.
- Import explicitly selects CSV fields. It has completion dates, not review publication dates; changed/new review text is already listed for a date check in the import summary.
- Existing post publication uses a temporary Git index, exact-file allowlist, compare-and-swap branch update and upload recovery. Its status check expects a post-specific content marker, so it cannot simply be reused unchanged for Bookshelf.
- Books previews currently overlay templates, settings and every allowed image under images/books onto committed HEAD. That is useful during development but broader than a routine Books data publication should be.
- /bookshelf/ is unreleased. The initial website feature release and later content-only publication are separate operations.

## 0. Automatic enrichment: mandatory before completing publication

This section supersedes the former manual-first cover/date approach. Automatic cover fetching is required, not future convenience scope. Normal user work is exporting a full Goodreads CSV and choosing it in PublishDesk. A brief summary/Apply and intentional Publish are permitted controls, not manual data preparation. No book-by-book web searching, downloading, resizing, copying URLs or asking an agent is a normal step.

### Prove the data sources before committing to the implementation

- Reassess existing plugins/adapters first, including Global Book Search, Booksidian, Book Search + Covers and the actual Librarian plugin by lastratalive. Compare supported batch entry points, stable APIs, licenses, preservation of user edits, exact-book matching and update handling. Prefer a supported reusable component where it fits; do not automate another plugin's dialogs or depend on undocumented internal functions. If reusing source, retain its license/attribution. Avoid installing several parallel library managers or maintaining duplicate per-book notes just to get covers.
- Prior research already examined these plugins; the mistake was treating cover lookup as an optional occasional action rather than integrating it into import. Global Book Search's README describes metadata/cover providers and enrichment. Booksidian's README documents a 100-item-per-shelf RSS limitation and optional destructive note overwrite. Neither fact alone proves compatibility with our bulk Jekyll workflow.
- First run a small read-only provider feasibility test on real imported records: exact Goodreads IDs, ISBN-present books, missing ISBNs, series/duplicate titles and a new/unseen fixture. Record actual successful cover resolutions, source, dimensions, match method, failure cases, response limits and any setup requirement. Inspect provider code/contracts and verify current Librarian capabilities; current web retrieval of its README failed, so do not assume its earlier roadmap is current.
- Candidate routing: Goodreads shelf RSS as supplemental exact-ID metadata where available, then documented ISBN-based cover/catalogue providers; title-and-author matching only with conservative deterministic confidence. Test rather than assume Goodreads public endpoints are reachable (web fetch failed during planning). CSV remains the complete source of personal library membership, ratings, reviews and completion dates. RSS truncation or provider absence cannot remove CSV books.
- Respect each source's storage/display/attribution rules: Open Library explicitly recommends its hosted covers for public pages; Google Books has attribution/link requirements. Do not invent a universal permission to download or hotlink every provider. Prefer durable local covers where permitted; if a provider requires hosted images, support validated remote cover references and explicit attribution in rendering, preview and checking. Do not force local-only storage at the cost of automatic fetching. No paid subscription or AI; one-time free setup, if genuinely necessary, must be disclosed before choosing that provider.
- Decide plugin-versus-small-adapter and provider order from this evidence. Finish this gate before building the publishing allowlist or declaring automatic coverage reliable. Do not promise 100% availability from third parties.

### Provider decision after source and live checks

See [fetching audit](bookshelf-fetch-audit.md) for current code inspection, live probes and baseline regressions. Both Goodreads feeds are reachable from this Mac and supply exact-ID cover URLs for all 45 currently imported books, including 11 without ISBNs. Six representative large images were downloaded temporarily and decoded successfully. Prefer a small isolated Goodreads RSS enrichment adapter in PublishDesk, preserving CSV as the complete library source. No additional book-note plugin or general multi-provider platform is needed for this demonstrated primary path. Retain a bounded fallback boundary and prove missing-ID behavior; future coverage is not guaranteed by today's matches.

Current source review confirms Librarian still lists Goodreads CSV import as roadmap work, and the examined plugins expose note-oriented commands rather than a documented headless bulk integration with our YAML files. Use their proven mechanisms/small licensed components as appropriate, without controlling their dialogs or coupling to private plugin internals. Booksidian's README warns of feed limits while current source attempts pagination: bound and deduplicate feed pagination rather than trusting either as a completeness guarantee.

RSS source links are useful, but the actual Cuckold pubDate equals date added and differs from the verified displayed review date. Do not use it for review grouping. Automatic review-date extraction remains a separately validated optional enhancement; it cannot block covers or introduce mandatory manual date work. No implementation changes occurred in the source/provider audit.

### Automatic workflow and ownership

1. User chooses Goodreads CSV. Parse/validate locally using the existing eligibility rules and retain the current import summary/removal confirmation.
2. Automatically resolve missing covers and supplemental metadata. Fetch in a bounded background operation with visible progress, timeouts, conservative concurrency, provider rate limits, bounded retries/backoff and Cancel. No per-book prompts for confident matches. No provider calls for known-good unchanged covers on every import.
3. Present one import result: books updated, covers resolved, and unresolved/ambiguous items. Apply saved choices and metadata using lock/stale-token/journal/recovery protections; cancellation leaves active data unchanged. An interruption after CSV Apply must leave a recoverable queued enrichment operation, never corrupt the library. Do not hold a filesystem lock through network waits. Recheck ownership/state before applying fetched results.
4. On Save/Preview/Publish, include the latest saved enrichment consistently; do not silently upload while fetching. Preview and publication remain possible with unresolved optional metadata and use a clear fallback. A running pending operation must be awaited or explicitly reflected in the reviewed snapshot, not race the commit.
5. Retry temporary/missing results automatically on later imports (including an unchanged CSV), with a sensible negative-cache expiry and persisted resumable state. Provide one **Retry missing data** action inside Manage books for immediate retry. No repeatedly opening modals or forcing a CSV re-export merely to recover from a transient network error.

Keep CSV facts authoritative. Never substitute catalogue descriptions for the author's reviews, other readers' ratings for personal ratings, or provider publication dates for date_read/review date. Track fetched metadata's provider, source and stable ID separately from explicit editorial choices within the existing storage structure where practical; no database or duplicate note library. Private fetch cache/job state and credentials stay outside public data. Manual corrections/explicit no-cover choices take priority and cannot be undone by later retries/imports. Existing valid legacy selections are retained by default. Title changes do not create a new identity; different editions never silently share preferences.

Fetch Goodreads review source/date automatically where the source actually exposes that user's matching review and an unambiguous review timestamp. Associate by stable review/book/user identity and, where needed, normalized review content. Date added, date finished, feed pubDate or record-updated time cannot be called a review publication date without evidence of its semantics. If no trustworthy review date can be obtained, retain the known value or Date unknown; do not require routine manual verification. Conflicting/changed manually confirmed values may be flagged, never overwritten silently. Covers and review-date availability are separate outcomes.

### Missing-match handling and tests

- No match/ambiguous match -> retain current cover or show fallback; offer **Find another cover** with in-dialog fetched candidates. Choosing a candidate is a rare exception, not the routine for every ISBN-less book. Choose from Mac remains a last-resort escape hatch, not primary UX. Never assign an obviously different book merely to get complete coverage.
- Blocked/rate-limited provider -> bounded automatic fallback/backoff, retained last-good metadata, truthful non-blocking status and resumable retry. Do not require user to split Goodreads shelves to work around RSS limits.
- Test blank/invalid ISBN, exact ID, duplicate/translated/series titles, edition mismatch, wrong author, missing/placeholder image, corrupt/huge download, remote image expiration, offline/rate-limit/service failure, cancellation/restart, re-import no-op with missing covers, manually removed cover, concurrent curation and content/asset provenance. Ensure retries don't refetch all successful covers or erase choices.
- Completion requires the author to import a CSV containing a new book and get its correctly matched cover without file work or agent help, then preview/publish through controls. Record actual provider hit/miss evidence; mocks alone are insufficient.

## 1. Publish saved Bookshelf changes

### User flow

1. Manage/import books and choose Save locally/Apply locally.
2. Run **PublishDesk: Publish Bookshelf changes**. It operates on saved files; any unsaved manager edits are not included. Prevent concurrent save/import/publication while a publication is being confirmed, or invalidate the confirmation if its inputs change.
3. Prepare a frozen set of inputs and build/check it. Show a readable change summary: added/removed books, ratings/review/status changes, visibility/order/blurb/link/date/cover changes. Include hidden or removed entries affected by the commit. Allow an expandable exact file list/diff rather than making raw YAML the primary interface.
4. Show destination and commit subject **Update Bookshelf**, optional publication note in the public Git commit body, Cancel and **Publish**. With no changes show a no-change result and make no commit.
5. Publish precisely the checked snapshot. Distinguish **committed locally**, **uploaded**, **GitHub Pages building**, **live confirmed**, and failure. Reuse existing Retry upload/Check last publication commands with a publication type so posts keep working.

### First release versus routine use

The first release merges the reviewed feature implementation (page/includes/styles/script/nav/plugin source/data/covers/docs as appropriate) through the normal feature release process. It is not performed by the routine content command. Before that merge, test publication using disposable repositories and a local bare Git remote. Do not upload an incomplete data-only feature to production for testing.

After setup is committed and deployed, routine publication may change only the two Books data files and precisely referenced new/modified book covers. Theme, nav, plugin files, blog posts, Drafts, exports, backup files and unrelated images are excluded. Referenced means the imported library/retained settings' cover paths, not every file found in the image directory. Existing missing-book settings remain recoverable; do not discard them to shrink publication. Validate retained cover references too, and do not silently include unrelated files.

The preview/publication builder must use committed templates/config/navigation for routine use, with only the selected data/covers overlaid. A development preview mode may still overlay feature implementation explicitly. Explain/block an uncommitted implementation mismatch rather than letting the preview promise a layout that the content commit will not deploy. Validate linked posts against the same committed snapshot used by the build.

Show once in publication review that visibility hides a book from the page, not from the repository: the sanitized imported library and editorial settings are public website source. Private raw CSV/notes stay excluded. Publication notes are public Git history.

### Correctness and recovery

- Capture HEAD, destination, exact files and content digests. Build and commit identical bytes; publication cannot read a later revision in place of the reviewed snapshot.
- Fetch/check destination before final publication; reject wrong branch, staged unrelated changes, pending upload and local/remote divergence with an actionable message. No force push or automatic merge.
- Use an isolated index and compare-and-swap ref update. Preserve unrelated tracked/untracked work and normal staging state. Avoid a broad refactor of the existing post publisher; extract only clearly shared operations with regression coverage.
- Write recoverable operation intent before moving HEAD. Handle a crash at each transition (prepared, committed, uploaded). Recovery inspects actual Git state, rather than trusting a stale phase label. Serialize post and Books publication so they cannot overwrite each other's pending recovery.
- Network failure before commit leaves Git untouched. Failure after commit offers retry of the same commit, not a duplicate commit. Unknown push result checks the remote first. New edits made afterward stay local for a later publication. Refuse retry if the branch/history no longer matches the operation; explain recovery without resetting user work.
- Failed local build/check makes no commit. Failed Pages deployment retains the commit and links to the failing build; never claim upload means live.
- Add a Bookshelf content marker derived from the published data/covers. Check the relevant deployment and live /bookshelf/ marker; a generic 200 from an older page is insufficient. A superseding deployment needs explicit recognition, not a false success or endless wait. Retry/status messages name Bookshelf or the post appropriately.
- Network/API/rate-limit failures leave a persistent useful status and a manual retry. Never poll indefinitely. Normal post publication remains operational.

### Acceptance

Disposable-repository integration tests cover exact committed paths, deletions from imported data, hidden book changes, modified/shared covers, unrelated staged/unstaged/untracked edits, no-op, Unicode notes, wrong branch, divergence, stale data/cover/HEAD, simultaneous actions, failed build, push rejection, ambiguous push result, restart recovery, and retry without duplicate commit. Deployment-state tests cover pending/failure/old-200/superseding updates. Then the author walks through review and Cancel in the real vault; first live upload waits for the feature release.

## 2. Covers: automatic defaults, exceptional replacement and quality

### User flow and design

Automatic cover fetching from section 0 is the default. Add **Cover** to each book's existing management controls, including hidden entries, for corrections only. Include **Find another cover** (automatic candidate search), **Retry missing data**, and exceptional local-file import; the user does not need to find or download files in the normal flow.  Open a focused dialog with the current cover, title/author, current pixel dimensions and a restrained small-image warning. Provide **Choose from Mac**, **Use no cover**, **Cancel**, **Done**. An optional source URL is provenance, never a required external account. Done changes only the manager's draft; Save locally applies all choices. Parent Cancel restores the original state and removes newly staged private files.

Show the new image before accepting it. Preserve proportions; do not crop cover art to a uniform rectangle. One replacement updates every occurrence of that Goodreads ID on Bookshelf. It changes no status, recommendation, rating, review or post image. Use the existing textual fallback without treating an absent cover as a publication error.

Support JPEG, PNG and WebP initially, based on actual decoded content rather than just the extension. Tell the user to export unsupported HEIC/SVG/animated files as a supported static format. Reuse browser decoding and canvas encoding available in Obsidian, verifying the actual output type; no new native dependency. Proposed bounds: 10 MiB input, 40 megapixels, output at most 440 px wide and 1,200 px tall, preserving ratio and never upscaling. Warn below twice the actual displayed dimensions (currently roughly 110 x 168), but let the author keep a usable small image. Check limits before expensive allocation where practical and handle decode/encode failure without changing anything. Confirm these bounds with real-cover output before locking them in tests.

Where provider storage terms permit local files, store one web-ready file for a selected replacement under the existing images/books directory, named by Goodreads ID plus content digest. No per-book folder, source-plus-thumbnail tree or sitewide image pipeline. Originals/staging/backups are private; web output is the only public new asset. Content-derived filenames prevent an old cached image surviving replacement and deduplicate selecting the same processed bytes. Existing cover paths remain valid; no mass renaming.

### Save/import/failure rules

- Stage bytes privately until Save locally. Validate encoded content again at the write boundary and verify references/digests when previewing/publishing.
- Write a new immutable cover file before atomically pointing settings to it. Use lock, stale-state token, recovery journal and backups; a failed settings write retains the old cover and cleans/recoverably records only the new unreferenced file. A crash must not leave settings pointing at a missing file.
- Switching/removing/cancelling selections cleans only this operation's private staging. Selecting the same image repeatedly is a no-op after normalization where deterministic.
- Never delete an existing image merely because a cover was replaced, removed, or the book was hidden/removed from an import. For superseded app-created files, cleanup is allowed only when proven unreferenced by saved settings, committed site, other website sources and private drafts, with recoverable backup; otherwise retain. No broad automatic image-directory cleanup. Routine publication excludes unreferenced leftovers.
- Reject symlink/path escapes and filename/content mismatches. Errors remain visible with the original selection intact. Multiple edits to the same book trigger stale-save handling.
- Re-import never overwrites cover choice/source. A different Goodreads edition remains a separate record. A missing cover referenced in configuration is a clear repairable error, not silently substituted; choosing Use no cover explicitly removes that reference.
- Audit existing visible covers, prioritizing the four recommendations. Replace only exact-edition covers that can be confidently identified. If a sharper legitimate source cannot be found, retain the existing cover/fallback; quality is not improved by enlarging pixels.

### Acceptance

Test featured recommendations/current/history overlap, hidden books, no-cover fallback, valid formats, malformed/truncated images, excessive dimensions/bytes, repeated same-image selection, cancel at both levels, failed save/crash, stale edits, removed/reappearing records, shared references and import preservation. Inspect actual resized image quality and desktop/mobile light/dark rendering, keyboard labels/focus and no layout shift. Confirm routine publication includes only necessary cover files.

Automatic fetch implementation must honor provider-specific storage/display requirements established at the feasibility gate. This replaces the previous blanket decision to use manual files. If hosted covers are required, extend validators/rendering/preview/publication to handle trusted remote images, provenance/attribution and failed loads. Preserve existing local covers. The local resize/immutable-file plan applies to providers permitting downloads and user-supplied files, not universally to every provider.

## 3. Goodreads review dates: automatic where available, optional corrections

### Meaning and user flow

Fetch trustworthy review dates/source links automatically under section 0. Add **Review date** only to books that actually have imported written reviews, as optional correction/confirmation rather than routine data entry. Put it with other per-book controls, including hidden reviewed books. Open a dialog showing the current value/source, the imported review excerpt, **Open Goodreads review** when a source exists, calendar date, source review URL, **Clear date**, **Cancel**, **Done**. Date entry has an explicit label and YYYY-MM-DD fallback. Done updates the parent draft; Save locally writes. Do not add date controls to ratings-only entries: their Finished date continues to come from CSV date_read.

The date means the visible date of the Goodreads review being referenced, which can be an updated date. It is not a promised original publication timestamp. Retain the honest public label **Goodreads review dated**. For a manual correction, the author checks the actual review page; URL syntax validation alone cannot prove date/ownership/book identity. The optional correction dialog asks for confirmation and requires the source review URL when assigning a date. Automatic assignments require source-backed identity/timestamp semantics rather than a user confirmation for every record. No API keys, login scraping or invented values. Unknown stays in Date unknown, with no release blocker.

### Persistence and failure rules

- Existing date/source values are preserved until deliberately edited. Validate real calendar dates, four-digit positive year, no future review date, and a Goodreads review URL (not a book/status URL). Normalize harmless query parameters to its canonical review/show/ID form; reject other hosts/paths.
- Add a digest of the sanitized imported review when the author confirms a date. Subsequent import compares that digest to the current review, automatically refreshes verifiable automatic dates where ownership permits, and otherwise shows a non-blocking **Review changed — date unavailable/unverified** status. It must not create a required per-review manual checking task. This must survive restarting/reimporting, not appear only in a transient import summary. Pre-existing dates lacking a digest show a non-blocking verification status; do not silently mark them verified by attaching today's content digest.
- Keep last-confirmed dates/source through changed or removed review text. Flag stale values in the manager; do not automatically move years or erase data. If no review is present, no review-date UI/public review grouping is shown. If the same ID/review returns, its settings remain recoverable.
- A changed-review warning is advisory; it does not block publishing otherwise valid books. User may optionally confirm the existing date, correct it or clear it. Correct automatic metadata needs no manual confirmation. Confirmation records the current review digest. Clearing removes the date and verification digest, retaining the source URL as a convenience for reopening the review later. The public entry returns to Date unknown; the retained source alone does not imply a date or verification.
- One date per current imported Goodreads review; do not build an edit-history or reread database. Ratings/completion dates never stand in for review dates.
- Extend only the allowed date-related manager fields, retaining validation/protection on all other fields. Lock, stale token, atomic save and backups apply. Wrong source, invalid date, library change while dialog is open or disk failure leave the prior configuration intact. Source verification remains a human action.

### Acceptance

Test leap days, impossible/future/blank dates, valid/invalid URL normalization, Unicode reviews, changed/removed/returning reviews, digest comparisons after sanitizer normalization, existing records with no digest, cancellation/clear/no-op/stale saves, import preservation, hidden books, and year changes including future years when those years are current. Render correct years and chronological ordering without changing ratings-only completion-date sorting. Check public labels/source links and no invented metadata dates.

## Implementation order and release gates

- [x] Inspect source, existing tests, publication/recovery and data invariants; research official docs; write this spec.
- [x] 0a. Inspect existing plugin source/licenses and current library provider availability; verify 45 exact-ID cover metadata matches, six representative images, and the 69-test baseline. See fetching audit.
- [x] 0b. Prove an integrated fresh-record import with no pre-seeded cover: live Mindset acceptance passed in a disposable vault; fallback safety has focused tests.
- [x] 0c. Integrate automatic fetch, ownership preservation, missing-data retries and failure/cancel recovery with CSV import.
- [x] 1a. Books publication preparation/review UI and frozen build, with disposable Git tests.
- [x] 1b. Exact-file commit/upload, crash recovery and Books-aware status/retry, preserving post workflow.
- [x] 2. Exceptional cover-correction controls, validated private staging/save and local/hosted asset publication integration. Representative actual cover quality/dimensions checked; native file/candidate selection remains in final acceptance.
- [x] 3. Review-date controls and persistent advisory verification state; no invented feed dates.
- [x] Release regression: full JS/native Ruby suites, committed production build, output/SEO/privacy checks and live desktop/phone inspection passed. Earlier light/dark harness checks are recorded separately. Native agent walkthrough unavailable; author accepted the installed workflow. See release-checks.md for scope and limitations.
- [x] Author acceptance: on 16 October the author reported that everything seems to be working and authorized release. This is the author's overall acceptance report, not an item-by-item agent observation.
- [x] Reviewed existing codex/books feature diff, preserved current authoring data, merged PR #5 into newtheme and confirmed its Pages deployment. Authoring checkout advanced without changing working-file bytes.
- [x] Live /bookshelf/, canonical/title, homepage nav and sitemap verified; expected content fingerprint matches. Covers loaded, shelf/review controls work, no page overflow at 390px, no production noindex. Committed production output passes local links/assets and private/development exclusions.
- [ ] Author publishes a small real Bookshelf change through PublishDesk and checks deployment/status/retry guidance. Inspect URL in GSC; request indexing once if appropriate. Indexing is not guaranteed or instantaneous.
- [ ] Update main project checklist, workflow guide, installed plugin version and test evidence. Stop before deferred films/diary/automation/legacy image cleanup work.

## Research and evidence

- Local implementation: _writing/lib/publishing.js, _writing/lib/books.js, _writing/lib/books-ui.js, _writing/main.js, _writing/books/settings.rb, import.rb, manage.rb, posts.rb; Books specs/tests/rendered output. Goodreads CSV review-date limitation is confirmed by current selected schema and prior imported data; Goodreads help page was unavailable during this research, so do not claim fresh vendor verification from that page.
- [Official Obsidian API](https://github.com/obsidianmd/obsidian-api), queried through Context7: native Modal/Setting, file and event APIs. Check installed-compatible types while implementing rather than adopting new convenience APIs blindly.
- [Git commit-tree](https://git-scm.com/docs/git-commit-tree), [update-ref](https://git-scm.com/docs/git-update-ref): explicit commit trees and expected-old-object ref updates underpin the existing isolated-index approach; they do not make filesystem writes/network upload a single atomic transaction.
- [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site): branch/Actions publishing must match the actual repository setup. Local remote names do not establish deployed source.
- [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob): native decoding/encoding, format fallback/null failures and object-URL cleanup. Validate actual runtime capabilities.
- [Open Library cover guidance](https://openlibrary.org/dev/docs/api/covers): source policy informs the decision against automatic bulk local cover downloading.
- Revisited [Derek Sivers](https://sive.rs/book) for clearly labelled date/rating/notes, and [Patrick Collison](https://patrickcollison.com/bookshelf) for editorial selection. Keep our approved design; these remaining management controls do not warrant a visual redesign.
- [Google recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl): release checks and inspection come before an indexing request; repeated requests do not accelerate crawling.


## Research amendment: automatic workflow — 16 October

Author clarified that routine manual data work must stop at Goodreads export + import. Automatic fetching is mandatory, AI-independent, and must be proven before polishing manual fallback controls. Existing publication/cancel/privacy requirements remain. [Global Book Search](https://github.com/DuckTapeKiller/global-book-search) supports provider-based metadata/cover enrichment and local/remote image modes. [Booksidian](https://github.com/MichaBrugger/booksidian_plugin) demonstrates RSS book metadata but documents shelf truncation and note-overwrite behavior; retain full CSV reconciliation. [Book Search + Covers](https://github.com/lksrpp/obsidian-book-search-covers) documents automatic high-resolution cover providers and a local/linked mode. The official [Obsidian registry](https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json) identifies the relevant Librarian as lastratalive/Librarian; its current repository README could not be freshly retrieved, so current capabilities remain a feasibility-gate check. Existing project notes contain the earlier inspection. [Google Books branding](https://developers.google.com/books/branding) and [Open Library covers guidance](https://openlibrary.org/dev/docs/api/covers) require provider-aware attribution/display choices. Documentation confirms feasibility of automatic lookup in general, not that the exact end-to-end adapter or real-library matching has already been validated. No implementation or plugin installation in this amendment.

Implementation detail: automatically fetched covers use validated provider HTTPS URLs. User-file corrections use one normalized local JPEG and a recoverable assets-plus-settings transaction. The existing manually/legacy-selected local covers are preserved rather than silently mass-replaced. A generated publication marker is the only additional public data file; it is managed by software and requires no user editing. Native acceptance remains open as documented in books-plan.md.
