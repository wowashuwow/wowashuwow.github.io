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

## Optional publication notes

16 focused tests passed for the installed publication dialog, new/edit commit subjects, multiline/blank notes, actual Git commit bodies, notes absent from post content, cancel, malformed-note rejection, unchanged selected-file safeguards, and upload retry retaining its original message. No real post published. Uses the documented Obsidian Setting.addTextArea API.


## Bookshelf and PublishDesk 1.2.1 — 16 October 2026

Released [PR #5](https://github.com/wowashuwow/wowashuwow.github.io/pull/5), tested head 393e3e4a9836bff7c47110a3746110ec6d0280fc, merge d33b6bf43653e2bbb9d13ef24fe19a820ec378d0. [Pages run 38878759617](https://github.com/wowashuwow/wowashuwow.github.io/actions/runs/38878759617) completed successfully. The author reported the installed workflow works and authorized release; native agent UI input remained unavailable. This is author acceptance, not fabricated per-control native observations. Earlier browser UI harness evidence remains separately labelled in publishdesk-ui-plan.md.

Final validation: 54 JavaScript cases passed against the generated 1.2.1 bundle, including packaging, imports, curation, cancellation, temporary-Git publication/retry and persistent post preview. Native Ruby suites: import 12/67 assertions, curation 22/105, post links 4/22, rendering 6/31, metadata/recovery 6/41; all pass. Some import behaviour is also exercised by the JS bridge, so these are suite results rather than an inflated unique-case total.

An exact committed-source production safe-mode Jekyll build passed with the real library. All generated root-relative links/assets resolve. Bookshelf output checker passed; no Drafts, .obsidian, .trash, _writing, docs, AGENTS.md or README.md in output; no preview host/noindex metadata. The first ad-hoc release build used macOS's symlinked temporary-path alias and failed Jekyll's include safety check; rerunning with the canonical real path, as existing preview code already does, passed. No product-code change was needed for that check.

Live verification: /bookshelf/, homepage and sitemap fetched successfully with the system curl trust store. Expected content fingerprint ff2395b089ce30ebef26cf5a5c763dfb39a68987e4f5b51d5363b51af008d7d4 is present. Title Bookshelf | wowashuwow, canonical https://wowashuwow.com/bookshelf/, no production noindex, homepage nav and sitemap inclusion confirmed. Rendered counts: 4 recommendations, 7 current, 35 history; existing author blurbs and related links preserved. The separate Python installation lacked a CA bundle; TLS verification was not disabled.

Live browser: covers loaded without failed loaded images, review disclosure opened/closed, desktop Next books moved the horizontal shelf, 390px viewport had page width 375px, and normal viewport restored. No newsletter/comment was submitted. No full WCAG audit or guarantee of search-engine indexing.

Git push briefly waited on macOS Keychain, then completed normally; no API reconstruction, force-push or credential/hosting changes. Authoring newtheme advanced to the merge with all 99 checked working-file paths byte-preserved and clean Git status. Read-only publication preparation confirms setup ready and zero unpublished Bookshelf files. Initial setup gating is lifted by the released code; routine content publication now works from newtheme.

Documentation-only follow-up records this post-deployment evidence, updates stale current-status/operating-guide text and dates the release notes. It changes no page templates, content, runtime plugin files or book data. Independent online additions and their proposed new import semantics remain explicitly deferred.
