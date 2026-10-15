# Independent Bookshelf catalogue and safe Goodreads imports

**Status: deferred / future scope — 16 October 2026, at the author's explicit request. Do not implement as part of the current Bookshelf release.**

The current Goodreads-based catalogue and import rules remain in effect. The proposed independent catalogue, retain-missing-books policy, identity migration and matching rules below are research for a later feature; they do not supersede the current release requirements until that feature is explicitly resumed. Preserve this complete specification and the confirmed one-entry-per-book default for that future work. No runtime/data changes have been made for it.

## User outcome and scope

The Bookshelf is the author's library. Goodreads is an optional source of reading data, not the authority over which records can exist. Add books from online search without first adding them to Goodreads. Automatically retrieve available metadata and a cover. Import Goodreads later without removing direct additions, replacing website choices or duplicating the same book.

Author confirmed: one entry per book by default, rather than one entry per edition. Allow Keep separate when the author deliberately wants different editions/translations. No AI, paid service or account/API key required for routine use. No extra book-note folders, database, second library-manager plugin or automatic synchronization.

## Evidence from current code

- BookPicker only accepts state.books and advertises imported books. The manager can recommend an existing record, not create a book.
- import.rb prepares a replacement array from eligible CSV records; missing recommendations currently block an import. These rules must change, not merely the picker.
- settings.rb accepts only numeric Goodreads keys and forbids configuring new identities. transaction.rb accepts numeric-owned image paths. Metadata enrichment maps RSS IDs directly onto book IDs. These provider-ID assumptions must be isolated.
- Existing two YAML files already separate catalogue/default data from website choices. Existing lock, snapshot tokens, private backups, durable transaction journal and frozen publication are reusable.
- Jekyll book-selection.html currently evaluates status/rating/date directly from catalogue records. Adding manual reading choices only to the manager would be insufficient; rendering, counts, sorting and checks need the same effective-value rules.
- Publication summaries use imported-only language; source URLs/review links and cover lookups assume Goodreads membership in several paths. Audit these consumers explicitly.

## Existing solutions and decision

Reviewed official Obsidian Modal/SuggestModal/requestUrl documentation, Open Library search/work/edition/cover/rate-limit documentation, current public plugin READMEs and source reference files retained from the provider audit.

- **Global Book Search:** broad multi-provider enrichment and book-note creation. Its Open Library adapter is a useful reference, but its provider framework, scraping, templates and note lifecycle exceed our needs. It does not supply our YAML/import ownership and exact-publication rules.
- **Librarian:** native Open Library search/book tracking. Source reference demonstrates SuggestModal and requestUrl, but its README lists Goodreads import/export as roadmap work, including difficult mapping cases. Installing it would introduce a second library and would not solve our merge requirement.
- **Book Search:** query-to-book-note workflow using Google Books; not an integration for this existing catalogue. Its README/license descriptions are inconsistent, so do not copy source based on the repository badge alone.
- **Current PublishDesk:** already has the request/cover adapter, safe persistence and the manager UI. Extend these narrow seams instead of installing/forking a second app.

**Decision:** implement a small documented Open Library search adapter inside PublishDesk, reuse our existing request/cover validation and native UI, and implement ownership/matching rules locally. Do not copy third-party plugin code for the initial version; the API integration is small, while the difficult catalogue/import logic is specific to us. If implementation reveals a genuinely reusable upstream utility, review its exact pinned source/license and retain attribution before copying it. No speculative provider abstraction or fork maintenance.

Open Library is the initial provider because its documented APIs support works, editions and covers without a user key. It cannot guarantee every book or cover exists. Offer a small exceptional manual-entry form when no result is found, plus existing cover correction. Do not silently scrape Goodreads or add multiple fallback services. Prove coverage on representative books before considering another provider.

## Storage and ownership — stay with the two YAML files

1. Catalogue records get a stable website identity independent of their provider. Retain every existing numeric id exactly as an opaque local ID, preserving book anchors, cover paths, preferences and links. Generate new IDs as local-<UUID>; no date/title-based identity and no wholesale rekeying of the current library.
2. Extend each catalogue record with validated source identifiers: Goodreads ID alias(es), Open Library work ID, selected edition ID and edition-scoped ISBNs where available. Keep identifiers namespaced. Never pretend an Open Library ID is a Goodreads number.
3. Record whether a book was added directly; this stays true after it is linked to Goodreads. Selection, source identity and the author-controlled fields are separate concepts.
4. Retain existing base bibliographic/reading fields as defaults. Goodreads can refresh imported defaults for a linked book. Extend books-overrides.yml with explicit website title/author/status/rating/date overrides as needed, alongside the current blurb, links, cover, section visibility and ordering. Values the author sets while adding/editing a book win over imported defaults.
5. Provide a clear Use Goodreads value action only for fields with a Goodreads source, to remove that specific override. Explicit blank/no-rating/no-date choices are overrides, not missing values. Distinguish key absence from null; do not use truthiness to choose source data.
6. Do not add another public library file or materialized effective catalogue. Compute effective values from the two files through a small shared Ruby representation consumed by the bridge/checker, with an equivalent clearly specified Liquid selection/render path. Cover/date verification metadata retains its existing semantics.
7. External search never supplies personal ratings or reading status. The add confirmation asks which section/status the author wants. Recommendations can be unrated. Reading history still requires a personal rating under the existing site policy; if adding there, ask for it rather than silently substituting provider averages. Existing Goodreads reviews continue as imported content; blog posts remain the full-review writing path. No new rich-text review editor.

## Online add workflow

Manage books → Add a book → search title/author or ISBN. Results show cover (or fallback), title, author and year. Display an Already on your bookshelf indicator when identity evidence matches an existing entry; open/reuse that entry rather than append it again.

Selecting a result opens a compact confirmation with the chosen book/cover and destination: Read before you die, Currently reading or Reading history. The current section is the default. Recommended/current additions do not require a rating. Author can adjust metadata or choose an edition only if the result is wrong/ambiguous; no mandatory tour through edition catalogues. Initial fields/status the author chooses are retained as website choices.

Addition is staged in the manager, like cover/link edits. Cancel leaves both YAML files and image assets untouched. Save locally commits the new record plus choices together through the existing transaction. Saving still does not publish. Retry/offline/no-result states preserve current work. Exceptional manual entry requires only title, author and destination, with optional ISBN/cover correction; no Goodreads account step.

Use native Obsidian controls and the new PublishDesk panels. Prefer explicit Search/Enter for network lookup to avoid request-per-keystroke complexity; native local fuzzy filtering can remain for existing books. Limit result pages and requested fields. Use requestUrl via the existing adapter; ignore late results using operation tokens/closed-state checks. Its documented API has no AbortSignal transport option, so do not promise that cancel physically stops an in-flight HTTP request.

## Matching and duplicate prevention

Run matching against existing records AND the entire incoming batch before any write. Produce a deterministic reviewed plan; network calls must not determine identity during final Apply.

Automatic reuse is allowed only when evidence selects exactly one entry and no identifiers conflict:

1. A previously saved Goodreads-to-website-ID link. This survives changed titles, covers and future CSV order.
2. A unique, checksum-valid exact ISBN match to the selected edition, or an exact edition identifier with corroborating metadata. Normalize ISBN-10/13 equivalents correctly; do not pad a 10-digit number or discard leading zeros.
3. A verified incoming edition-to-work relationship that selects one already-linked work, with no conflicting author/edition-type evidence. One-entry-per-book is the preference, not permission to merge editions solely on fuzzy similarity. Translations, abridgements, adaptations, boxed sets and companion books require attention if evidence conflicts.

**Never automatically merge on title/author text, a cover image, search rank or fuzzy score.** Similarity only discovers candidates. Preserve subtitles, series numbers and abridged/adaptation distinctions in candidate evidence. Existing cover-search normalization that strips parentheses/subtitles is not an identity algorithm.

Do not treat a work search result's aggregated ISBN list as identifiers of the selected edition. Official Open Library documentation distinguishes work-level search results from edition records. Retrieve edition-scoped data on selection or when needed for matching. Missing identifiers are normal; missing does not mean equal.

For uncertainty, show side-by-side incoming/existing title, author, edition/year/language and identifier evidence where known. Choices:

- **Same book — link to this entry:** keep its stable ID, website edits, order, links and cover preferences; attach the confirmed source identifier.
- **Different book — keep separate:** create a distinct entry and remember that specific source-pair decision so the same import does not ask again.
- **Skip this book for this import:** change neither record; allow the reviewed remainder to proceed, clearly reporting the skip. Do not silently add a possible duplicate.

Once linked, ordinary repeat imports do not ask again. Reject a Goodreads ID assigned to two website entries. If source evidence contradicts a stored link, show a repair/conflict instead of silently remapping. Include a small Change Goodreads link action to correct a mistaken association; keep the local book and website choices when unlinking. Re-import can then attach the intended record. No general-purpose destructive merge console.

If multiple Goodreads editions map to one book, do not concatenate reviews or arbitrarily choose a rating/status. Where their reading data differ, ask which Goodreads record supplies imported reading data and remember that primary choice. Other confirmed aliases can identify the same work, but cannot overwrite the primary source in CSV row order. If the primary disappears, retain its last data and request an explicit source change rather than switch silently.

Already-existing separately curated local entries are never automatically collapsed, even if they look duplicated. Preserve both and ask for a source-link decision; merging their independent blurbs/ratings is outside automatic import.

## Re-import preservation contract

- Existing manually added records survive every export, including after being linked to Goodreads and later disappearing from that export.
- **No import deletes an existing book by default**, including imported-only books. A missing source row is not a deletion instruction. Retain previous data and show a No longer in this export advisory. Explicit removal from the website remains a separate author decision. This intentionally supersedes the old replacement/removal-acknowledgement workflow.
- Import neither resets nor silently enables recommendations, hidden flags, section-specific order, blurbs, covers/no-cover choices, blog links, verified review dates or explicit website metadata/reading overrides.
- Eligible new rated/read and currently-reading books still arrive from Goodreads. Do not import the want-to-read shelf or unrated finished books as new entries. Parse/validate all rows before filtering; an otherwise excluded row may still identify/update the source of an already directly selected book without removing its website record or choices.
- Source status changes may update the effective status of records still following Goodreads. If the author has manually set status, that status wins. Explain this in the change summary rather than claiming that nothing about the rendered shelf can ever change.
- Import summary distinguishes new entries, linked entries, refreshed source data, preserved website choices, retained missing entries, unresolved/skipped candidates and source conflicts. The public-effective result, not only raw YAML differences, is reviewable.
- Keep the existing refusal of corrupt/truncated/duplicate-ID CSVs. A syntactically valid export with no eligible new books is a no-op/retain operation, never an instruction to clear the shelf. An empty/malformed export remains an error.
- Retain current stale-token checks, lock and durable transaction. A reviewed match plan is bound to CSV bytes, catalogue, choices and decisions. Changed files invalidate Apply; there are no partial alias writes or remote lookups inside the write lock.

## Migration and affected consumers

Migration is idempotent, backed up, all-or-nothing and version-aware. Infer Goodreads aliases for existing legacy numeric records only; do not infer sources for arbitrary new IDs. Preserve every current ID, data field, curation key, local cover filename and rendered book anchor. Capture rendered before/after snapshots so migration alone changes no visible content. Never make a migration save based on search results.

Audit/update: import.rb, settings.rb, manage.rb, transaction.rb, metadata.rb; books.js/fetch/UI; exact publication snapshots/summaries; owned cover filename validation; YAML/checker schemas; Liquid selection/rendering and JS anchors; bundle packaging/tests. Provider-specific validation stays strict inside each provider namespace. Widen local ID/path rules to numeric or the precise local-UUID format only, not arbitrary paths. Goodreads RSS/review links use Goodreads aliases, not local IDs; a manual book without Goodreads linkage never fetches that user's RSS as its identity source. Public links must have correct provider labels and no fabricated Goodreads review URLs. Do not touch post publishing/preview/deletion core modules.

Existing saved publication/recovery intents must complete with their old frozen bytes or block migration with a clear retry instruction; do not reinterpret them under a new schema. Gate new-schema publication until compatible committed page code/checkers are released, just as the initial Bookshelf setup is gated now. Preview can use the current feature overlay; data-only publication must never push new fields to incompatible released code. Mixed old/new plugin versions must reject unsupported schema, not erase unknown fields.

## Provider behaviour and failure scenarios

Respect Open Library's documented default one request/second, use bounded queues/backoff/Retry-After, request only needed fields and avoid bulk crawling. Session-only result caching is sufficient. No private contact address added to headers without authorization. Do not require an API key. Use documented Work/Edition JSON endpoints rather than the deprecated legacy lookup API.

Fetch/decode covers automatically; verify missing covers via default=false/404 and image checks. Preserve chosen manual covers and explicit no-cover choices. Validate any additional URL query form rather than weakening the existing URL allowlist. A missing/broken cover does not prevent adding an otherwise valid book; show the existing text fallback and Retry option. Cancellation/stale responses cannot replace another book's selection.

Test before live data:
- Direct add → repeated imports absent/present/absent again; every manual choice survives.
- Same record added again, same ISBN-10/13, different editions of one work, multiple equal identifiers and conflicting author/ISBN evidence.
- No ISBN, invalid checksum, alternate titles, same title/different author, translations, abridged/adapted works, omnibus versus volume, series names and author initials.
- Work-level aggregated ISBNs do not create false matches; provider work/edition redirects or merged IDs do not rewrite local IDs.
- Two incoming rows target one local entry; primary-source conflicts resolved once; row reordering never changes the outcome.
- Confirmed link, Keep separate, Skip, corrected link and re-import; decisions persist appropriately. Cancellation writes nothing. Unsupported/malicious provider URLs, malformed JSON and absent fields fail safely.
- Manual rating/status/date override, explicit blank, reset-to-source, current→read and hidden/order independence. Future/unknown dates keep existing sort rules.
- Network offline/429/timeout; no result; missing/corrupt image; source removed; partial CSV, duplicate CSV IDs and no eligible additions.
- Concurrent edits after review, interrupted transaction/recovery, failed disk write, no-op repeat import, pending publication during migration, stale plugin/schema and upload retry preserving exact bytes.
- Migration parity for all current books, anchors, covers, sections and link counts; frozen preview/publication with local IDs; normal post publishing/preview/cleanup regressions.
- Native add/search/confirmation/conflict/Save/Cancel tasks with keyboard and actual theme; screenshots and user walkthrough. Test harness alone is not native acceptance.

## Build sequence and gates

1. Freeze this spec and the one-entry default. Audit the precise schemas/consumers and record current data, installed-plugin backup and rendered baseline on the existing feature branch. Do not re-import real data during development.
2. First implement/test the source-independent identity, effective-field rules and idempotent migration in disposable fixtures. Prove preservation before adding a search UI.
3. Implement the deterministic import planner and conflict decisions against fixtures, including repeated imports and the absent/present/absent case. Apply stays transactional. No production data changes until this passes.
4. Extend the existing Open Library adapter with search/edition data. Before integration, run live bounded search/edition/cover smoke checks for Mindset, Cuckold, Harry Potter and an ISBN-less/uncommon book, plus an absent-cover case. Research shell probe in this planning turn failed DNS in the restricted environment; provider docs were available through web tools. Do not report fresh API smoke tests as passed yet.
5. Add the native staged add workflow and minimal field/source-link controls inside the existing manager panels. Keep all three sections manually controllable; do not introduce a parallel management screen.
6. Update effective rendering, checks, cover ID mapping and publication compatibility gate, then generated/installed-bundle tests. Run full JS/Ruby regressions and isolated real-library build/parity checks.
7. Install only the tested feature bundle, perform cancel-only native checks, then the author tests: add a book absent from Goodreads, curate it, import a CSV without it, import it later with a confirmed match, and repeat unchanged. Use disposable copies first. Preserve logs/backups, then release code before new-schema data publication.

Not included: two-way Goodreads writes, scraping every book site, scheduled sync, per-book Markdown notes, reading-event history, automatic destructive merging or a generic entity-resolution platform. Reuse existing persistence, packaging and UI. Additional complexity must directly protect identity, ownership or recovery.

## Documentation consulted

- https://openlibrary.org/dev/docs/api/search — work versus edition search, requested fields, identifiers and stability limits.
- https://openlibrary.org/developers/api — request limits, Work/Edition endpoints, deprecated legacy lookup API.
- https://openlibrary.org/dev/docs/api/covers — cover sizes, missing-image behaviour/default=false.
- https://docs.openlibrary.org/librarians/guide-to-identifiers.html — edition IDs, ISBNs and Goodreads cross-identifiers.
- https://github.com/obsidianmd/obsidian-api — native Modal/SuggestModal/requestUrl contracts via Context7.
- https://github.com/DuckTapeKiller/global-book-search — existing multi-provider note workflow and Open Library adapter source reference.
- https://github.com/LastRatAlive/Librarian — book tracking, Open Library picker and Goodreads roadmap.
- https://github.com/anpigon/obsidian-book-search-plugin — book-note/Google Books workflow; inspect exact source license before any reuse.
