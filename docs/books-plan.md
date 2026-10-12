# Books — research and implementation plan

Updated: 13 October 2026. Implementation started at the author’s request on 13 October; local feature work only, not released. Main tracker: [personal-site-plan.md](personal-site-plan.md).

## Agreed scope

- Goodreads profile: https://www.goodreads.com/user/show/66848291-ashutosh.
- Finished books only when rated; exclude unrated finished books, even if a future record has a review. Keep all currently-reading books regardless of rating (currently nine) in a separate section. Exclude want-to-read. Unrated means no rating, not zero stars. These choices were confirmed by the author on 13 October.
- Goodreads is the initial source for ratings/reviews. Manual export/import first; investigate automation after that workflow works.
- Blog and Goodreads writing are independent. The author wants to manage connections from a book to an existing published post, not select books while drafting/publishing a post. Do not add book selection to the existing blog publication flow.
- Books → Films → short entries (name undecided) → deferred improvements. Capture written Goodreads updates now for later use; do not publish them yet.
- Keep the existing Jekyll theme, typography, hosting and homepage composition. No new paid service, theme or Obsidian plugin required for the initial Books page.

## Evidence gathered and remaining information

The current site and visual references were inspected in the browser. Local inspection covered navigation, page layouts, homepage sections, Jekyll configuration, data folders, existing book-review posts and the boundaries of PublishDesk. PublishDesk currently publishes blog posts; it does not already import a book library.

The authenticated Goodreads library showed shelves labelled Read (44) and Currently Reading (9) on 13 October. Counts are discovery evidence, not hardcoded totals or the number of eligible rated/reviewed books. The page's other aggregate counts were inconsistent, so the actual export must determine import totals. At least one finished book displayed no date read: never substitute date added as its completion date.

The supplied [Wolf Hall update](https://www.goodreads.com/user_status/show/1346684914) has authored prose, reading progress, a book link and a displayed original date (8 October 2026). The [status history](https://www.goodreads.com/user_status/list/66848291-ashutosh) reported 20 entries, with both authored prose and progress-only updates, reaching back to December 2024. This verifies that a bounded historical capture is feasible; it does not prove every update ever written is available. Displayed timestamps do not establish their time zone.

The current [export page](https://www.goodreads.com/review/import) was inspected and the generated CSV downloaded to Downloads, outside the website repository. Read-only inspection found 374 records: 44 read, 9 currently reading and 321 want-to-read. Of the finished books, 35 have ratings and 11 of those have reviews; the other 9 have neither. Among the 35 eligible books, 23 lack a completion date. Six reviews contain HTML line breaks; the longest is 3,541 characters. No duplicate book IDs were found. Exported ISBNs use spreadsheet wrappers such as `="9780752877198"`, ratings are numeric strings such as `4.0`, and the eligible read counts are all 1. The export includes a Private Notes column but no cover URLs, written-status history or average-rating column. Do not publish the raw export. Library export and status history are separate sources.

## Required competencies and tools

Editorial/visual design and information architecture; Jekyll/Liquid and responsive CSS; CSV data migration and stable identity; cover-image handling; accessibility/SEO; regression testing and Git release management. Use current Jekyll documentation through Context7, primary source documentation and browser inspection. These are ordinary development/design tasks supported by the existing toolchain, not reasons to install extra skills or migrate frameworks.

## Reader design and experience

The page should feel like this personal site's reading room: the existing typography and violet accent, with personality supplied by the book covers and the author's writing. No new marketing hero, decorative eyebrows, boxed dashboard or imitation wooden shelf. These are proposed design decisions, not completed interface work.

- **Entry:** Books sits between Blog and About in navigation. A normal page heading leads straight into the collection. The homepage stays as it is. Small in-page links to Currently reading and Finished books help readers navigate the longer page.
- **Currently reading:** prototype a single horizontally scrollable shelf on desktop and mobile, using native scrolling rather than an auto-advancing carousel. Each item shows a modest cover, title and author. A partly visible next item and a visible scroll affordance indicate more content; provide labelled previous/next controls where helpful for mouse and keyboard users. Keep every book reachable without hover, prevent page-wide overflow, respect reduced motion and allow normal vertical page scrolling. Use this only if the real desktop/mobile preview fits the existing site; review any alternative before replacing it.
- **Finished books:** one readable column of cover-and-text rows. Start with covers around 100–120 pixels wide on desktop and smaller on phones, preserving their proportions; confirm sizes against real covers and long titles in the preview. Titles lead, authors are secondary, and personal ratings sit quietly beneath them. Keep metadata visually smaller than titles without sacrificing contrast. Use spacing or faint separators rather than a heavy border around every book.
- **Reading a review:** an explicit Goodreads review disclosure opens the complete review underneath its book, at the site's comfortable prose width. It can be closed again. No modal, hover-only review, truncated text with no way to read the rest, or mandatory trip to Goodreads. A source link remains available. Books without a review have no empty review control.
- **Finding blog writing:** beneath the relevant book, On the blog links show the actual post titles. They are separate from the Goodreads review and are never automatically called reviews. Use one action link, Explore writing about books, to the existing `/tags/#Books` section instead of repeating a post list on this page. Keep per-book links, including explicitly associated posts without a Books tag; do not silently retag them.
- **Browsing:** finished books start in A–Z order. A small labelled sort control can switch to rating order without disturbing Currently reading. Add a With reviews filter only if it earns its space in the real-content preview. Do not group by fabricated completion years. All books, reviews and links remain usable without JavaScript; controls retain keyboard focus and sorting changes are announced accessibly.
- **Inclusive details:** accessible text states the personal rating, rather than relying on star colour alone. Covers reserve their space to avoid layout jumps and have a restrained missing-image fallback. Test light/dark mode, keyboard use, phone layouts and the longest review. Avoid motion that interferes with reading.

The first preview uses the real imported library. Compare the intended rows with a more cover-forward alternative, then review the complete desktop and phone page with the author before polishing. Cover proportions, spacing and type hierarchy are part of that first design pass, not a later decoration task.

## Author experience

Keep Goodreads writing and blog writing independent. The website has no public administration interface. Routine management happens through separate PublishDesk commands in Obsidian:

1. **Import books from Goodreads:** choose the exported CSV on the Mac, inspect additions/changes/removals, and apply them locally. Failed input retains the previous usable library. This step does not publish.
2. **Manage book links:** find a book by title/author, select existing published posts by their titles, and save or remove the connections. Cover replacement is available here. No IDs or YAML editing, and no extra question in ordinary blog publishing.
3. **Preview Books page:** see the complete local page, including saved changes. Errors remain visible with a useful recovery action; the last successful preview stays available.
4. **Publish Books changes:** inspect the exact Books files being uploaded, optionally add commit notes, then publish. Report success or failure clearly and support the existing retry workflow. Unrelated draft/post changes are excluded.

Saving a connection or importing a CSV never puts it online. Updated Goodreads data must preserve manually chosen covers and blog connections.

## Branch lifecycle

Use one short-lived `codex/books` branch for the coherent Books feature, including its importer, page, management controls, tests and design iterations. Do not create another branch for each conversation, review comment or small adjustment. Develop in a separate checkout so the author's production writing vault stays on `newtheme`.

Review and merge the completed feature into the current publishing branch, `newtheme`; retire the feature branch/worktree after release verification and preservation of anything still needed. Start a separate Films branch when that independent feature begins. Routine post publication continues through the existing direct PublishDesk workflow. Branch protection remains optional and skipped by the author's decision.

Reference: [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow). This is a suitable lightweight workflow for this repository, not the only development workflow used in the industry.

## Implementation sequence

The checklist below is the build order. The numbered design/data constraints following it remain acceptance requirements, not a second release sequence. This plan was accepted for step-by-step implementation. See the progress record below for actual completed work.

### A. Isolate development and establish the baseline

- [x] Reuse a suitable attached worktree if available; otherwise create a managed worktree from `newtheme` on `codex/books`. Keep the live publishing checkout and installed PublishDesk usable while developing.
- [x] Carry the reviewed planning documents into the feature checkout. Record the baseline revision and run the existing relevant build/publishing checks once before changes.
- [ ] Verify sample exported records against Goodreads and recheck status-history availability. Preserve the raw export privately, outside public data and Git.

### B. Build the data layer and first import

- [ ] Define public records in `_data/books.yml`: stable Goodreads ID, title/author, optional ISBN, status, optional user rating/review/completion date, source URL and cover reference. Keep site-owned associations/cover overrides in `_data/books-overrides.yml`.
- [x] Implement a small Ruby CSV importer using the existing runtime. Whitelist fields, normalize spreadsheet-wrapped ISBNs and numeric ratings, preserve review paragraphs safely, apply rated/read and all-currently-reading eligibility, and handle unknown dates without inventing them.
- [x] Support a dry-run change summary before applying additions/edits/removals. Deterministic output, atomic writes and recoverable previous data; incomplete input and invalid records must leave the last usable data intact.
- [x] Verify the initial expected 35 rated/read records, 9 currently-reading records and 11 reviews; counts remain data-derived for future imports. Do not import the 321 want-to-read records or nine unrated finished records into the public shelf.

### C. Create the first complete visual preview

- [ ] Resolve exact-edition covers and a graceful missing-cover treatment; cache approved files under `images/books/`. Retain local overrides across refreshes; do not make visitor-time Goodreads/API requests.
- [ ] Build `/books/` with the current typography, colour, spacing and light/dark modes. All nine currently-reading books in the proposed horizontal shelf, then rated finished books and a single Explore writing about books link to `/tags/#Books`. Use real titles, covers and reviews from the first import.
- [ ] Compare the planned cover/text rows against a more cover-forward composition in local preview, including mobile and the longest review/title. Review the design with the author before final polish.
- [ ] Implement inline Goodreads review disclosure, A–Z default order and restrained rating sorting. Add a With reviews filter only if it improves the actual page. Keep all primary content/links readable without JavaScript.
- [ ] Add Books between Blog and About to the site navigation. Preserve homepage composition and existing page/post URLs.

### D. Connect the existing blog writing

- [ ] Seed the reviewed book → published-post links in book overrides for Simple Marketing, Dan Nelken, Cuckold, Last Bus to Woodstock and In the Heart of the Sea.
- [ ] Render the linked post's actual title under On the blog, separate from Goodreads review. Resolve titles/URLs through Jekyll published posts; support multiple posts per book and the same post linked to multiple books.
- [ ] Add Explore writing about books linking to `/tags/#Books`; no additional writing index on the Books page. Keep per-book associations for relevant posts regardless of their tags. The Books tag currently contains six audited posts; In The Heart of The Sea remains discoverable through its book association without changing its Films-and-TV tag.
- [ ] Verify changed post titles, missing/renamed/deleted post references, excluded books and edition mismatches. Preserve connections when Goodreads changes/removes a book; report unresolved references without displaying broken links.

### E. Provide the local management workflow

- [ ] Extend the existing PublishDesk with separate Books commands: Import books from Goodreads, Manage book links, Preview Books page and Publish Books changes. Keep normal blog-writing and publishing commands unchanged.
- [ ] Import: select a CSV from the Mac, show the proposed change summary, then apply locally when confirmed. Manage links: choose a book by title/author, select published posts by title, add/remove links and save locally. Provide a cover replacement control in this management flow.
- [ ] Preview the full public Books page in an isolated local build, excluding private drafts. Saved book/link changes refresh the preview using the established full-build approach; do not add Jekyll incremental builds. Verify preview speed and avoid rebuilding for every dialog keystroke.
- [ ] Publish Books changes: show exact public data/image changes, allow optional commit notes, build/check, commit only the reviewed Books files and push on the configured publishing branch. Reuse existing Git/deployment safeguards, failure reporting, retry and matching-commit status checks where practical.
- [ ] Ensure routine updates require no YAML editing, Goodreads ID lookup or VS Code. Opening/saving/importing locally never uploads. A normal blog publication must not include pending Books changes; a Books publication must not include unrelated post edits.

### F. Preserve the written status history privately

- [ ] Capture accessible authored Goodreads status prose with original IDs, date/time precision, source URLs and book associations. Exclude progress-only updates and comments by other people. Compare the saved records against the visible history and document any gaps.
- [ ] Keep the archive in the already private `Drafts/.imports/goodreads/` area, excluded from Git and Jekyll. Preserve capture date separately and do not infer timestamp time zones.
- [ ] No diary/short-entry pages, navigation or feeds in this release. Later publication/backdating requires a separate content-selection step.

### G. Verify, document and release

- [ ] Focused importer/relationship tests: same-input no-op, additions/edits/removals, malformed/truncated exports, missing headers, unrated books, absent dates/ISBNs/covers, formatted/spoiler reviews, Unicode, duplicate/edition identities and preserved site overrides.
- [ ] Temporary-repository publishing tests: exact selected-file commits, optional notes, cancellation, unrelated changes, development-branch guard, failed build/push, retry, and deployment status. No test content uploaded.
- [ ] Visual/accessibility checks: desktop/mobile, light/dark, long titles/reviews, missing covers, layout stability, keyboard/focus, rating names, disclosure semantics and no-JavaScript reading.
- [ ] Full production build; generated public links/assets; canonical metadata, sitemap and source attribution; private source/status archive absent from output and Git. Recheck existing blog publishing and the unchanged homepage/navigation behavior.
- [ ] Install the tested helper update only at rollout, preserving the author's settings and recovery state. Test native Mac import → link → preview; let the author exercise the refresh/publishing workflow on the reviewed release.
- [ ] Update the Obsidian author guide and main tracker with exact steps, evidence, limitations and release references. Prepare a focused PR with detailed commit messages; deploy after approval of the concrete preview/release, then verify the public Books page and matching Pages build.

### Deliberately deferred

Scheduled refresh, Goodreads write-back, Letterboxd/Films, the diary and its naming, book-specific standalone pages, bidirectional blog-to-shelf links, legacy image migration and hover thumbnails. These are not needed to ship the manual Books workflow.

### Supporting design and data requirements

1. **Finish source validation.** The CSV audit is complete; before implementing, verify representative records against Goodreads, including the longest review and books lacking dates. Keep the source CSV outside public output and Git. Whitelist public fields; never publish private notes, unrelated shelves or an entire raw export. Keep all nine currently-reading records as instructed; no additional curation gate needed.
2. **Review the design with real examples.** Place Books at `/books/` with navigation Blog → Books → About. A small Currently reading section precedes finished books. Use modest uncropped covers, readable titles/authors, quiet ratings and an explicit Read review control where applicable. Preserve Source Sans 3, violet accents, light/dark mode and current spacing. Test short, long and absent reviews. Do not replace the homepage with a shelf or add decorative section labels. Default to alphabetical order because most eligible books lack a completion date. Optionally offer rating/title sorting; only offer chronological grouping for known dates, explicitly separate undated books and never use date added as completion date. Search only if useful at the actual collection size.
3. **Use the smallest content model.** One normalized `_data/books.yml` consumed by a native Jekyll page, with stable per-book anchors and accessible review disclosure, suits the actual 35 eligible books and 11 reviews. No new collection or individual book pages in the initial feature. Link to existing book-related blog writing through explicit post associations, as specified below, without changing URLs or duplicating entire posts. Avoid separate indexable pages containing only a title/rating. Reconsider a native collection only if future content needs it.
4. **Build the manual importer.** Prefer Ruby's standard CSV tooling, already present for Jekyll, rather than adding a runtime. Match on stable Goodreads book IDs, preserve IDs/ISBNs as strings, handle quoted/multiline CSV correctly and update existing records rather than append duplicates. Explain edition collisions instead of merging solely by title. Preview additions, edits and removals before writing; missing/incomplete input must not silently erase the library. Keep any site-only cover/link overrides separate from imported values. Reimporting identical input should make no changes.
5. **Resolve covers without making them mandatory.** First inspect available exact-edition sources; Open Library's ISBN/cover-ID API is a fallback, not a guarantee of correct editions. Provide a manual override and tasteful text-only fallback. Cache approved covers in one `images/books/` folder, preserve proportions, reserve image space and lazy-load below the fold. No thumbnail pipeline or legacy image migration in this feature. Failed cover retrieval must not prevent book content from rendering.
6. **Capture written updates separately.** Save the author's written status entries in a Git-ignored, Jekyll-excluded import archive, using original status ID, prose, source URL, book association and original displayed date/time with known precision. Exclude likes, comments by others and progress-only entries. Preserve paragraphs and distinguish quotations/excerpts when reviewing entries. Record capture date separately; do not invent time zones or replace original dates with import dates. No short-entry page/nav/feed yet. Later publication is a separate selection/review step.
7. **Make refresh usable and explicit.** Initially export from Goodreads, select the CSV, review changes, preview and publish the reviewed site change. Implement/document the exact entry point so routine refresh does not require editing YAML or using VS Code; assess whether a small PublishDesk import command is justified after the importer works. Saving in Obsidian must still never upload. Existing PublishDesk post commands must not accidentally commit unrelated book changes. RSS automation is a later enhancement, not a substitute for full historical/reconciliation imports.
8. **Verify and release.** Implement on a new `codex/` feature branch after this plan is accepted, without moving the author's active writing workflow onto that branch. Review a local preview, import change summary and PR before release. Update the main tracker and author guide with the exact repeatable workflow and limitations.

## Acceptance checks

- Identical import is a no-op; changed reviews/ratings/statuses update correctly; missing headers, malformed/truncated input and ambiguous duplicates fail clearly without corrupting existing data.
- Missing dates/ISBNs/covers, Unicode, multiline CSV, HTML, spoiler content, unrated books and available reread information are handled without invented values or silent loss. Do not claim full reread history if Goodreads does not export it.
- All eligible books are accounted for; want-to-read/private fields are absent; originals and the update archive do not appear in Git, public HTML, sitemap or feeds.
- Reviews and primary browsing work without JavaScript. Mobile/desktop, long titles, keyboard controls, screen-reader rating text, focus, reduced motion, light/dark mode, layout stability and cover failures are checked.
- Full build, internal links, existing blog URLs/reviews, metadata, canonical URL and sitemap pass. No fabricated aggregate ratings or promise of Google indexing/rich results.
- Current blog publishing remains functional; Books commits contain only reviewed public files. Failed refresh/network operations leave the last usable library intact.
- Book-to-post associations support several books per post and several posts per book; derive link titles/URLs from actual published Jekyll posts. Store associations in the site's existing planned book overrides, separate from imported Goodreads data. Links survive Goodreads refreshes and do not expose private drafts. Validate book IDs, missing post references and duplicate associations; distinguish editions through reviewed matching, not fuzzy automatic guesses. Post title edits do not require relinking; source renames/deletions need a clear repair prompt rather than stale links.
- Books-related writing remains discoverable when its book is unrated, excluded or absent from the Goodreads export. No rating, completion status or new imported book record is fabricated to make a link appear.

## Book-related blog writing audit — 13 October

All 37 published post sources were searched for book tags, named works, Goodreads links and book/reading references. Six Books-tagged posts were read in full, along with the relevant film/TV and essay candidates. This yields seven substantive book-related posts for the initial linking design:

- **Mr Oliver's Diary** (`2021-5-4-Mr-Olivers-Diary.md`): personal appreciation/recommendation of Ruskin Bond's book, mixed with a diary opening. The book is absent from the CSV. Do not label it a formal review or add a fictitious rating.
- **Stephen King On Writing** (`2021-5-17-Stephen-King-On-Writing.md`): mid-reading reflection, writing advice and a quotation; not a completed-book review. The book is absent from the CSV. The source names Goodreads edition 10569; do not confuse it with William Zinsser's On Writing Well in the export.
- **Inspector Morse** (`2021-5-18-Inspector-Morse.md`): appreciation of Colin Dexter's series and its atmosphere. Names Last Bus to Woodstock (76909, rated/read), The Way Through the Woods (76917, unrated/read) and Service of All the Dead (76915, absent from the export). Link from Last Bus to Woodstock as related series writing, not a review of that specific novel. Excluded/absent books do not become new visible reading-list entries.
- **Most Impactful Reads of 2023** (`2024-4-16-Most-Impactful-Reads-of-2023.md`): mixed article/book roundup recommending Cuckold (109326, rated/read) and The Courage to be Disliked (unrated/read, imported edition 43395585; the post links edition 43306206). Explicitly reconcile the edition difference if/when this book becomes eligible. Its Managing Oneself section links an HBR article, not an identified book edition.
- **Book Review // Simple Marketing for Smart People** (`2025-8-31-simple-marketing-for-smart-people-book-review.md`): review plus substantial marketing notes. Imported book 209231611 is rated/read. Its short Goodreads review and long blog post are separate content; keep both access paths clearly labelled.
- **Book Review // A Self-Help Guide for Copywriters** (`2026-2-19-book-review-a-self-help-guide-for-copywriters-by-dan-nelken.md`): review, process notes and visual ad examples. Imported book 59784779 is currently reading and unrated. Keep the source shelf/status as instructed; an existing blog review does not silently change Goodreads status.
- **In The Heart of The Sea** (`2021-4-3-In-The-Heart-of-The-Sea.md`): primarily film appreciation, but includes a substantive recommendation/comparison of Nathaniel Philbrick's book (17780, rated/read). Relevant related writing despite its Films-and-TV tag. Do not label it a book review.

Not automatically associated: Best of Paul Graham is about web essays; Bosch discusses a TV adaptation without identifying a particular novel; Quotes From 1883 briefly compares the show to Lonesome Dove but is not substantive writing about that novel. Generic reading mentions do not establish book relationships. Do not change existing tags or prose as part of this audit.

### Linking design and authoring

1. Each eligible book can show an **On the blog** area with the actual linked post title. Do not call all links reviews. Where a Goodreads review also exists, label its disclosure **Goodreads review**, keeping the blog link visibly distinct.
2. Use a single **Explore writing about books** action link to `/tags/#Books`, replacing the proposed duplicate post list. Books-tagged posts remain discoverable there even without an eligible shelf entry. The tag currently covers six audited posts; In The Heart of The Sea keeps its existing tag and its explicit per-book link. Do not change tags automatically to make this destination include every audited post.
3. Store associations once in the planned `_data/books-overrides.yml`, keyed by stable Goodreads ID, alongside site-specific cover overrides. Each book has an optional list of references to existing published post source files. Resolve these against actual Jekyll posts to derive current titles/URLs. No new post front-matter field, automatic prose matching, duplicate relationship store or mandatory review/essay taxonomy. The same published post can be selected for multiple books; each book can link multiple posts.
4. Manage associations from the book, separately from writing: choose a book in the local Books management/import workflow, select an existing published post by title, save, preview, then publish the reviewed change. Provide a small local command/dialog if needed so the author does not edit YAML, look up IDs, or use VS Code. Existing blog Publish stays unchanged and never adds a linking prompt. Goodreads and blog writing remain independent; neither is copied into the other. Missing/excluded books do not block blog publication or gain invented ratings/statuses. Books-tagged posts remain accessible through the Books tag even without a shelf association. Local changes save without uploading; no public website editing interface or new hosted CMS is required.
5. Seed the known relationships during Books implementation after verifying the exact published URLs and imported IDs. Linking must not alter ratings, shelves, dates or existing blog routes. A Goodreads refresh must leave post metadata and these links intact. Bidirectional links from blog posts back to the shelf can be considered later rather than enlarging the current page-redesign scope.

Workflow correction (13 October): the previous post-first Obsidian book picker was a proposal, never implemented, and is withdrawn. The author confirmed that Goodreads/blog writing are independent and that the intended action is linking a book to a post. Reading-list eligibility is separate from writing discovery: an excluded or absent book does not need a new public record merely to keep its blog post discoverable. Preserve overrides when a book disappears from an export or becomes ineligible, hide the corresponding shelf entry, and report the change during refresh rather than destroying its relationships. Resolve explicitly linked published posts under their books, without adding new book properties to those posts. The later design correction replaces the separate writing index with a Books-tag link.

## Expanded visual research — 13 October

Six additional sites were inspected visually in the browser, expanding the original two references to eight. These are observed design examples and our design judgments, not claims that every interaction is accessible or suitable to copy.

- [Patrick Collison](https://patrickcollison.com/bookshelf): a plain, densely linked list within a personal site. Useful benchmark for scanability; insufficient visual presence for this author's brief. Colour alone as a recommendation marker should not be copied.
- [Flo Guo](https://www.floguo.com/books): a restrained list with distinct reading states, author metadata, filters and a notes pane. Useful separation of browsing and reading; do not import its side navigation, decorative ribbon, all-cap labels or permanently split reading panes into this site. On this site, reviews should open in the document flow.
- [Pierre Lechevallier](https://www.pierrelechevallier.com/bookshelf): cover-and-prose pairs in two columns, with personal commentary rather than only metadata. Useful image/text relationship; its oversized banner and generous category headings would overwhelm our modest collection. Long review prose needs more room than a narrow two-column block.
- [The Visible Shelf](https://thevisibleshelf.com/books): expressive cover mosaic with several browsing modes and many filters. The 3D homepage initially showed a blank stage in this browser; the conventional collection view rendered covers. Useful cover-led personality, but excessive controls and physics/3D interactions would complicate this page and its reading purpose.
- [Stripe Press](https://press.stripe.com/): sculptural books with prominent editorial typography. The homepage initially showed an empty stage; selecting a book rendered its 3D cover and prose. Useful reference for respecting a cover as an object; not a proposal for WebGL, purchasable products, copied fonts or per-book palettes. This is a publisher reference rather than a personal reading log.
- [Ricardo Magalhães](https://ricardofilipe.com/#bookshelf): expressive typographic section, currently-reading area and compact two-column favourite list. During inspection the live Goodreads area displayed a fetch error while the static favourites remained visible. This supports retaining local imported data rather than fetching Goodreads when a visitor opens our page; it does not establish why that site's request failed.

Together with Maggie Appleton's cover library and Derek Sivers's readable notes, these references strengthen the initial direction rather than justify replacing the theme.

### Refined design direction to preview

- Use the current site's heading scale, Source Sans 3, violet accent and light/dark background. Book covers supply varied colour and character. No new palette, decorative eyebrows or simulated wooden shelving.
- Prototype all nine currently-reading books in a single horizontally scrollable shelf on desktop and mobile, following the reader-experience requirements above. Confirm that its proportions, overflow cues and keyboard/mouse/touch interaction fit the existing layout before finalizing; no automatic slide advancement.
- Finished books use a readable list of cover-and-text rows, with consistent uncropped covers large enough to recognise. Title first, author secondary, quiet accessible stars/numeric rating, and a clearly identified review disclosure only where one exists. Reviews open inline at a comfortable reading width; no hover-only prose or modal required.
- Default A–Z, with a modest rating sort and a single optional With reviews filter if the prototype shows it helps. Avoid the large dashboard/filter panels seen in some references. Browsing remains functional without JavaScript.
- Check two representative visual compositions in local preview before polishing: the intended cover-and-text rows and a more cover-forward alternative. Choose based on the actual nine current books, 35 rated books, longest titles and longest review—not an empty mockup. This is a design review step within the agreed feature, not approval to implement it now.

## Research references

- [Jekyll data files](https://jekyllrb.com/docs/datafiles/) and [collections](https://jekyllrb.com/docs/collections/): native content models compatible with the existing static build.
- [Goodreads export](https://www.goodreads.com/review/import) and [the author's status history](https://www.goodreads.com/user_status/list/66848291-ashutosh): inspected current account UI.
- [Goodreads RSS integration documentation](https://github.com/sadmanca/astro-loader-goodreads): documents recent-feed limits (100 shelf entries, 10 updates). These are integration observations, not a guarantee of current Goodreads account behavior; verify actual feeds before relying on them. No Astro migration proposed.
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers): identifier-based covers, size variants and explicit missing-image handling.
- [Maggie Appleton's library](https://maggieappleton.com/library) and [Derek Sivers's book notes](https://sive.rs/book): inspected visual examples; use the character of covers with the readability of a reading log, within this site's existing design.

## Implementation progress — 13 October

- Managed checkout: `/Users/ashutoshbhosale/.codex/worktrees/books/wowashuwow.github.io`, branch `codex/books`, baseline `6704856db69938d913778a7848a2407a3fac0c69`. The active writing vault remains on `newtheme`.
- Baseline full Jekyll build passed (2.489 seconds); 18 existing publishing/cleanup tests passed.
- Added `_writing/books/import.rb` and command documentation, plus 12 importer tests/67 assertions. All passed. Initial local `_data/books.yml` contains 35 rated finished books, nine currently-reading books and 11 reviews. A repeated import was a no-op. No private-note/date-added/average-rating fields are copied.
- Review sanitization uses Nokogiri from the existing bundle; no new runtime/dependency installation. CSV dry-run precedes applying; removals require explicit acknowledgement. A valid subset CSV cannot always be proven incomplete, so removal review remains essential.
- Goodreads' visible shelf confirmed nine current titles and the completed Let It Bleed record’s four-star rating/date. Observed exact-ID covers were exported to temporary browser asset bundles, not yet added to public files. No Books page or Obsidian controls installed yet.
- Cover-source correction: Open Library's own guidelines request remote cover URLs for public pages and discourage bulk API downloading. Do not implement the previously proposed bulk caching from that API. Exact Goodreads-ID observed covers/manual local covers are being evaluated first; record source attribution and image quality before settling the final policy.

## Existing Obsidian plugin audit — 13 October

The author asked for this audit after the first local importer was implemented; the original plan had not adequately compared existing community tools. Source/documentation inspection only: no third-party plugin installed or executed. Registry membership was checked against Obsidian’s official `obsidian-releases` community plugin list.

- [Booksidian](https://github.com/MichaBrugger/booksidian_plugin): Goodreads RSS to templated notes. Documented default leaves imported notes unchanged; overwrite mode replaces notes, including custom edits. Maintainer documents a 100-item shelf limit. Potential later RSS input, but not the accepted manual CSV refresh or site-owned override/publishing workflow.
- [GoodReadSync](https://github.com/sergiodlash/goodreadsync): RSS/template note import keyed by `bookID`. Inspected `main.ts`: existing IDs are skipped, existing paths are not overwritten. It imports new notes rather than refreshing previously imported ratings/reviews.
- [Dogear](https://github.com/MasoudMiM/obsidian-dogear): closest manual CSV migration tool. Inspected release 1.2.0 `src/goodreads.ts` and `src/ui/importModal.ts`: imports reviews and private notes into note prose, detects existing books by ISBN/title+author and defaults to skipping them; selected records go through a creation operation, not an update/reconciliation operation. Useful for a separate personal reading library, but a website would still require public-field filtering and an adapter.
- [Bookshelf](https://weph.github.io/obsidian-bookshelf/): local book notes, reading progress, library/statistics/Bases views. Documentation inspected; not a replacement for Goodreads → Jekyll import/publishing.
- [Book Search](https://github.com/anpigon/obsidian-book-search-plugin) and [Global Book Search](https://github.com/DuckTapeKiller/global-book-search): book metadata/cover lookup and templated note creation. Global Book Search supports multiple providers, local covers, edition selection and duplicate prompts. Could help occasional cover/metadata selection; documented features do not provide personal Goodreads shelf/rating/review reconciliation. Do not confuse publisher descriptions or community average ratings with the author's review/rating.
- [Librarian](https://github.com/lastratalive/Librarian): Open Library metadata, local reading states/history, notes and quotes; supports non-destructive frontmatter management. Current README lists Goodreads CSV import/export as future roadmap work, not implemented functionality. README's directory-availability wording is stale: the live official registry includes it.
- [goodreads-to-obsidian](https://github.com/bbbburns/goodreads-to-obsidian): CSV-to-note migration script, explicitly aimed at moving off Goodreads rather than continuing to refresh a website.

Recommendation: keep the small direct CSV → Jekyll importer, rather than add an Obsidian reading tracker and a second note-to-site conversion layer. Reuse existing plugins if the author later wants a personal book-note library or metadata-search UI; do not rebuild their reading-progress dashboards. Native Books page design, per-book links and reviewed site publication remain website-specific work in either approach.
