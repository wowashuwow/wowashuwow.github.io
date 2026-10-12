# Goodreads → website import

Development step 1. This command imports public book data; it does not create Obsidian book notes, commit, push or publish. The Obsidian controls and Books page are not installed/implemented yet.

Run from the website checkout using the existing Ruby/Bundler environment:

```sh
bundle exec ruby _writing/books/import.rb '/path/to/goodreads_library_export.csv'
```

This prints additions, edits, removals and eligible counts without writing. Apply a reviewed export locally with `--apply`. Any removal requires the additional `--allow-removals` flag; review that list first, especially if the export may be incomplete. An empty eligible library is refused. Syntactically valid partial exports cannot always be identified as partial, so removal confirmation is essential.

Public output is `_data/books.yml`, keyed by Goodreads IDs. Rated finished books and all currently-reading books are included; want-to-read, unrated finished books and private notes are excluded. Completion dates remain absent where Goodreads has none. Ratings are Goodreads personal whole-star values. Reviews retain permitted HTML formatting; scripts, embedded media and unsafe links are removed. Spoiler flags are retained for the future review disclosure.

Reimporting identical input does not rewrite the file. Existing data is backed up privately under `Drafts/.imports/goodreads/backups/` before an atomic replacement. Book cover and blog-link overrides are stored separately and never modified by this command. The raw export belongs outside the public repository.

Tests:

```sh
bundle exec ruby _writing/tests/books-import.test.rb
```

The website build uses Jekyll's ordinary YAML data support. Nokogiri, used for review sanitization, is already present in the existing bundle; no new runtime or plugin has been installed.
