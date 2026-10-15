# frozen_string_literal: true
require 'minitest/autorun'
require 'tmpdir'
require_relative '../books/metadata'
require_relative '../books/transaction'

class BooksMetadataTest < Minitest::Test
  def book(id = '12')
    { 'id' => id, 'title' => 'Mindset', 'author' => 'Author', 'status' => 'read', 'rating' => 4, 'source_url' => "https://www.goodreads.com/book/show/#{id}", 'review_html' => '<p>My review</p>' }
  end
  def feed
    '<rss><channel><item><book_id>12</book_id><book_large_image_url>https://i.gr-assets.com/images/test/12.jpg</book_large_image_url><link>https://www.goodreads.com/review/show/22?utm_source=rss</link><pubDate>Fri, 1 Jan 2027 00:00:00 +0000</pubDate></item></channel></rss>'
  end
  def test_exact_id_cover_and_review_source_without_invented_dates_or_rating
    changes = BooksMetadata.enrichment([book], {}, [feed])
    assert_equal 'https://i.gr-assets.com/images/test/12.jpg', changes['12']['cover']
    assert_equal 'https://www.goodreads.com/review/show/22', changes['12']['review_source_url']
    refute changes['12'].key?('review_date')
    assert_empty BooksMetadata.enrichment([book('13')], {}, [feed])
    result = BooksMetadata.merge_automatic([book], {}, changes)
    assert_equal 'automatic', result['12']['cover_origin']
    refute result['12'].key?('rating')
  end
  def test_reimports_keep_manual_covers_no_cover_choice_and_source
    overrides = { '12' => { 'cover' => '/images/books/12.jpg', 'recommended' => true } }
    result = BooksMetadata.enrichment([book], overrides, [feed])
    refute result['12'].key?('cover')
    overrides['12'] = { 'cover_disabled' => true }
    refute BooksMetadata.enrichment([book], overrides, [feed])['12'].key?('cover')
  end
  def test_xml_safety_duplicate_pages_and_cover_host_validation
    assert_raises(BooksSettings::Error) { BooksMetadata.parse(['<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><rss/>']) }
    assert_raises(BooksSettings::Error) { BooksMetadata.parse(['<rss>']) }
    assert_equal 1, BooksMetadata.parse([feed, feed]).length
    %w[http://i.gr-assets.com/images/a.jpg https://evil.example/a.jpg https://i.gr-assets.com@evil.example/images/a.jpg https://covers.openlibrary.org/b/id/-1-L.jpg].each { |url| refute BooksMetadata.cover_url?(url) }
    assert BooksMetadata.cover_url?('https://covers.openlibrary.org/b/id/123-L.jpg')
    assert_nil BooksMetadata.review_url('https://www.goodreads.com/book/show/22')
  end
  def test_manual_date_validation_clear_fingerprint_and_no_cover
    original = { '12' => { 'recommended' => true, 'cover' => '/images/books/12.jpg' } }
    next_value, assets = BooksMetadata.manual([book], original, { '12' => { 'cover' => nil, 'review' => { 'date' => '2024-02-29', 'source' => 'https://www.goodreads.com/review/show/22?utm=1', 'confirmed' => true } } }, today: Date.new(2026, 10, 16))
    assert next_value['12']['cover_disabled']
    refute next_value['12'].key?('cover')
    assert next_value['12']['recommended']
    assert_match(/\A[0-9a-f]{64}\z/, next_value['12']['review_fingerprint'])
    assert_equal 'https://www.goodreads.com/review/show/22', next_value['12']['review_source_url']
    assert_equal '/images/books/12.jpg', original['12']['cover']
    assert_empty assets
    cleared, = BooksMetadata.manual([book], next_value, { '12' => { 'review' => nil } })
    refute cleared['12'].key?('review_date')
    refute cleared['12'].key?('review_fingerprint')
    assert_equal next_value['12']['review_source_url'], cleared['12']['review_source_url']
    %w[2025-02-29 2027-01-01 0000-01-01].each do |date|
      assert_raises(BooksSettings::Error) { BooksMetadata.manual([book], original, { '12' => { 'review' => { 'date' => date, 'source' => 'https://www.goodreads.com/review/show/22', 'confirmed' => true } } }, today: Date.new(2026, 10, 16)) }
    end
  end
  def test_metadata_cannot_configure_other_ids_or_mutate_imported_facts
    assert_raises(BooksSettings::Error) { BooksMetadata.merge_automatic([book], {}, { '99' => { 'cover' => 'https://i.gr-assets.com/images/a.jpg' } }) }
    assert_raises(BooksSettings::Error) { BooksMetadata.manual([book], {}, { '12' => { 'rating' => 5 } }) }
    assert_raises(BooksSettings::Error) { BooksMetadata.enrichment([book], {}, [], { '12' => 'invalid' }) }
  end
  def test_transaction_recovery_rolls_forward_known_files_but_refuses_external_edits
    Dir.mktmpdir do |root|
      data = File.join(root, '_data'); backup = File.join(root, 'private'); FileUtils.mkdir_p(data); FileUtils.mkdir_p(backup)
      a = '_data/books.yml'; b = '_data/books-overrides.yml'
      File.write(File.join(root, a), 'old books'); File.write(File.join(root, b), 'old choices')
      intent = { 'files' => [a, b].map { |name| { 'path' => name, 'before' => Base64.strict_encode64(File.binread(File.join(root, name))), 'after' => Base64.strict_encode64('new ' + name) } } }
      File.write(File.join(backup, 'pending.json'), JSON.generate(intent))
      File.write(File.join(root, a), 'new ' + a)
      BooksTransaction.recover(root, backup)
      assert_equal 'new ' + a, File.read(File.join(root, a))
      assert_equal 'new ' + b, File.read(File.join(root, b))
      refute File.exist?(File.join(backup, 'pending.json'))
      File.write(File.join(backup, 'pending.json'), JSON.generate(intent)); File.write(File.join(root, b), 'external edit')
      assert_raises(BooksSettings::Error) { BooksTransaction.recover(root, backup) }
      assert_equal 'external edit', File.read(File.join(root, b))
    end
  end
end
