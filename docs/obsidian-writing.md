# Writing the website in Obsidian

The website root is its own vault. Existing `_posts/` and `images/` stay in place. Your personal notes vault is separate and its settings are untouched.

## One-time setup

Run `node _writing/setup.js` from this repository with Obsidian closed for this vault. It installs the pinned Attachment Management 0.12.1 release and the local Website writing plugin into the Git-ignored `.obsidian/` folder. Node is needed for setup/tests only; normal writing uses Obsidian's own runtime. Ruby/Bundler/Jekyll are the existing local preview dependencies.

Open this repository folder as a vault in Obsidian and enable community plugins when prompted. Development folders are hidden with the `writing-view` CSS snippet. To show them, turn that snippet off in Settings → Appearance → CSS snippets. Excluded files also keep writing searches focused; neither hiding mechanism provides privacy.

Finish/release the setup branch and use the publishing branch `newtheme` before publishing posts. Publishing commands refuse development branches. This setup does not alter GitHub Pages hosting.

## Normal writing

1. Run **Website writing: New blog draft** from the command palette (or the pen ribbon icon). Supply a title. The command creates `Drafts/YYYY-MM-DD-title-slug.md` with website properties.
2. Write in ordinary Markdown. Saving is local. Edit `title` to change the displayed title; keep the dated filename stable after publication.
3. Add native `tags` in Properties. Use hyphens for multiword tags. Optional `primary_topic` must match an assigned tag. An optional `description` supplies the site’s text hover preview and SEO description.
4. Paste/drop images. The attachment plugin puts them in `Drafts/images/<dated-filename>/`. The image links are ordinary relative Markdown. Draft images remain private even if there is a broad Git add or a normal website build.
   Add useful alt text inside the image link's square brackets, for example `![A mountain reflected in a lake](images/...)`. Obsidian initially inserts empty brackets; the helper does not invent image descriptions.
5. Optional: **Choose featured image for current post** lets you select one of that post's images. Skip it for a text-only article. Body images and featured images are independent.
6. Run **Preview current post on the website** (or the eye ribbon icon). It builds the committed website plus this selected draft into a temporary folder and opens a localhost preview. Other drafts and unrelated local edits are omitted. Re-run to refresh; closing Obsidian stops/removes the current preview.
7. Run **Publish current post / publish changes**. It checks Git, metadata, referenced images and the Jekyll output, then shows the exact files to upload. Cancel leaves the draft unchanged. Confirm creates a commit containing only this article and its referenced local images, and pushes to `newtheme`.
8. The uploaded post is deployment-pending until **Check the last publication** sees the matching Pages run succeed and its article URL return HTTP 200. A successful push alone is never called a successful deployment.

## What publishing changes

The article becomes `_posts/<same-filename>.md`. Referenced private images are copied into `images/<same-filename>/`, and source links change to `../images/...`. The optional `image` property becomes a public `/images/...` path for SEO/social previews. The post template and RSS feed normalize body paths for readers. Unused images are not uploaded.

A private original is kept in `Drafts/.published-backups/`; draft image originals stay private for recovery. Edit the `_posts/` copy after publication. New images added there go directly to its public image folder, but are not uploaded until Publish changes is chosen.

Existing posts and legacy image URLs remain intact. Old Liquid image links may not display inside Obsidian; website previews still render them. Their cleanup is future scope.

## Failure and recovery

- Before a commit exists, failed validation/build/publishing restores modified public files and leaves the private original intact.
- A failed push keeps a local publication commit and a recovery record in `.obsidian/plugins/site-writer/publication.json`. Use **Retry the last failed upload**. Do not create a second draft to retry.
- Git branches that differ from GitHub, already staged files or other unpushed commits stop publishing. Resolve these before retrying. There is no force push or automatic stash/reset of unrelated work.
- Deployment failures open the GitHub run. Resolve the build failure, then check status again.
- Back up `Drafts/` and `.obsidian/` with your Mac's backup system (for example Time Machine). Git deliberately does not back up private drafts. The private backup directory is recovery convenience, not a substitute for a Mac backup.
- To update the local plugin after source changes, run `node _writing/setup.js --refresh`, then reload the Website writing plugin in Obsidian. This bundles its local module into the entrypoint and preserves settings and `publication.json`.

The existing Guilt of Fitness draft/image are explicitly protected in Git and Jekyll without changing their contents. They cannot be published through the helper until deliberately moved into the normal draft workflow.
