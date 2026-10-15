# frozen_string_literal: true
require_relative 'import'

root = File.expand_path('../..', __dir__)
books_file = File.join(root, '_data/books.yml')
settings_file = File.join(root, '_data/books-overrides.yml')
backup = File.join(root, 'Drafts/.imports/goodreads/backups')
begin
  request = JSON.parse(STDIN.read(4 * 1024 * 1024))
  mode = request.fetch('mode')
  raise BooksSettings::Error, 'Unknown Books action.' unless %w[read save import apply].include?(mode)
  FileUtils.mkdir_p(backup, mode: 0o700)
  lock_path = File.join(backup, 'books.lock')
  raise BooksSettings::Error, 'Books lock must not be a symlink.' if File.symlink?(lock_path)
  File.open(lock_path, File::RDWR | File::CREAT, 0o600) do |lock|
    raise BooksSettings::Error, 'Another Books operation is running; try again when it finishes.' unless lock.flock(File::LOCK_EX | File::LOCK_NB)
    case mode
    when 'read'
      books = BooksImport.existing(books_file)
      overrides = BooksSettings.load(settings_file)
      ids = books.map { |b| b['id'] }
      puts JSON.generate({ books: books, overrides: overrides, token: BooksSettings.token(books_file, settings_file),
                           missing: overrides.keys - ids })
    when 'save'
      saved = BooksSettings.save(books_file, settings_file, request.fetch('overrides'), expected_token: request.fetch('token'), backup_dir: backup)
      puts JSON.generate({ saved: saved })
    else
      file = request.fetch('file')
      raise BooksSettings::Error, 'Choose a regular CSV file of at most 16 MB.' unless File.file?(file) && !File.symlink?(file) && File.size(file) <= 16 * 1024 * 1024
      fingerprint = Digest::SHA256.file(file).hexdigest
      token = BooksSettings.token(books_file, settings_file)
      plan = BooksImport.prepare(file, books_file)
      if mode == 'apply'
        raise BooksSettings::Error, 'Library, settings or CSV changed since the summary. Review the import again.' unless request['token'] == token && request['fingerprint'] == fingerprint
        saved = BooksImport.apply(plan, books_file, backup_dir: backup, allow_removals: request['allow_removals'] == true)
        puts JSON.generate({ saved: saved, summary: plan[:summary] })
      else
        puts JSON.generate({ summary: plan[:summary], token: token, fingerprint: fingerprint })
      end
    end
  end
rescue BooksSettings::Error, BooksImport::Error, JSON::ParserError, KeyError, SystemCallError => e
  warn e.message
  exit 1
end
