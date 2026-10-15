# frozen_string_literal: true
require 'csv'
require 'yaml'
require 'json'
require 'date'
require 'cgi'
require 'nokogiri'
require 'tempfile'
require 'fileutils'
require 'optparse'
require_relative 'settings'

module BooksImport
  class Error < StandardError; end
  HEADERS = ['Book Id', 'Title', 'Author', 'ISBN', 'ISBN13', 'My Rating',
             'Exclusive Shelf', 'My Review', 'Spoiler', 'Date Read'].freeze
  TAGS = %w[p br strong em b i blockquote ul ol li s a].freeze
  DROP = %w[script style iframe object embed template].freeze
  FIELDS = %w[id title author status source_url rating isbn date_read review_html spoiler].freeze

  # Goodreads exports HTML in reviews. Keep readable formatting, never executable
  # markup, arbitrary attributes, or a Markdown/Liquid interpretation step.
  def self.review_html(value)
    fragment = Nokogiri::HTML.fragment(value.to_s.gsub(/\r\n?/, "\n"))
    fragment.css(DROP.join(',')).remove
    fragment.css('*').to_a.reverse_each do |node|
      unless TAGS.include?(node.name)
        node.replace(node.children)
        next
      end
      href = node['href'] if node.name == 'a'
      node.attribute_nodes.each(&:remove)
      if href && href.match?(%r{\Ahttps?://[^\s]+\z}i)
        node['href'] = href
        node['rel'] = 'nofollow noopener'
      elsif node.name == 'a'
        node.replace(node.children)
      end
    end
    # Preserve raw newlines as well as Goodreads' exported <br> paragraphs.
    fragment.to_html.strip.gsub("\n", '<br>')
  end

  def self.isbn(value, digits, row)
    text = value.to_s.strip.sub(/\A="(.*)"\z/, '\\1').delete('- ')
    return nil if text.empty?
    pattern = digits == 13 ? /\A\d{13}\z/ : /\A\d{9}[\dXx]\z/
    raise Error, "Row #{row}: invalid ISBN#{digits}." unless text.match?(pattern)
    text.upcase
  end

  def self.parse(file, include_ids: [])
    text = File.read(file, encoding: 'bom|utf-8')
    raise Error, 'The export is not valid UTF-8.' unless text.valid_encoding?
    table = CSV.parse(text, headers: true)
    raise Error, 'The export has no book records.' if table.empty?
    missing = HEADERS - (table.headers || [])
    raise Error, "Missing Goodreads headers: #{missing.join(', ')}." unless missing.empty?
    raise Error, 'Duplicate CSV headers.' unless table.headers.uniq.length == table.headers.length
    ids = {}
    books = table.each_with_index.filter_map do |record, index|
      row = index + 2
      # A truncated CSV can be syntactically valid but have a short final row.
      raise Error, "Row #{row}: incomplete/extra CSV fields." unless record.fields.length == table.headers.length
      id = record['Book Id'].to_s.strip
      title = record['Title'].to_s.strip
      author = record['Author'].to_s.strip
      raise Error, "Row #{row}: missing/invalid book ID, title or author." unless id.match?(/\A[1-9]\d*\z/) && !title.empty? && !author.empty?
      raise Error, "Row #{row}: duplicate Goodreads ID #{id}." if ids[id]
      ids[id] = true
      shelf = record['Exclusive Shelf'].to_s.strip
      raise Error, "Row #{row}: unknown shelf #{shelf.inspect}." unless %w[read currently-reading to-read].include?(shelf)
      raw_rating = record['My Rating'].to_s.strip
      raise Error, "Row #{row}: rating must be 0–5 whole stars." unless raw_rating.match?(/\A[0-5](?:\.0+)?\z/)
      rating = raw_rating.to_i
      next unless shelf == 'currently-reading' || (shelf == 'read' && rating.positive?) || include_ids.include?(id)
      book = { 'id' => id, 'title' => title, 'author' => author,
               'status' => shelf, 'source_url' => "https://www.goodreads.com/book/show/#{id}" }
      book['rating'] = rating if rating.positive?
      code = isbn(record['ISBN13'], 13, row) || isbn(record['ISBN'], 10, row)
      book['isbn'] = code if code
      date = record['Date Read'].to_s.strip
      unless date.empty? || shelf != 'read'
        raise Error, "Row #{row}: invalid completion date." unless date.match?(%r{\A\d{4}/\d{2}/\d{2}\z})
        begin
          book['date_read'] = Date.strptime(date, '%Y/%m/%d').iso8601
        rescue Date::Error
          raise Error, "Row #{row}: invalid completion date."
        end
      end
      review = review_html(record['My Review'])
      book['review_html'] = review unless Nokogiri::HTML.fragment(review).text.strip.empty?
      spoiler = record['Spoiler'].to_s.strip.downcase
      raise Error, "Row #{row}: unrecognised spoiler flag." unless ['', 'false', 'true', '0', '1'].include?(spoiler)
      book['spoiler'] = true if %w[true 1].include?(spoiler) && book['review_html']
      book
    end
    missing_pinned = include_ids - books.map { |book| book['id'] }
    raise Error, "Recommended books missing from this export: #{missing_pinned.join(', ')}. Choose a complete export or explicitly remove these recommendations first." unless missing_pinned.empty?
    raise Error, 'No eligible books found; refusing to replace the library with an empty list.' if books.empty?
    books.sort_by { |book| [book['title'].downcase, book['id'].to_i] }
  rescue CSV::MalformedCSVError => e
    raise Error, "Invalid Goodreads CSV: #{e.message}"
  rescue Errno::ENOENT
    raise Error, 'The selected Goodreads export does not exist.'
  end

  def self.existing(output)
    return [] unless File.exist?(output)
    raise Error, 'The data file must not be a symlink.' if File.symlink?(output)
    data = BooksSettings.yaml(File.read(output))
    unless data.is_a?(Array) && data.all? { |b| b.is_a?(Hash) && b['id'].is_a?(String) && (b.keys - FIELDS).empty? }
      raise Error, 'Existing Books data has an unexpected format; it was not overwritten.'
    end
    raise Error, 'Existing Books data has duplicate IDs.' unless data.map { |b| b['id'] }.uniq.length == data.length
    data
  rescue BooksSettings::Error, Psych::Exception => e
    raise Error, "Existing Books YAML is invalid: #{e.message}"
  end

  def self.prepare(input, output)
    settings_file = File.join(File.dirname(output), 'books-overrides.yml')
    settings_bytes = File.directory?(File.dirname(output)) ? BooksSettings.bytes(settings_file) : nil
    settings = settings_bytes ? BooksSettings.validate(BooksSettings.yaml(settings_bytes)) : {}
    pinned = settings.select { |_, custom| custom['recommended'] }.keys
    books = parse(input, include_ids: pinned)
    old = existing(output)
    previous = old.to_h { |b| [b['id'], b] }
    current = books.to_h { |b| [b['id'], b] }
    identify = ->(book) { book.slice('id', 'title') }
    summary = {
      'added' => books.reject { |b| previous.key?(b['id']) }.map(&identify),
      'changed' => books.select { |b| previous.key?(b['id']) && previous[b['id']] != b }.map(&identify),
      'removed' => old.reject { |b| current.key?(b['id']) }.map(&identify),
      'counts' => { 'finished' => books.count { |b| b['status'] == 'read' && b['rating'] },
                    'currently_reading' => books.count { |b| b['status'] == 'currently-reading' },
                    'reviews' => books.count { |b| b['review_html'] } },
      'shelf_changes' => books.filter_map { |b| before = previous[b['id']]; { 'id' => b['id'], 'title' => b['title'], 'from' => before['status'], 'to' => b['status'] } if before && before['status'] != b['status'] },
      'reviews_needing_date_check' => books.select { |b| b['review_html'] && previous.dig(b['id'], 'review_html') != b['review_html'] }.map(&identify),
      'unchanged' => old == books
    }
    { books: books, previous: old, summary: summary,
      settings_file: settings_file, settings_bytes: settings_bytes,
      output_bytes: File.exist?(output) ? File.binread(output) : nil }
  rescue BooksSettings::Error => e
    raise Error, e.message
  end

  def self.apply(plan, output, backup_dir:, allow_removals: false)
    raise Error, 'Review removed books and explicitly allow removals before applying this export.' if !allow_removals && !plan[:summary]['removed'].empty?
    settings_now = File.directory?(File.dirname(plan[:settings_file])) ? BooksSettings.bytes(plan[:settings_file]) : nil
    raise Error, 'Books selections changed after reviewing the import; generate a new summary.' unless settings_now == plan[:settings_bytes]
    raise Error, 'The data file must not be a symlink.' if File.symlink?(output)
    now = File.exist?(output) ? File.binread(output) : nil
    raise Error, 'Books data changed after the import was reviewed; generate a new summary.' unless now == plan[:output_bytes]
    return false if plan[:summary]['unchanged']
    bytes = YAML.dump(plan[:books])
    FileUtils.mkdir_p(File.dirname(output))
    if now
      FileUtils.mkdir_p(backup_dir, mode: 0o700)
      Tempfile.create(['books-', '.yml'], backup_dir) do |backup|
        backup.write(now)
        backup.flush
        backup.fsync
        # Tempfile.create block deletes its temporary file; retain a unique recovery copy.
        File.rename(backup.path, "#{backup.path}.backup")
      end
    end
    Tempfile.create(['.books-', '.yml'], File.dirname(output)) do |temp|
      temp.write(bytes)
      temp.flush
      temp.fsync
      temp.chmod(0o644)
      # Recheck immediately before replacing, including symlinks created meanwhile.
      raise Error, 'Books selections changed during import; nothing was replaced.' unless BooksSettings.bytes(plan[:settings_file]) == plan[:settings_bytes]
      latest = File.exist?(output) ? File.binread(output) : nil
      raise Error, 'Books data changed while importing; nothing was replaced.' if File.symlink?(output) || latest != now
      File.rename(temp.path, output)
    end
    true
  end
end

if $PROGRAM_NAME == __FILE__
  root = File.expand_path('../..', __dir__)
  options = { output: File.join(root, '_data/books.yml'), backup_dir: File.join(root, 'Drafts/.imports/goodreads/backups') }
  parser = OptionParser.new do |o|
    o.banner = 'Usage: bundle exec ruby _writing/books/import.rb EXPORT.csv [--apply] [--allow-removals]'
    o.on('--apply', 'Apply the import locally (never commits or uploads)') { options[:apply] = true }
    o.on('--allow-removals', 'Allow the reviewed removed-book list') { options[:allow_removals] = true }
    o.on('--output PATH') { |v| options[:output] = File.expand_path(v) }
    o.on('--backup-dir PATH') { |v| options[:backup_dir] = File.expand_path(v) }
  end
  begin
    parser.parse!
    raise BooksImport::Error, parser.banner unless ARGV.length == 1
    plan = BooksImport.prepare(ARGV.first, options[:output])
    puts JSON.pretty_generate(plan[:summary])
    if options[:apply]
      applied = BooksImport.apply(plan, options[:output], backup_dir: options[:backup_dir], allow_removals: options[:allow_removals])
      puts(applied ? 'Applied locally. Nothing was uploaded.' : 'No changes; data file left untouched.')
    else
      puts 'Preview only. No files changed.'
    end
  rescue BooksSettings::Error, BooksImport::Error, OptionParser::ParseError, SystemCallError => e
    warn "Books import failed: #{e.message}"
    exit 1
  end
end
