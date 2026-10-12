# frozen_string_literal: true
require 'minitest/autorun'
require 'tmpdir'
require_relative '../books/import'

class BooksImportTest < Minitest::Test
  def setup
    @dir = Dir.mktmpdir('books-import-test-')
    @input = File.join(@dir, 'export.csv')
    @output = File.join(@dir, '_data/books.yml')
    @backup = File.join(@dir, 'Drafts/.imports/goodreads/backups')
    @headers = BooksImport::HEADERS + ['Private Notes', 'Date Added', 'Average Rating']
  end

  def teardown
    FileUtils.remove_entry(@dir)
  end

  def record(**values)
    { 'Book Id' => '12', 'Title' => 'A book', 'Author' => 'An Author', 'My Rating' => '4.0',
      'Exclusive Shelf' => 'read', 'Private Notes' => 'NEVER PUBLIC',
      'Date Added' => '2026/10/13', 'Average Rating' => '4.8' }.merge(values.transform_keys(&:to_s))
  end

  def export(*records)
    CSV.open(@input, 'w') do |csv|
      csv << @headers
      records.each { |r| csv << @headers.map { |h| r[h] } }
    end
  end

  def prepare
    BooksImport.prepare(@input, @output)
  end

  def apply(plan = prepare, **options)
    BooksImport.apply(plan, @output, backup_dir: @backup, **options)
  end

  def test_eligibility_all_currently_reading_and_no_private_fields
    export(record, record('Book Id': '13', 'My Rating': '0', 'My Review': 'Unrated review'),
           record('Book Id': '14', 'Exclusive Shelf': 'currently-reading', 'My Rating': '0'),
           record('Book Id': '15', 'Exclusive Shelf': 'to-read', 'My Rating': '5'))
    plan = prepare
    assert_equal %w[12 14], plan[:books].map { |b| b['id'] }
    assert_equal 1, plan[:summary]['counts']['currently_reading']
    assert_nil plan[:books].last['rating']
    refute YAML.dump(plan[:books]).include?('NEVER PUBLIC')
    refute plan[:books].first.key?('date_read')
    refute plan[:books].first.key?('average_rating')
  end

  def test_dates_isbn_unicode_and_multiline_formatted_review
    export(record('ISBN13': '="9780752877198"', 'Date Read': '2026/09/09',
                  'Title': 'L’été, a "book"', 'My Review': "First\nsecond<br/><br/><em>Nice</em>"))
    book = prepare[:books].first
    assert_equal '9780752877198', book['isbn']
    assert_equal '2026-09-09', book['date_read']
    assert_equal 'L’été, a "book"', book['title']
    assert_includes book['review_html'], 'First<br>second'
    assert_includes book['review_html'], '<em>Nice</em>'
  end

  def test_sanitizes_review_markup_links_and_spoilers
    export(record('Spoiler': 'true', 'My Review': '<script>bad()</script><p onclick="bad()">Hi <a href="javascript:bad()">bad link</a><a href="https://example.com" style="color:red">safe</a><img src=x onerror=bad()></p>'))
    book = prepare[:books].first
    assert_equal true, book['spoiler']
    assert_includes book['review_html'], 'https://example.com'
    %w[script bad() onclick javascript style img].each { |text| refute_includes book['review_html'], text }
  end

  def test_apply_is_atomic_repeat_is_noop_and_overrides_untouched
    export(record)
    FileUtils.mkdir_p(File.dirname(@output))
    override = File.join(File.dirname(@output), 'books-overrides.yml')
    File.write(override, 'custom cover and blog links')
    assert apply
    bytes = File.binread(@output)
    time = File.mtime(@output)
    assert prepare[:summary]['unchanged']
    refute apply
    assert_equal bytes, File.binread(@output)
    assert_equal time, File.mtime(@output)
    assert_equal 'custom cover and blog links', File.read(override)
  end

  def test_changes_and_removals_need_explicit_confirmation_with_backup
    export(record, record('Book Id': '13'))
    apply
    original = File.binread(@output)
    export(record('My Rating': '5', 'My Review': 'Changed'))
    plan = prepare
    assert_equal ['12'], plan[:summary]['changed'].map { |b| b['id'] }
    assert_equal ['13'], plan[:summary]['removed'].map { |b| b['id'] }
    assert_raises(BooksImport::Error) { apply(plan) }
    assert_equal original, File.binread(@output)
    assert apply(plan, allow_removals: true)
    assert_equal original, File.binread(Dir.glob(File.join(@backup, '*.backup')).first)
  end

  def test_changed_output_after_review_is_not_overwritten
    export(record)
    apply
    export(record('My Rating': '5'))
    plan = prepare
    File.write(@output, 'another edit')
    assert_raises(BooksImport::Error) { apply(plan) }
    assert_equal 'another edit', File.read(@output)
  end

  def test_duplicate_identity_invalid_rating_and_unknown_shelf
    export(record, record)
    assert_raises(BooksImport::Error) { prepare }
    ['3.5', '6', 'oops', ''].each do |value|
      export(record('My Rating': value))
      assert_raises(BooksImport::Error) { prepare }
    end
    export(record('Exclusive Shelf': 'unknown'))
    assert_raises(BooksImport::Error) { prepare }
  end

  def test_missing_headers_empty_and_truncated_input_do_not_replace_data
    export(record)
    apply
    original = File.binread(@output)
    ["Book Id,Title\n12,Book\n", CSV.generate_line(@headers),
     CSV.generate_line(@headers) + '12,Book,Author',
     CSV.generate_line(@headers) + '"unclosed'].each do |text|
      File.write(@input, text)
      assert_raises(BooksImport::Error) { prepare }
      assert_equal original, File.binread(@output)
    end
  end

  def test_invalid_date_and_isbn
    ['2026/02/30', '2026/13/01', 'yesterday'].each do |value|
      export(record('Date Read': value))
      assert_raises(BooksImport::Error) { prepare }
    end
    export(record('ISBN13': 'not-an-isbn'))
    assert_raises(BooksImport::Error) { prepare }
  end

  def test_no_eligible_records_cannot_erase_library
    export(record)
    apply
    before = File.read(@output)
    export(record('My Rating': '0'))
    assert_raises(BooksImport::Error) { prepare }
    assert_equal before, File.read(@output)
  end

  def test_reordered_input_is_deterministic_and_edition_ids_stay_distinct
    a = record('Title': 'Same title')
    b = record('Book Id': '13', 'Title': 'Same title')
    export(a, b)
    apply
    export(b, a)
    assert prepare[:summary]['unchanged']
    assert_equal 2, prepare[:books].length
  end

  def test_malformed_existing_yaml_or_symlink_is_never_overwritten
    export(record)
    FileUtils.mkdir_p(File.dirname(@output))
    File.write(@output, 'wrong shape')
    assert_raises(BooksImport::Error) { prepare }
    File.unlink(@output)
    private_file = File.join(@dir, 'private')
    File.write(private_file, 'secret')
    File.symlink(private_file, @output)
    assert_raises(BooksImport::Error) { prepare }
    assert_equal 'secret', File.read(private_file)
  end
end
