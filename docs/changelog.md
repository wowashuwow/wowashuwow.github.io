# Release notes

Notable user-facing releases. Older history is in Git and [release checks](release-checks.md); this is not a retroactively reconstructed list of every change.

## Unreleased — Bookshelf and PublishDesk 1.2.1

### Added
- Bookshelf at /bookshelf/ with Read before you die, horizontally scrollable Currently reading and reading history. Four selected recommendations include the author's blurbs.
- Goodreads CSV import, automatic missing-cover/source fetching, preserved website choices, local previews and selected Bookshelf publication with an optional public commit note.
- Controls for visibility/order, book-to-blog links, cover correction, optional verified review dates, missing-data retry and publication/upload recovery.
- Persistent project documentation rules and a documentation index.

### Improved
- Manage books groups each book and its controls in a distinct panel, with wider blurb fields and consistent dialog footers. Theme-aware styling retains native Obsidian controls.
- Written reviews precede rating-only history; verified review dates and known completion dates have distinct meanings. Unknown dates remain unknown; ratings sort by known completion date then undated titles.

### Fixed
- Corrected the installer mapping that embedded the publishing adapter in place of the cover-fetching adapter; generated/installed-bundle regression added.

### Notes
- Routine workflows do not require AI, paid services or a new book-note plugin. Reload installed PublishDesk after refresh.
- Goodreads remains the current catalogue. Independent online additions and safe cross-source matching are researched but explicitly deferred.
- Existing blog publishing, URLs and author curation are preserved. Bookshelf data and preferences are public repository source, including entries hidden on the rendered page; raw CSVs/drafts/backups remain private.
