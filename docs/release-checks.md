# Personal-site release checks — 12 October 2026

Branch: codex/personal-site-redesign. Local preview: http://127.0.0.1:4101/.

Requested Hypertropher description and gallery-05 first image implemented. Six gallery images now have accurate alt text based on visual inspection. Subscription uses an HTTPS Mailchimp form endpoint, required email input, autocomplete, and native validation. No subscription was submitted.

Passed: Jekyll production build; JavaScript syntax; Git whitespace; all generated internal links/assets resolve; 36 posts present on the year-grouped Blog; article tags match assigned tags; production HTTPS canonicals and no unintended noindex; valid sitemap/feed; retired pagination excluded from sitemap; unpublished author draft excluded from preview/build and untouched.

External destinations: Hypertropher, Case Study Academy, work portfolio and photography site returned HTTP 200. Browser checks: desktop gallery/photo replacement, gallery opens and Escape closes, phone overflow absent, social link names and 44px targets, mobile menu opens/closes. Keyboard focus and hover-description dismissal previously checked. Dark mode and image-free post presentation previously reviewed.

Limitations: no end-to-end email delivery test, no full WCAG certification, no guarantee of Google indexing. Direct pointer-driven project tilt not manually exercised; it is gated off for touch and reduced-motion preferences. Deployment completed with explicit author approval on 12 October 2026.

Final rebuild passed after the HTTPS/native-validation correction. Final dark-mode gallery and mobile menu visually reviewed.

## Released and verified publicly

[PR #1](https://github.com/wowashuwow/wowashuwow.github.io/pull/1) merged redesign commit `3a24d92103c9f81379fecfb91c985718e538d2b2` into `newtheme` as `5bcc5dc69d58a05c97d2d7213f0863730d909804`. [Pages run #261](https://github.com/wowashuwow/wowashuwow.github.io/actions/runs/38174520983) succeeded in 1m 30s. Publishing remains Deploy from a branch → newtheme → root, custom domain wowashuwow.com, Enforce HTTPS enabled.

Clean committed-source Jekyll safe-mode build passed before publication, with zero missing internal targets and the untracked author draft/image excluded. Live HTTP/browser checks passed: approved homepage copy, five recent posts, six photos beginning with gallery-05, Photography before Projects, both project assets, all 36 published posts on Blog, assigned Books/Notes tags on the representative book review, HTTPS canonicals without localhost URLs, valid sitemap/feed XML, legacy pagination endpoints 2–4 available (page 2 immediate HTML refresh verified), and gallery open/Escape close. No test post or newsletter address submitted.

Pages reported a non-blocking Gemfile dependency warning and runner/action deprecation notices. The deployment succeeded; hosting/build modernization remains separate future scope.

## PublishDesk release validation — 12 October 2026

All 26 tests passed: private asset handling, ordinary Markdown, image import/reuse, selected-file Git publication, branch/staged/change safeguards, failed-upload retry, cleanup/shared-file preservation, installed bundle loading, Unicode under an ASCII locale, and persistent full-build preview/reload/failure recovery. Preview localhost test rerun outside sandbox after EPERM; passed. User confirmed draft deletion works in Obsidian. Removed historical fitness-post exclusion/ignore after its migration to private Drafts; legacy standalone image remains protected. Fixed featured picker to allow the fitness post’s own images.

The author will run the first real publication themselves. Draft and private recovery files remain excluded from Git and website output.

PR #3 merged as `988de57d7ead6cc92afc1e93c13794902b0a5724`; local publishing branch `newtheme` tracks `newtheme/newtheme`. Production-mode build of the actual Jacked and Guilty draft passed without publishing or changing its source. Upload whitelist is its `_posts/2026-8-23-the-guilt-of-fitness.md` destination and one image under `images/2026-8-23-the-guilt-of-fitness/`. Clean release build resolved all root-relative internal links/assets and excluded all private writing folders and the unpublished fitness post.

GitHub Pages setup deployment [run #263](https://github.com/wowashuwow/wowashuwow.github.io/actions/runs/38286555950) succeeded.
