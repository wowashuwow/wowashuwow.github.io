# Writing the website in Obsidian

The website root is its own vault. Existing `_posts/` and `images/` stay in place. Your personal notes vault is separate and its settings are untouched.

## One-time setup

Run `node _writing/setup.js` from this repository with Obsidian closed for this vault. It installs the pinned Attachment Management 0.12.1 release and the local PublishDesk plugin into the Git-ignored `.obsidian/` folder. Node is needed for setup/tests only; normal writing uses Obsidian's own runtime. Ruby/Bundler/Jekyll are the existing local preview dependencies.

Open this repository folder as a vault in Obsidian and enable community plugins when prompted. Development folders are hidden with the `writing-view` CSS snippet. To show them, turn that snippet off in Settings → Appearance → CSS snippets. Excluded files also keep writing searches focused; neither hiding mechanism provides privacy.

Finish/release the setup branch and use the publishing branch `newtheme` before publishing posts. Publishing commands refuse development branches. This setup does not alter GitHub Pages hosting.

## Normal writing

1. Run **PublishDesk: New blog draft** from the command palette (or the pen ribbon icon). Supply a title. The command creates `Drafts/YYYY-MM-DD-title-slug.md` with website properties.
2. Write in ordinary Markdown. Link to other published posts using their website URLs, for example `[Readable title](https://wowashuwow.com/blog/post-slug)`. These links work in both Obsidian and Jekyll and open the website, not the local note. Saving is local. Edit `title` to change the displayed title; keep the dated filename stable after publication.
3. Add native `tags` in Properties. Use hyphens for multiword tags. Optional `primary_topic` must match an assigned tag. An optional `description` supplies the site’s text hover preview and SEO description.
4. Paste/drop images. The attachment plugin puts them in `Drafts/images/<dated-filename>/`. The image links are ordinary relative Markdown. Draft images remain private even if there is a broad Git add or a normal website build.
   Add useful alt text inside the image link's square brackets, for example `![A mountain reflected in a lake](images/...)`. Obsidian initially inserts empty brackets; the helper does not invent image descriptions.
5. Optional: **Choose featured image for current post** offers **Choose from Mac** and existing vault images. Imports go to the post’s image folder, with collision-safe names and byte-identical reuse. **Also insert into the post** is off by default; enabling it appends a body embed of the same file. Replacement/removal preserves files. Invalid images and files over 25 MB are rejected. The image property is configurable in Settings → PublishDesk; this theme uses `image`.
6. Run **Preview current post on the website** (or the eye ribbon icon). It builds the committed website plus this selected draft into a temporary folder and opens a localhost preview. Other drafts and unrelated local edits are omitted. Saved changes trigger a full rebuild after a 600 ms pause, and the browser reloads after success. The URL remains stable for this session. A failed build shows a persistent browser error over the last successful preview; fixing the draft resumes updates. **Stop website preview**, switching the previewed post, or unloading the plugin stops/removes it. Empty drafts and `published: false` can be previewed. Disqus/Google Analytics are disabled locally; remote images/fonts/embeds can still make external requests.
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
- To update the local plugin after source changes, run `node _writing/setup.js --refresh`, then reload the PublishDesk plugin in Obsidian. This bundles its local module into the entrypoint and preserves settings and `publication.json`.
- Preview/build runs Ruby with explicit UTF-8 encoding, independent of the desktop app's locale. The ASCII-locale regression check is `node --test _writing/tests/build-encoding.test.js`; it requires the existing Ruby/Jekyll bundle and builds the full committed website with a temporary Unicode test post.

At your request on 12 October 2026, the Guilt of Fitness draft (title: Jacked and Guilty) and its featured image were moved into the private `Drafts/` workflow. Only the featured-image path changed; writing and image bytes were preserved. The former paths remain excluded as a precaution. It can now be previewed normally; publication still requires the publishing branch and confirmation.

## Markdown and draft conventions

- Use ordinary Markdown headings, emphasis, lists, quotes, links and images. The vault already creates Markdown image links (`useMarkdownLinks: true`). No custom Obsidian syntax converter is installed.
- Use `[Readable title](https://wowashuwow.com/blog/post-slug)` for published posts. Copy the destination from the published site. For a heading link, copy its actual website anchor; Obsidian heading names can differ from Jekyll's HTML IDs. Check links in the rendered preview. Website URLs open the site rather than a local note.
- `[[wikilinks]]`, `![[embeds]]`, and local `.md` note destinations are refused with instructions to use Markdown and public URLs. Existing drafts are not rewritten automatically. Don't link to private drafts; publish the destination first.
- Obsidian `%%comments%%` are refused rather than stripped or leaked into the rendered page. HTML comments `<!-- comment -->` are understood by both renderers, but remain visible in published source: never put private information there. Other Obsidian-only features such as callouts, highlights and block references are not supported; use ordinary Markdown instead.
- Jekyll Liquid tags still render in the website preview, but Obsidian does not evaluate them. Use standard Markdown for new writing. Existing legacy Liquid paths are preserved.
- Native `_drafts` notes are supported; this vault ignores `_drafts/` in Git. Undated filenames acquire a date when published. Your normal workflow remains dated notes in `Drafts/`.
- Publishing a post marked `published: false` requires the confirmation dialog, which explicitly explains that publication removes this flag. Previewing never changes the original flag.
- The stylesheet now compiles once as `css/site.css`; this is a website optimisation, not a requirement imposed on other Jekyll themes.
- This remains a local tool configured for this repository’s branch, protected files, image folders, and GitHub deployment. General hosting adapters, custom private folders, and additional Jekyll plugin/theme configurations need separate work before public release.

## Website vault appearance

On 12 October 2026, your personal vault’s AnuPpuccin 1.5.0 theme, appearance settings, and Style Settings 1.0.9 plugin configuration were copied into this website vault at your request. The 18 custom settings were preserved, including Latte/Mocha colours, Rosewater accents and border layout. The website’s `writing-view` snippet, link settings, attachment routing and publishing configuration were retained. Previous appearance/plugin-list settings are backed up under `.obsidian/backups/appearance-import-*`. Reopen Obsidian to load the imported configuration. No personal-vault files were changed.

## Deleting drafts and leftover images

Use **PublishDesk: Delete current draft and unused images**, rather than ordinary Delete, when removing a draft from `Drafts/`. The review dialog lists the draft and unused files in its own `Drafts/images/<filename>/` folder, including featured-only, abandoned and nested attachments. Confirm moves them to recoverable system trash (with Obsidian local-trash fallback). Empty folders are then removed. Public `images/` files are never cleanup candidates. Published posts and Git-tracked drafts are refused.

Files possibly referenced by other notes, private publication backups, templates, data, styles or Canvas are preserved. Reference detection deliberately matches filenames conservatively, including URL-encoded names: an incidental filename mention may keep an unused image. Changes while reviewing stop deletion; references are checked again before removing each attachment. Cancel leaves everything untouched. Cleanup never uploads anything.

For a draft deleted previously through Obsidian or Finder, run **PublishDesk: Clean up leftover draft images**, select a folder, and review the same removal/preservation list. Folders with an existing draft or published counterpart are excluded. Shared files stay in place, so some folders may correctly remain.

The website vault’s native **Delete unlinked attachments** setting is now **Never**, and deleted files use **System trash**. Ordinary Obsidian deletion therefore keeps images; it does not perform the reviewed cleanup above. These settings protect published Jekyll assets that Obsidian’s native link index may not recognise. The commands do not intercept normal Delete or Finder operations. Deleting the active draft through the helper stops its plugin-owned preview; the separate temporary preview server is not managed by these commands.
