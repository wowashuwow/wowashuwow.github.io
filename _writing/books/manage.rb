# frozen_string_literal: true
require_relative 'import'
require_relative 'posts'
require_relative 'metadata'
require_relative 'transaction'

root = File.expand_path('../..', __dir__)
books_file = File.join(root, '_data/books.yml')
settings_file = File.join(root, '_data/books-overrides.yml')
backup = File.join(root, 'Drafts/.imports/goodreads/backups')
begin
  request = JSON.parse(STDIN.read(4 * 1024 * 1024))
  mode = request.fetch('mode')
  raise BooksSettings::Error, 'Unknown Books action.' unless %w[read save import apply parse-feeds enrich].include?(mode)
  if mode == 'parse-feeds'
    puts JSON.generate({ records: BooksMetadata.parse(request.fetch('feeds', [])) })
    exit 0
  end
  FileUtils.mkdir_p(backup, mode: 0o700)
  raise BooksSettings::Error, 'Books backup path must not use symlinks.' unless File.realpath(backup) == backup
  lock_path = File.join(backup, 'books.lock')
  raise BooksSettings::Error, 'Books lock must not be a symlink.' if File.symlink?(lock_path)
  File.open(lock_path, File::RDWR | File::CREAT, 0o600) do |lock|
    raise BooksSettings::Error, 'Another Books operation is running; try again when it finishes.' unless lock.flock(File::LOCK_EX | File::LOCK_NB)
    BooksTransaction.recover(root, backup)
    original = { '_data/books.yml' => BooksSettings.bytes(books_file), '_data/books-overrides.yml' => BooksSettings.bytes(settings_file) }
    case mode
    when 'read'
      books = BooksImport.existing(books_file)
      overrides = BooksSettings.load(settings_file)
      ids = books.map { |b| b['id'] }
      puts JSON.generate({ books: books, overrides: overrides, token: BooksSettings.token(books_file, settings_file),
                           missing: overrides.keys - ids, posts: BooksPosts.catalog(root), review_changed: books.filter_map { |b| b['id'] if b['review_html'] && overrides.dig(b['id'], 'review_fingerprint') && overrides.dig(b['id'], 'review_fingerprint') != Digest::SHA256.hexdigest(b['review_html']) } })
    when 'save'
      current_books = BooksImport.existing(books_file)
      proposed = request.fetch('overrides')
      BooksSettings.save(books_file, settings_file, proposed, expected_token: request.fetch('token'), backup_dir: backup, published_posts: BooksPosts.catalog(root).map { |post| post.fetch('ref') }, dry_run: true)
      proposed, assets = BooksMetadata.manual(current_books, proposed, request.fetch('metadata', {}))
      assets.each do |relative, bytes|
        file = BooksTransaction.safe_path(root, relative)
        existing = BooksSettings.bytes(file)
        raise BooksSettings::Error, 'Cover filename collision.' if existing && existing != bytes
        unless existing
          Tempfile.create(['cover-check-', '.jpg'], backup) do |temp|
            temp.binmode; temp.write(bytes); temp.flush
            output, _, status = Open3.capture3('/usr/bin/sips', '-g', 'pixelWidth', '-g', 'pixelHeight', temp.path)
            width = output[/pixelWidth: (\d+)/, 1].to_i; height = output[/pixelHeight: (\d+)/, 1].to_i
            raise BooksSettings::Error, 'Cover cannot be decoded or exceeds normalized dimensions.' unless status.success? && width.between?(1, 440) && height.between?(1, 1200)
          end
        end
      end
      saved = BooksSettings.load(settings_file) != proposed && BooksTransaction.write(root, assets.merge('_data/books-overrides.yml' => YAML.dump(proposed)), backup, expected: original)
      puts JSON.generate({ saved: !!saved })
    when 'enrich'
      raise BooksSettings::Error, 'Library changed during fetching. Retry missing data again.' unless BooksSettings.token(books_file, settings_file) == request.fetch('token')
      current_books = BooksImport.existing(books_file)
      current = BooksSettings.load(settings_file)
      changes = BooksMetadata.enrichment(current_books, current, request.fetch('feeds', []), request.fetch('records', {}))
      proposed = BooksMetadata.merge_automatic(current_books, current, changes)
      saved = current != proposed && BooksTransaction.write(root, { '_data/books-overrides.yml' => YAML.dump(proposed) }, backup, expected: original)
      puts JSON.generate({ saved: !!saved, resolved: changes.length, missing: current_books.count { |b| c = proposed[b['id']] || {}; !c['cover'] && !c['cover_disabled'] } })
    else
      file = request.fetch('file')
      raise BooksSettings::Error, 'Choose a regular CSV file of at most 16 MB.' unless File.file?(file) && !File.symlink?(file) && File.size(file) <= 16 * 1024 * 1024
      fingerprint = Digest::SHA256.file(file).hexdigest
      token = BooksSettings.token(books_file, settings_file)
      plan = BooksImport.prepare(file, books_file)
      if mode == 'apply'
        raise BooksSettings::Error, 'Library, settings or CSV changed since the summary. Review the import again.' unless request['token'] == token && request['fingerprint'] == fingerprint
        raise BooksSettings::Error, 'Review removed books and explicitly allow removals before applying this export.' if plan[:summary]['removed'].any? && request['allow_removals'] != true
        current = BooksSettings.load(settings_file)
        proposed = BooksMetadata.merge_automatic(plan[:books], current, request.fetch('enrichment', {}))
        files = { '_data/books.yml' => plan[:summary]['unchanged'] ? File.binread(books_file) : YAML.dump(plan[:books]) }
        files['_data/books-overrides.yml'] = YAML.dump(proposed) if proposed != current
        saved = BooksTransaction.write(root, files, backup, expected: original)
        puts JSON.generate({ saved: saved, summary: plan[:summary] })
      else
        current = BooksSettings.load(settings_file)
        changes = BooksMetadata.enrichment(plan[:books], current, request.fetch('feeds', []), request.fetch('records', {}))
        needs = plan[:books].select { |b| c = current[b['id']] || {}; (!c['cover'] && !c['cover_disabled']) || (b['review_html'] && !c['review_source_url']) }.map { |b| b['id'] }
        summary = plan[:summary].merge('metadata_updates' => changes.length, 'unchanged' => plan[:summary]['unchanged'] && changes.empty?)
        puts JSON.generate({ summary: summary, token: token, fingerprint: fingerprint, enrichment: changes, needs_fetch: needs, books: plan[:books] })
      end
    end
  end
rescue BooksSettings::Error, BooksImport::Error, JSON::ParserError, KeyError, SystemCallError, ArgumentError => e
  warn e.message
  exit 1
end
