# wowashuwow.com — main project plan and checklist

Last updated: 13 October 2026.

This is the authoritative project tracker. Checked items are implemented/verified locally unless explicitly marked deployed. Detailed visual rules live in [design-foundation.md](design-foundation.md); release evidence and test limitations live in [release-checks.md](release-checks.md). Future scope is not authorization to implement everything at once.

## Current status

- Current working/publishing branch: `newtheme`. PublishDesk is released; the website root is its separate Obsidian vault.
- PublishDesk released through [PR #3](https://github.com/wowashuwow/wowashuwow.github.io/pull/3); optional publication notes released through [PR #4](https://github.com/wowashuwow/wowashuwow.github.io/pull/4). On 13 October the author confirmed both publishing Jacked and Guilty and updating another post’s description worked.
- Compact design is live; localhost previews are temporary and their ports vary by session.
- Publishing branch: `newtheme`; Pages confirmed as branch publishing from the root, with HTTPS enforced.
- Current redesign is released at https://wowashuwow.com/; local and public release checks passed.
- Redesign commit: `3a24d92103c9f81379fecfb91c985718e538d2b2`.
- [PR #1](https://github.com/wowashuwow/wowashuwow.github.io/pull/1) merged into newtheme as `5bcc5dc69d58a05c97d2d7213f0863730d909804`.
- Deployment [run #261](https://github.com/wowashuwow/wowashuwow.github.io/actions/runs/38174520983) succeeded in 1m 30s; public verification passed.
- Jacked and Guilty has now been published by the author through PublishDesk. Legacy standalone image remains protected; private Drafts and recovery copies remain excluded from Git/public output.
- Next feature order agreed 13 October: Books → Films → short entries (name undecided) → deferred improvements. Books research and the implementation plan are in [books-plan.md](books-plan.md); implementation has not started.
- Branch protection is optional and deliberately skipped. PublishDesk's normal direct-push workflow remains in place.

## Design and scope decisions

- Preserve and personalise Clancy 1.1, Source Sans 3, violet accents, light/dark mode, and the existing gallery. No paid theme.
- Avoid generic AI-site styling, repeated decorative eyebrows, replacement palettes, fake content, and uniform cards for every section.
- The site must support thoughtful writing and visual work: quiet writing lists, expressive photography and two branded project cards.
- Homepage order: introduction → five recent posts → Photography (six photos) → Projects → subscription/footer.
- Greeting: “Hi, I'm Ashutosh.” Bio: “I'm a writer, photographer, fitness junkie, and product builder. Welcome to my personal blog. 👊”.
- Top navigation contains internal pages only: Blog and About. Work portfolio is in footer navigation; the external photography destination sits beside Photography and within existing About prose.
- Section links use action-led copy; navigation uses simple nouns. Examples: Explore all writing, Visit photography site, Work portfolio.
- The site uses tags, not separate categories. Writing lists show one selected primary topic; article headers show all assigned tags below the title. No author label on this single-author site.
- Text descriptions appear only on title hover/keyboard focus. Image hover previews are deferred for maintainability.
- Write from Obsidian on Mac only. Choose the simplest reliable workflow; no image requirement.

## Completed and released

- [x] Develop on a separate redesign branch.
- [x] Choose compact typography and retain the existing visual identity.
- [x] Image-free homepage writing list with five recent posts.
- [x] One Blog index with all posts grouped automatically by year, no pagination or duplicate Archive page.
- [x] Preserve old blog pagination URLs 2–4 through static compatibility redirects.
- [x] Replace expanding topic disclosure with direct topic links.
- [x] Quiet primary-topic pills in lists; all assigned tags together below article titles.
- [x] Remove visible author and separate article-end tags.
- [x] Text-only title previews: delayed hover, keyboard focus, Escape dismissal, viewport positioning, no layout shift.
- [x] Six-photo Photography preview above Projects; first photograph is gallery-05.
- [x] Accurate alt text for all six selected photographs, gallery/lightbox preserved.
- [x] Two project cards with real brand assets and restrained pointer tilt; touch/reduced-motion users get static cards.
- [x] Hypertropher copy: “Always find quality high-protein food, no matter where you are.”
- [x] Case Study Academy card and destination.
- [x] Main Instagram, LinkedIn, GitHub as icons only with accessible names, visible focus, and 44px targets. Remove Fitness Instagram.
- [x] Photography/work portfolio external-link icons; external Photos removed from top navigation.
- [x] Remove the added Elsewhere section from About; retain original About prose.
- [x] HTTPS subscription destination, required email field, autocomplete and native validation.
- [x] Production build, JavaScript syntax, whitespace, generated internal links/assets, metadata, sitemap/feed, draft exclusion.
- [x] Desktop/mobile layout, no phone overflow, dark mode, gallery open/Escape close, mobile menu, keyboard previews and social controls reviewed.
- [x] Main project/portfolio/photography external destinations return HTTP 200.

These checks do not constitute full WCAG certification or a guarantee of Google indexing. Newsletter delivery was not tested by submitting an address. Pointer-driven tilt is implemented but has not been directly exercised with mouse movement. See release-checks.md for the evidence and limitations.

## Release — completed 12 October 2026

- [x] Inspect the exact release diff and stage only redesign files, excluding the author's draft/image.
- [x] Commit the reviewed changes and prepare a pull request targeting newtheme.
- [x] Verify live Pages publishing configuration and run any repository checks on the release revision.
- [x] Merge/deploy after explicit approval of the concrete release.
- [x] Verify the public homepage, Blog, representative article, gallery, assets, compatibility URLs and production metadata. Image-free article layout verified locally; no new test post published.
- [x] Update this tracker with commit/PR/deployment references after public verification.

## Next feature — simple Obsidian publishing on Mac

- [x] Open the existing website root as a separate Obsidian vault; preserve the author's personal vault/settings. Keep `_posts/` and `images/` in place, with development folders hidden by a toggleable CSS snippet and excluded from writing search.
- [x] Protect `Drafts/` (including draft images), `.obsidian/`, and writing tools from Git/public output. Preserve the existing untracked Guilt of Fitness files without publishing them.
- [x] Create drafts with a stable dated filename, editable title, optional image, native tags and primary-topic metadata. No featured image required.
- [x] Configure Attachment Management: draft images in `Drafts/images/<stable-post-filename>/`, published-post images in `images/<stable-post-filename>/`, without automatic folder renaming.
- Use Obsidian's native tags directly for website tags, with hyphenated multiword names. The incorrect `Software Review` assignment and primary topic were corrected to `Software-Review`; preserve the readable “Software Review” display label. No separate topics-to-tags property is needed for this issue.
- [x] Provide Obsidian commands for new draft, local website preview, optional featured-image selection, publish current post, and publication status. Saving never commits or uploads.
- [x] Preview a selected draft using an isolated temporary build; do not expose unrelated drafts. Normalize image links for the website while retaining ordinary Markdown in Obsidian.
- [x] Before publishing, validate metadata, images, collisions, branch/remote state and existing staged/unpushed changes. Build and check the selected result before making a commit.
- [x] Move only the selected draft and its referenced images into public folders, update paths and featured-image metadata, commit only those files, and push without force. Provide a safe retry when a push fails.
- [x] Report deployment pending until the matching GitHub Pages run succeeds; make failures and retry/status actions explicit.
- [x] Prove write → preview → publish → revise in temporary repositories with text-only and illustrated posts; test failure/privacy cases without uploading test content.
- [x] Preserve existing URLs and distinguish private drafts from published content. Do not depend on the site's current future:true setting for draft privacy.
- [x] Check attachment paths, filenames with spaces, ordinary Markdown, links, footnotes, and Obsidian embeds actually used.
- [x] Keep existing GitHub Pages branch publishing. Package the small publishing helper as local Obsidian commands, with documented setup, backup and recovery instructions.
- [x] Implement deployment status using the exact publication commit and live article fingerprint; pending or failed builds are not reported as live. No VS Code required for routine writing.

Done when the author can write, preview, publish, and revise a post from Obsidian without a featured image or manual file housekeeping.

### Verification and rollout

- [x] Reproduce and fix the native Preview error reported on October 12: Ruby inherited an ASCII encoding and Sass failed on the existing `✓` in `_sass/3-modules/_services.scss:100`. Both Jekyll subprocesses now explicitly start Ruby with UTF-8. A full-site Unicode regression build passes with `LANG=C` and `LC_ALL=C`; all twelve automated tests pass. The installed helper was refreshed; native UI verification remains separate below.
- [x] Complete the native Obsidian preview-button check. After refreshing/reloading the fixed helper, the eye ribbon command in Obsidian 1.14.4 opened the rendered private test article at `http://127.0.0.1:57660/blog/workflow-check-private-test`. Featured and body images both loaded in the browser. No test content was published. Draft creation, attachment import/routing, optional featured-image selection and the simplified sidebar were also exercised natively.
- [x] Release setup PR #3 and optional-note PR #4; switch the local checkout to publishing branch `newtheme`. Publishing remains disabled on development branches.
- [x] Author confirmed the first real publication and a subsequent description update worked on 13 October. This is user-reported end-to-end verification; no independent deployment audit was performed in this update.
- [ ] Confirm a recent recoverable Mac backup covers private Drafts and `.obsidian`. On 13 October `tmutil isexcluded` reported both included, but `tmutil latestbackup` could not mount the destination; inclusion alone does not verify an actual backup. Backup setup is not a blocker for Books planning.

Evidence: eleven temporary-repository tests passed, including selected-file commits, cross-draft privacy, missing images, symlinks, collisions, staged/development-branch guards, unchanged revisions, failed upload/retry, stale-note protection, code examples, HTML and reference images. Isolated full-site builds passed for text-only and illustrated fixtures, with correct body/OG image URLs and no private files. The original 36 tracked posts and legacy images were not moved. A pre-existing broken homepage social-image reference (`/images/01.jpg`) was corrected to the existing `/images/self-portrait.jpg`.

The actual preview method was also invoked in a Node harness with the Obsidian UI mocked: its HTTP server returned 200 for the generated article and 404 for an unrelated private draft. Both selected images were verified loaded in the in-app browser. The native preview-button check subsequently passed after the UTF-8 fix, as recorded above.

## Next — Books

Detailed tasks, research, design direction, data decisions and acceptance checks: [books-plan.md](books-plan.md).

Build order is now recorded as phases A–G in the Books plan: isolate development → importer/data → real-content design preview → existing blog links → separate local Books controls → private status archive → checks/documentation/release. Local importer implementation has begun in the separate Books checkout; see the milestone record below.

- [x] Confirm Goodreads profile and scope: rated finished books only; exclude unrated finished books and want-to-read; keep all nine currently-reading books. Manual refresh first, automation later. Author confirmed these choices on 13 October.
- [x] Inspect the author's Goodreads status-update example and history page. On 13 October the page reported 20 status updates, including written entries and progress-only entries; capture written entries separately for later short entries.
- [x] Research native Jekyll data/collections, export/feed limitations, cover handling and relevant visual examples; inspect the current site visually.
- [x] Expand visual research to eight references: Maggie Appleton, Derek Sivers, Patrick Collison, Flo Guo, Pierre Lechevallier, The Visible Shelf, Stripe Press and Ricardo Magalhães. Record observations, rendering limitations and refined design direction in the Books plan.
- [x] Audit book-related published writing beyond tags: six Books-tagged posts plus In The Heart of The Sea. Plan per-book On the blog links and an Explore writing about books link to the existing Books tag; the duplicate writing index is withdrawn. Author clarified that Goodreads/blog writing are independent: manage book → published-post connections through book overrides/local Books management, not post metadata or a picker during blog publication. Preserve unrated-book exclusions and existing URLs; do not mislabel all writing as reviews. Detailed matches and exclusions are in the Books plan.
- [x] Inspect actual library CSV: 374 books; 44 read, 9 currently reading, 321 want-to-read. 35 finished books have ratings, 11 of these have reviews; 23 eligible books lack completion dates. Export has private notes and no status-update history or cover URLs. Initial model: one native Books page backed by `_data/books.yml`, expandable reviews and alphabetical default ordering.
- [ ] Review a Books design at `/books/`, retaining existing typography and light/dark modes: prototype a horizontally scrollable currently-reading shelf on desktop/mobile, rated finished-book rows and a single Books-tag action link instead of a writing index. Confirm scrolling suits the site and is discoverable/accessibly operable. Add Books to internal navigation when ready.
- [ ] Implement a repeatable manual import with stable Goodreads IDs, explicit public fields, a change summary and safe handling of missing/changed data.
- [ ] Preserve written reading updates privately with original IDs, text, dates and source/book links. Do not create or publish the short-entry section yet.
- [ ] Verify imports, responsive/accessibility behavior, covers, existing reviews/URLs, SEO and private-file exclusion; review and release through a separate feature branch/PR.

## After Books — Films

- [ ] Validate Letterboxd export/feed capabilities and account data before choosing an importer.
- [ ] Design the films page as part of the same personal site; retain the existing TV list unless the author chooses otherwise.
- [ ] Handle repeated imports, edits, duplicates, missing posters and failed imports without destroying existing data.
- [ ] Decide whether separate Books/Films navigation or a shared Library destination is clearer once both have real content. Do not promise complete automatic two-way sync.

## After Films — short entries (name undecided)

- [ ] Separate native Jekyll collection and chronological full-entry stream, individual stable permalinks, optional titles/images.
- [ ] Reuse established typography and Obsidian publishing, with a lighter short-entry layout and separate feed.
- [ ] Use real author content; add navigation only when ready.
- [ ] Test draft/future exclusion across listings, output pages, feeds and sitemap on the installed Jekyll version.
- [ ] Existing posts with the Thoughts tag remain blog posts unless the author chooses to move them.
- [ ] Review preserved Goodreads written updates, select entries and use their original dates for any backdated publication. Confirm timestamp precision/time zone and feed behavior; do not publish automatic progress changes as writing.

## Future scope — legacy image organization

- [ ] Audit existing post, gallery, project and portfolio image references before moving or deleting files.
- [ ] Investigate reorganizing legacy post images within the existing root images folder while preserving every published image URL.
- [ ] Compare the maintenance cost of generated compatibility copies against retaining legacy files in place; do not change the publishing system solely for cosmetic folder cleanup without reviewing the tradeoff.
- [ ] Verify image bytes at all old URLs, article images, featured images and social metadata before any migration is released.

Decision: defer legacy image migration. Existing published files and URLs remain intact during the Obsidian setup. Carry forward `images/<stable-post-filename>/` for public post images and `Drafts/images/<stable-post-filename>/` for private draft images. Automatic per-post routing is implemented with Attachment Management 0.12.1 and was exercised through Obsidian attachment import.

## Future optional scope — featured-image hover thumbnails

- [ ] Reconsider after the Obsidian workflow is established, only if the enhancement still feels worthwhile.
- [ ] Reuse existing image metadata; no thumbnail paths to maintain in individual posts.
- [ ] Prefer build-only generated thumbnails in one output folder, with originals untouched and no generated images committed or placed in the writing vault.
- [ ] Research supports a small independent Pillow generator; GitHub Actions could run Jekyll then thumbnail generation and deployment. This requires verifying/changing Pages publishing setup and is not part of the current release.
- [ ] Keep the generator portable to other static hosts, with pinned dependencies and one documented local/build command.
- [ ] Test JPEG, PNG, WebP, AVIF, orientation, colour, transparency, replacement/caching and posts without images.
- [ ] Preserve proportions and reserve preview space; fetch only when opened; graceful text-only fallback and accessible hover/focus dismissal.
- [ ] Measure actual thumbnail size/quality before choosing compression. No paid image service required.

Decision: keep text-only previews and current publishing approach for now. Build-time thumbnails were the cleanest implementation if chosen, but deferring them keeps the overall site simpler.

## Optional discovery improvements

- [ ] Audit inconsistent tag names without breaking old links; introduce separate categories only if useful.
- [ ] Consider individual topic pages or search only when actual browsing justifies them.

## Key references

- [Tom Preston-Werner](https://tom.preston-werner.com/), [Frank Chimero](https://frankchimero.com/blog/), [Maggie Appleton](https://maggieappleton.com/garden/): writing/visual inspiration reviewed during design.
- [Sara Soueidan](https://www.sarasoueidan.com/blog/accessible-icon-buttons/), [Josh Comeau](https://www.joshwcomeau.com/css/the-importance-of-learning-css/): article hierarchy and accessible controls.
- [Jekyll posts/tags](https://jekyllrb.com/docs/posts/), [collections](https://jekyllrb.com/docs/collections/): existing content model and future Thoughts implementation.
- [W3C hover/focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html): preview behaviour.
- [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Pillow formats](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html): optional build-time thumbnail research.

## Update rule

Update this file after each completed task, scope decision or deployment. Keep current facts and unchecked work here; detailed evidence belongs in release-checks.md. Never mark local work as deployed, a proposal as implemented, or an unverified integration as working.

## Writing workflow improvements — 12 October 2026

- [x] Compile the existing Sass once as a shared stylesheet; audit confirmed CSS equivalence before implementation.
- [x] Add Mac image import, existing-image selection, optional same-file body insertion, decoding validation, collision-safe names, and preserve existing files.
- [x] Implement persistent local previews with saved-change debounce, full rebuilds, browser reload events, atomic output switching, persistent errors and recovery.
- [x] Disable Disqus/Google Analytics in private previews, add noindex response headers, and allow unpublished/empty draft previews.
- [x] Superseded: remove native syntax conversion in favour of ordinary Markdown and published website URLs (12 October).
- [x] Retain private authoring backups during publication/revisions. Comment stripping removed; refuse Obsidian comments with guidance instead.
- [x] Support native `_drafts` and explicitly confirm transition from `published: false`.
- [x] Integration test: full preview rebuilds update archive, integrations stay disabled, build failures retain last successful output, recovery resumes, and temporary files are cleaned.
- [x] Native Obsidian 1.14.4: Mac picker imported a JPEG into the private post folder; optional body insertion reused it; featured-only output displayed it without a body image. The eye command opened a rendered preview, native wikilinks resolved, comments stayed hidden, and saved changes reloaded the browser at the same URL. No test content was published.
- [x] Release PR #3: merged as 988de57d7ead6cc92afc1e93c13794902b0a5724. Local checkout switched to newtheme; author will perform first publication in Obsidian.

Public-release scope: configurable source/asset/private-folder mapping and deployment adapters, validation on other themes/platforms/Jekyll plugins, additional Obsidian syntax. The current implementation supports this site first and does not claim universal Jekyll compatibility.

## Simplified writing syntax — 12 October 2026

- [x] Remove the custom link converter and public-note/heading resolver. No title substitution or Obsidian-format translation.
- [x] Keep image folder management, featured-image import, private drafts, previews and selected-file publishing.
- [x] Update writing instructions: ordinary Markdown, published URLs for post links; local note navigation is outside this workflow.
- [x] Preserve draft contents. Unsupported wikilinks/local `.md` destinations and Obsidian comments receive actionable errors.
- [x] Refresh the installed helper; 17 focused tests passed, including image handling and publication safeguards. Direct Jekyll rendering checks passed for display text, URL, link title, image alt text and heading IDs.
- [x] Rerun full-site preview/ASCII-locale checks after freeing disk space: all 26 tests passed. Localhost preview test required permission to listen outside the sandbox.
- [x] User loaded PublishDesk and confirmed its draft-deletion command works.

Earlier native syntax tests covered only narrow examples; they did not establish general Obsidian syntax compatibility. The converter had bugs and has now been removed rather than expanded. Public release as a general Obsidian/Jekyll plugin remains future scope.

- [x] At your request, move Jacked and Guilty and its featured image into private Drafts on `codex/obsidian-writing`; preserve writing/image bytes and update the featured-image path. Open the draft through the Obsidian URI. No publication.

- [x] Import personal-vault AnuPpuccin theme and Style Settings configuration into website vault; preserve workflow settings and back up prior appearance. Native activation requires reopening Obsidian.

- [x] Fix selected-draft exclusions in isolated preview configuration; retain live exclusions. Full fitness-draft build passed, title/image served successfully, analytics/comments disabled, live config byte-identical. Opened localhost preview on port 60928. Temporary archive now removed after extraction to reduce disk use. Installed helper refreshed; Obsidian must reload it before its command uses the change.

- [x] Replace one-time fitness preview with a temporary watched preview on port 61740. Saved note and per-post image changes trigger full rebuild and browser reload; verified an actual file event produced revision 2. Original port 60928 preview was a snapshot and did not watch changes. This temporary server is separate from the installed Obsidian command.

## Draft deletion — 12 October 2026

- [x] Add reviewed draft deletion and leftover-image-folder cleanup to the existing helper; no additional community plugin.
- [x] Restrict cleanup to the selected draft’s private image folder. Preserve public assets, tracked files, symlinks and possible references in notes/metadata/templates/data/Canvas/private backups.
- [x] Recoverable trash, empty-folder cleanup, changed-file checks and reference rechecks during deletion. Stop plugin-owned previews when their draft is deleted.
- [x] Set website-vault native attachment deletion to Never, retaining system trash; initial setup uses the same defaults.
- [x] 24 focused tests passed across cleanup, Markdown, image import and publishing safeguards. Installed bundle loads successfully.
- [x] User confirmed PublishDesk draft deletion works in Obsidian. Cancellation and shared-image preservation are also covered by integration tests.
- [x] Validate Jacked and Guilty for publication from newtheme: full build passed, with only the post and featured image selected. Draft remains private until the author confirms Publish.

- [x] Rename the Obsidian helper to PublishDesk in its manifest, logs, setup instructions and writing guide. Keep plugin ID `site-writer`, command IDs and recovery/settings paths unchanged.

- [x] Prepare fitness publication: remove the historical post exclusion/ignore and allow its per-post images in the featured-image picker. Drafts remain private; the legacy standalone image remains protected.

- [x] Author published Jacked and Guilty and updated another post’s description through PublishDesk; both worked (13 October).

Decision (13 October): skip optional GitHub branch protection. No protection rule was installed; requiring PRs would need a change to PublishDesk's direct publishing workflow.

## Deferred PublishDesk follow-up — private images after publication

- [x] Investigate without changing implementation (13 October): `_writing/lib/publishing.js` writes referenced images to the public destination, archives the original note in `Drafts/.published-backups/`, and removes the draft note, but does not remove private source images. The installed bundle follows the same path. This is documented recovery retention, not a failed public-image move. `_writing/lib/cleanup.js` and the installed leftover-folder picker protect folders associated with published posts, so normal orphan cleanup will not remove them.
- [ ] After the current Books work, review the recovery policy and design a safe way to clear or archive publication leftovers. Protect other drafts' references and public/shared images, preserve recoverable backups, account for unused attachments, empty directories, failed uploads/retries and later edits. Verify byte-identical public copies before removing any source; provide clear retention/cleanup feedback. Do not silently delete the source folder recursively.

No PublishDesk code, installed plugin or draft images changed during this investigation. The local `Drafts/images/` directory was empty when inspected; the diagnosis above is based on both the source and installed publishing/cleanup paths, not a claim to have reproduced the user's exact historical folder state.

Planning update (13 October): [Books plan](books-plan.md) now specifies the reader layout and interactions, the four separate local management steps, and the branch lifecycle. Keep one Books feature branch through all related design/development iterations; do not create a branch per conversation. No Books feature code or branch was created during planning; subsequent implementation is recorded below.

- [x] Add optional multiline publication notes for new posts and edits. Confirmation shows Publish/Update subject; notes enter public Git history only. Verify actual Git messages, blank notes, cancel, installed dialog and failed-upload retry.

## Books implementation — first milestone, 13 October

- [x] Create a separate managed `codex/books` checkout from `newtheme`; active writing vault remains unchanged. Baseline build and 18 publishing/cleanup checks passed.
- [x] Add the direct Goodreads CSV importer and public data in the feature checkout: 35 rated finished books, nine currently-reading books, 11 reviews. Twelve importer tests (67 assertions) passed; same-export refresh is a no-op. No website/Obsidian release yet.
- [x] Audit existing Goodreads/book plugins after the author raised the omitted comparison: Booksidian, GoodReadSync, Dogear, Bookshelf, Book Search, Global Book Search, Librarian and the CSV-to-note script. Record source findings in the detailed Books plan. Recommendation remains a direct importer for this site; no third-party plugin installed.
- [x] Build the first real-content Books preview locally with horizontal current shelf, finished-book rows, expandable reviews, sorting, five related-post links and a Books-tag action link. Desktop/phone, light/dark and no-script reading checked; page/build/link/metadata checks passed.
- [ ] Review the visual preview with the author, refine cover quality, then build the separate Books management commands. No installation or deployment yet.

Feature evidence and detailed progress live in the Books checkout’s `docs/books-plan.md`. Draft-image retention cleanup remains deferred until Books is finished.


Books feedback (13 October): finished written reviews move above rating-only books, grouped by verified Goodreads review dates rather than completion dates. Dates were checked on all 11 review pages. Manual currently-reading visibility/order confirmed; add to the planned Books management commands and preserve choices across CSV imports. Detailed behavior and date-refresh limits are recorded in books-plan.md.


## Books curation — 15 October

- [x] Write the detailed [curation specification](books-curation-spec.md) before implementation, including re-import, missing records, stale saves, visibility independence and recovery behavior.
- [x] Build Read before you die at the top with the four requested recommendations, then Currently reading, then manually hideable Reading history. Add known finished dates, preserve review-year grouping and support optional author-written recommendation blurbs.
- [x] Build local-source PublishDesk curation/import/Books-preview controls using the existing two data files; verify import preservation, backups, stale edits, cancelled dialogs, failure recovery and public output. No active-vault installation or production release.
- [ ] Complete the real Obsidian walkthrough, cover polish, book→post/cover controls and selected-Books publication workflow before release. Preserve authored Goodreads statuses privately as planned.

Feature detail and evidence: [Books plan](books-plan.md), [curation spec](books-curation-spec.md). Current local preview: http://127.0.0.1:4180/books/.


15 October: PublishDesk 1.1 locally installed in the main website vault for Books user testing. Backups and verification are recorded in docs/books-plan.md. No push/deployment; Books changes remain unstaged. Preserve main-vault curation edits during later release synchronization.

15 October: related-post management implemented and locally installed in PublishDesk 1.1.1; 68 automated checks plus real Obsidian cancellation walkthrough. See docs/books-post-links-spec.md and docs/books-plan.md. Remaining Books workflow gaps explicitly listed: cover replacement/quality, verified review-date correction, Books publication. Page name remains Books pending author choice.
