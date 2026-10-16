# Project instructions

Applies repository-wide. Explicit user instructions take precedence.

## Start here
- Read `docs/README.md`, then the current status in `docs/personal-site-plan.md`.
- Read the relevant feature spec and operating guide before editing its workflow.
- Check branch, worktree, Git status and latest remote state. Preserve user edits.
- The active Obsidian vault is the author's source of truth for content/curation.
- Production is GitHub Pages from `newtheme` at https://wowashuwow.com/.

## Scope and invariants
- Routine author workflows must work without AI, paid services or manual code edits.
- Use the existing Jekyll/Obsidian stack; prefer small native changes over frameworks.
- Keep the personal, theme-led design. Avoid generic AI-site styling.
- Preserve URLs, SEO metadata, accessibility, private drafts and shared images.
- Goodreads is the current book catalogue. Independent online additions are deferred.
- Future scope and researched ideas are not authorization to implement them.
- Saving is local; publication is an explicit separate action.

## Documentation and progress
- Follow `docs/development.md`. Update existing authoritative docs rather than duplicating them.
- Keep the main tracker's current status accurate; dated history does not override it.
- Mark planned, implemented, tested, author-accepted and deployed states distinctly.
- Record meaningful decisions, validation, limitations and the next concrete action.
- Never claim native UI, live deployment or provider tests passed without evidence.
- Keep secrets, raw exports, drafts and private recovery paths out of public documentation.

## Git and release
- Reuse a suitable feature branch; new branches use `codex/`. No new branch per subtask.
- Commit focused changes with a clear imperative subject; use a body for why, behaviour and validation.
- Review staged files; never broadly stage vault contents or overwrite the author's curation.
- Release website/code changes through a reviewed PR into `newtheme`; content-only PublishDesk uploads use its existing path.
- Do not force-push or change hosting/branch protection as routine housekeeping.
- Before release, verify current content, installed bundle, appropriate tests and private-output exclusions.
- After merge, confirm the relevant deployment and inspect the public result. Upload is not deployment.

## Verification entry points
- `node _writing/setup.js --bundle-only /private/tmp/publishdesk-test-bundle`
- `PUBLISHDESK_TEST_BUNDLE=/private/tmp/publishdesk-test-bundle/main.js node --test --test-concurrency=1 _writing/tests/*.test.js`
- Ruby/Jekyll checks and manual acceptance: `docs/development.md`.
- Keep regressions for changed behaviour; do not add tests for arbitrary spacing or documentation-only edits.
