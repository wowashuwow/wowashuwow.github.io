# wowashuwow.com — main project plan and checklist

Last updated: 12 October 2026.

This is the authoritative project tracker. Checked items are implemented/verified locally unless explicitly marked deployed. Detailed visual rules live in [design-foundation.md](design-foundation.md); release evidence and test limitations live in [release-checks.md](release-checks.md). Future scope is not authorization to implement everything at once.

## Current status

- Branch: `codex/personal-site-redesign`, based on deployed revision `9a98c75`.
- Selected preview: http://127.0.0.1:4101/ (compact design).
- Publishing branch: `newtheme`; Pages confirmed as branch publishing from the root, with HTTPS enforced.
- Current redesign is released at https://wowashuwow.com/; local and public release checks passed.
- Redesign commit: `3a24d92103c9f81379fecfb91c985718e538d2b2`.
- [PR #1](https://github.com/wowashuwow/wowashuwow.github.io/pull/1) merged into newtheme as `5bcc5dc69d58a05c97d2d7213f0863730d909804`.
- Deployment [run #261](https://github.com/wowashuwow/wowashuwow.github.io/actions/runs/38174520983) succeeded in 1m 30s; public verification passed.
- The author's untracked Guilt of Fitness post/image remain untouched and are excluded from preview/check builds. They must not be included in the redesign release.

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

- [ ] Start with a separate writing vault: Drafts, Published, Attachments; confirm the practical arrangement with the author before moving notes.
- [ ] Provide one Blog template with optional image and existing tag/primary-topic metadata.
- Use Obsidian's native tags directly for website tags, with hyphenated multiword names. The incorrect `Software Review` assignment and primary topic were corrected to `Software-Review`; preserve the readable “Software Review” display label. No separate topics-to-tags property is needed for this issue.
- [ ] Prove write → preview → deliberate publish → edit using one text-only and one illustrated post.
- [ ] Preserve existing URLs and distinguish private drafts from published content. Do not depend on the site's current future:true setting for draft privacy.
- [ ] Check attachment paths, filenames with spaces, ordinary Markdown, links, footnotes, and Obsidian embeds actually used.
- [ ] Choose the smallest reliable publishing integration; avoid changing hosting/build systems unless the workflow needs it.
- [ ] Confirm deployment success before showing publishing success. No VS Code required for routine writing.

Done when the author can write, preview, publish, and revise a post from Obsidian without a featured image or manual file housekeeping.

## Later — Thoughts

- [ ] Separate native Jekyll collection and chronological full-entry stream, individual stable permalinks, optional titles/images.
- [ ] Reuse established typography and Obsidian publishing, with a lighter short-entry layout and separate feed.
- [ ] Use real author content; add navigation only when ready.
- [ ] Test draft/future exclusion across listings, output pages, feeds and sitemap on the installed Jekyll version.
- [ ] Existing posts with the Thoughts tag remain blog posts unless the author chooses to move them.

## Later — books, then films

- [ ] Validate actual Goodreads export data before choosing an importer.
- [ ] Build books with ratings/reviews and a dependable repeatable import; start with manual refresh if simplest.
- [ ] Handle edits, duplicates, missing covers and failed imports without destroying existing data.
- [ ] Validate Letterboxd export/feed capabilities and account data, then add films.
- [ ] Add Library navigation only with real content; do not promise complete automatic two-way sync.

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
