# Development and documentation rules

Repository-wide rules, established 16 October 2026. Keep this lightweight: one main tracker, feature-specific specs, operating instructions and release evidence. Do not create a competing AI memory database or separate progress files for each agent.

## Progress and handoff

Update the existing main tracker when scope, implementation, acceptance or deployment changes. Its Current status should say what is live, what is in progress, what remains blocked/unverified, and the next action. Link detailed feature documents instead of repeating their history. Date important decisions; explicitly supersede old decisions. Keep deferred ideas under future scope until the author resumes them.

A checked implementation item does not imply deployment. Distinguish researched/planned, implemented, automated-tested, manually/author-accepted and deployed/live-verified. Record who performed acceptance and its actual scope. A browser harness is not native Obsidian acceptance; a successful push/build is not proof of live content. Do not retroactively claim an unperformed check.

At a handoff, record branch/PR, relevant commit, authoritative file locations, meaningful test evidence, known limitations and the next step. Prefer persistent links and reproducible commands to temporary paths. Keep raw logs, CSVs, drafts, credentials and private backup paths private; summarize their non-sensitive results.

## Specifications and decisions

Before changes with data-loss, migration, import matching, publication or UI-workflow consequences, write or update the relevant spec: user outcome, scope/non-goals, ownership rules, failure cases, compatibility, acceptance and rollback. For small edits, a tracker note or commit body is enough. Add rationale near the relevant spec; no separate ADR system unless the project outgrows this arrangement. Update operating instructions when user-visible steps change.

## Commits and pull requests

Use focused commits with a concrete imperative subject. For nontrivial changes, explain the problem, resulting behaviour, important tradeoff and actual validation in the body. Do not use generic subjects such as Update files. Conventional Commit prefixes are optional; there is no automated versioning need that justifies rewriting history or forcing them onto user-generated PublishDesk subjects.

Keep PublishDesk's existing subjects (Publish: title, Update: title, Update Bookshelf) and optional author notes. Do not put private notes into public Git history. PR descriptions must describe the final change, validation and remaining limitations for someone without this chat. Link the spec when useful; omit conversational history.

Review explicit staged paths and preserve the active vault's latest content. Reuse the feature branch until the feature is released. Branch protection remains deliberately optional; do not enable it incidentally. User-authorized release includes normal push/PR/merge/deployment checks, but not unrelated account/hosting changes.

## Checks

Run relevant focused checks during development. For changes spanning PublishDesk import/storage/publication, run the complete regression suite against a temporary generated bundle:

```sh
node _writing/setup.js --bundle-only /private/tmp/publishdesk-test-bundle
PUBLISHDESK_TEST_BUNDLE=/private/tmp/publishdesk-test-bundle/main.js node --test --test-concurrency=1 _writing/tests/*.test.js
bundle exec ruby _writing/tests/books-import.test.rb
bundle exec ruby _writing/tests/books-curation.test.rb
bundle exec ruby _writing/tests/books-posts.test.rb
bundle exec ruby _writing/tests/books-render.test.rb
bundle exec ruby _writing/tests/books-metadata.test.rb
```

Some JavaScript tests already run native Ruby import checks. Report suites/counts accurately; do not add counts from repeated runs as new coverage. The persistent-preview test needs permission to bind loopback; a sandbox EPERM is not automatically a product failure. Fix source failures and test the installed/generated artifact when packaging changes.

For a release, build the exact committed source into a temporary directory using Jekyll safe/production mode; verify links/assets, canonicals, sitemap, no production noindex, and exclusion of Drafts, .obsidian, _writing, docs and root project-instruction files. Bookshelf also has `_writing/books/check.rb`. Use the relevant feature's documented preview/build preparation so private files and committed post catalogues are handled correctly. Do not regenerate or import real personal data merely to exercise tests.

Use disposable Git repositories/data copies for publication, deletion, recovery and import-failure tests. UI checks use actual controls and real theme/window-size cases; report automation limitations candidly. Author confirmation can satisfy the user-acceptance gate, with attribution.

## Release records

Keep `docs/changelog.md` human-readable: notable features/fixes and migration/user-action notes. Do not copy every commit into it. Add entries to Unreleased during work, then date/link them on release. `docs/release-checks.md` records reproducible checks and actual PR/deployment/live evidence. The main tracker links these records and stays concise.

After deployment, check the public route, expected content revision, metadata and private-output exclusions. If an outcome can only be known after merge, record it afterward in a clearly labelled documentation-only commit and explain that purpose; do not describe that commit as a new product feature. Update the active authoring checkout safely so ordinary PublishDesk use continues from the released branch.

## Research basis

These are project choices informed by [AGENTS.md](https://agents.md/) for portable agent instructions, [GitHub custom-instruction guidance](https://docs.github.com/en/copilot/concepts/prompting/response-customization) for concise repository context, [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) for curated release records, and [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) as an optional structured commit convention. No format guarantees agent compliance; verify results against code, tests and release evidence.
