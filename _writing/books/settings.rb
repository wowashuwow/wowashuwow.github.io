# frozen_string_literal: true
require 'yaml'
require 'json'
require 'digest'
require 'date'
require 'tempfile'
require 'fileutils'

module BooksSettings
  class Error < StandardError; end
  FIELDS = %w[cover cover_source posts review_date review_source_url recommended recommendation_order recommendation_blurb currently_reading_hidden currently_reading_order history_hidden].freeze
  EDITORIAL = %w[recommended recommendation_order recommendation_blurb currently_reading_hidden currently_reading_order history_hidden].freeze
  def self.bytes(file)
    raise Error, 'Books files must be regular files, not symlinks.' if File.symlink?(file) || File.symlink?(File.dirname(file))
    raise Error, 'Books path is not a regular file.' if File.exist?(file) && !File.file?(file)
    File.exist?(file) ? File.binread(file) : nil
  end
  def self.yaml(text)
    # Psych otherwise silently accepts duplicate keys and loses the earlier choice.
    visit = lambda do |node|
      if node.is_a?(Psych::Nodes::Mapping)
        keys = node.children.each_slice(2).map { |key, _| key.respond_to?(:value) ? key.value : nil }
        raise Error, 'Duplicate/non-scalar YAML keys; configuration was not changed.' if keys.include?(nil) || keys.uniq.size != keys.size
      end
      Array(node.respond_to?(:children) ? node.children : nil).each { |child| visit.call(child) }
    end
    tree = Psych.parse_stream(text)
    visit.call(tree)
    YAML.safe_load(text, permitted_classes: [], aliases: false)
  rescue Psych::Exception => e
    raise Error, "Invalid Books YAML: #{e.message}"
  end
  def self.validate(data)
    raise Error, 'Books settings must be a mapping keyed by Goodreads ID.' unless data.is_a?(Hash)
    data.each do |id, custom|
      raise Error, "Invalid Books settings record #{id.inspect}." unless id.is_a?(String) && id.match?(/\A[1-9]\d*\z/) && custom.is_a?(Hash) && (custom.keys - FIELDS).empty?
      %w[recommended currently_reading_hidden history_hidden].each { |key| raise Error, "#{key} must be true or false for #{id}." if custom.key?(key) && ![true, false].include?(custom[key]) }
      %w[recommendation_order currently_reading_order].each { |key| raise Error, "Invalid #{key} for #{id}." if custom.key?(key) && !(custom[key].is_a?(Integer) && (0..999_998).cover?(custom[key])) }
      if custom.key?('recommendation_blurb')
        value = custom['recommendation_blurb']
        raise Error, "Blurb must be plain text of at most 2,000 characters for #{id}." unless value.is_a?(String) && value.length <= 2000 && !value.match?(/[\x00-\x08\x0b\x0c\x0e-\x1f]/)
      end
      if custom.key?('cover')
        value = custom['cover']
        raise Error, "Invalid local cover for #{id}." unless value.is_a?(String) && value.match?(%r{\A/images/books/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp|avif|gif)\z}i) && !value.include?('..')
      end
      %w[cover_source review_source_url].each { |key| raise Error, "Invalid #{key} for #{id}." if custom.key?(key) && !(custom[key].is_a?(String) && custom[key].match?(%r{\Ahttps://[^\s<>]+\z})) }
      if custom.key?('review_date')
        date = custom['review_date']
        begin
          raise ArgumentError unless date.is_a?(String) && date.match?(/\A\d{4}-\d{2}-\d{2}\z/)
          Date.iso8601(date)
          raise ArgumentError unless custom['review_source_url'].to_s.match?(%r{\Ahttps://www\.goodreads\.com/review/show/[1-9]\d*\z})
        rescue ArgumentError
          raise Error, "Invalid review date/source for #{id}."
        end
      end
      if custom.key?('posts')
        posts = custom['posts']
        raise Error, "Invalid post links for #{id}." unless posts.is_a?(Array) && posts.uniq == posts && posts.all? { |p| p.is_a?(String) && p.match?(/\A[^\/\\\x00]+\.md\z/) && !p.include?('..') }
      end
    end
    data
  end
  def self.load(file)
    text = bytes(file)
    text ? validate(yaml(text)) : {}
  end
  def self.token(books_file, settings_file)
    Digest::SHA256.hexdigest(JSON.generate([bytes(books_file), bytes(settings_file)]))
  end
  def self.atomic(file, data, expected:, backup_dir:)
    raise Error, 'Books settings changed. Reopen Manage books and try again.' unless bytes(file) == expected
    FileUtils.mkdir_p(File.dirname(file))
    if expected
      FileUtils.mkdir_p(backup_dir, mode: 0o700)
      Tempfile.create(['books-settings-', '.backup'], backup_dir) do |backup|
        backup.binmode; backup.write(expected); backup.flush; backup.fsync
        File.rename(backup.path, backup.path + '.saved')
      end
    end
    Tempfile.create(['.books-settings-', '.yml'], File.dirname(file)) do |temp|
      temp.write(YAML.dump(data)); temp.flush; temp.fsync; temp.chmod(0o644)
      raise Error, 'Books settings changed during save; reopen the manager.' unless bytes(file) == expected
      File.rename(temp.path, file)
    end
  end
  def self.save(books_file, settings_file, proposed, expected_token:, backup_dir:)
    raise Error, 'The library or settings changed. Reopen Manage books before saving.' unless token(books_file, settings_file) == expected_token
    old = load(settings_file)
    validate(proposed)
    ids = yaml(bytes(books_file)).map { |book| book.fetch('id') }
    # Existing stale settings stay recoverable; the UI cannot invent new book identities.
    raise Error, 'Cannot configure a book that is not in the imported library.' unless (proposed.keys - old.keys - ids).empty?
    raise Error, 'Missing-book settings must be retained.' unless (old.keys - proposed.keys).empty?
    old.each do |id, custom|
      raise Error, 'Manage books cannot overwrite imported cover, date or post-link settings.' unless custom.reject { |k, _| EDITORIAL.include?(k) } == proposed.fetch(id).reject { |k, _| EDITORIAL.include?(k) }
    end
    (proposed.keys - old.keys).each { |id| raise Error, 'New settings can only contain editorial choices.' unless (proposed[id].keys - EDITORIAL).empty? }
    # New recommendations must have a source record. Stale, already-pinned records can be unselected.
    raise Error, 'A recommended book is missing from the library.' if proposed.any? { |id, c| c['recommended'] && !ids.include?(id) }
    return false if old == proposed
    expected = bytes(settings_file)
    raise Error, 'The library changed during save; reopen the manager.' unless token(books_file, settings_file) == expected_token
    atomic(settings_file, proposed, expected: expected, backup_dir: backup_dir)
    true
  end
end
