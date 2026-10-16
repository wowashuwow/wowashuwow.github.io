# frozen_string_literal: true
require_relative 'books-import.test'

class BooksImportTest
  def settings(value)
    FileUtils.mkdir_p(File.dirname(@output))
    @settings = File.join(File.dirname(@output), 'books-overrides.yml')
    File.write(@settings, YAML.dump(value))
  end
  def test_manual_choices_survive_reimport_shelf_changes_and_reordering
    settings('12' => { 'recommended' => true, 'recommendation_order' => 2, 'recommendation_blurb' => '<script>plain text</script>', 'posts' => ['2020-01-01-related.md'], 'currently_reading_hidden' => true, 'currently_reading_order' => 0, 'history_hidden' => true })
    original = File.binread(@settings)
    export(record('Exclusive Shelf': 'currently-reading', 'My Rating': '0'))
    apply
    export(record('Book Id': '13'), record('Title': 'Renamed', 'My Rating': '5', 'My Review': 'New review'))
    plan = prepare
    assert_equal 'currently-reading', plan[:summary]['shelf_changes'].first['from']
    assert_equal ['12'], plan[:summary]['reviews_needing_date_check'].map { |b| b['id'] }
    apply(plan)
    export(record('Book Id': '13'), record('Exclusive Shelf': 'currently-reading', 'My Rating': '0'))
    apply
    assert_equal original, File.binread(@settings)
  end
  def test_unrated_recommendation_is_retained_without_importing_all_unrated_books
    settings('12' => { 'recommended' => true })
    export(record('My Rating': '0'), record('Book Id': '13', 'My Rating': '0'))
    assert_equal ['12'], prepare[:books].map { |b| b['id'] }
    assert_nil prepare[:books].first['rating']
  end
  def test_missing_recommendation_blocks_import_and_preserves_data
    settings('12' => { 'recommended' => true })
    export(record)
    apply
    before = File.binread(@output)
    export(record('Book Id': '13'))
    assert_match(/Recommended books missing/, assert_raises(BooksImport::Error) { prepare }.message)
    assert_equal before, File.binread(@output)
  end
  def test_missing_then_returning_book_keeps_hidden_preferences
    settings('12' => { 'history_hidden' => true, 'currently_reading_hidden' => true })
    before = File.binread(@settings)
    export(record, record('Book Id': '13'))
    apply
    export(record('Book Id': '13'))
    apply(prepare, allow_removals: true)
    export(record, record('Book Id': '13'))
    apply
    assert_equal before, File.binread(@settings)
    assert_equal ['12', '13'], prepare[:books].map { |b| b['id'] }
  end
  def test_settings_edit_after_summary_blocks_even_a_noop_import
    settings('12' => { 'history_hidden' => false })
    export(record)
    apply
    plan = prepare
    settings('12' => { 'history_hidden' => true })
    assert_raises(BooksImport::Error) { apply(plan) }
    assert_equal true, BooksSettings.load(@settings)['12']['history_hidden']
  end
  def test_manager_atomic_save_noop_backup_and_stale_save
    settings('12' => { 'cover' => '/images/books/12.jpg' })
    export(record)
    apply
    token = BooksSettings.token(@output, @settings)
    original = File.binread(@settings)
    proposed = BooksSettings.load(@settings)
    refute BooksSettings.save(@output, @settings, proposed, expected_token: token, backup_dir: @backup)
    proposed['12']['history_hidden'] = true
    assert BooksSettings.save(@output, @settings, proposed, expected_token: token, backup_dir: @backup)
    assert Dir.glob(File.join(@backup, '*.saved')).any? { |f| File.binread(f) == original }
    assert_raises(BooksSettings::Error) { BooksSettings.save(@output, @settings, proposed, expected_token: token, backup_dir: @backup) }
    assert BooksSettings.load(@settings)['12']['history_hidden']
  end
  def test_invalid_settings_types_dates_orders_and_duplicate_keys_are_rejected
    [ { 'recommended' => 'false' }, { 'history_hidden' => nil }, { 'currently_reading_order' => -1 }, { 'recommendation_order' => 999999 }, { 'surprise' => true }, { 'recommendation_blurb' => 'x' * 2001 }, { 'review_date' => '2026-02-30' }, { 'cover' => '/images/books/../../secret.jpg' } ].each do |custom|
      assert_raises(BooksSettings::Error) { BooksSettings.validate('12' => custom) }
    end
    assert_raises(BooksSettings::Error) { BooksSettings.yaml("'12': {}\n'12': {}\n") }
    assert_raises(BooksSettings::Error) { BooksSettings.yaml("'12':\n  recommended: true\n  recommended: false\n") }
  end
  def test_manager_preserves_stale_and_non_editorial_fields_and_rejects_new_fake_id
    settings('12' => { 'cover' => '/images/books/12.jpg' }, '99' => { 'history_hidden' => true })
    export(record)
    apply
    original = BooksSettings.load(@settings)
    token = BooksSettings.token(@output, @settings)
    changes = [original.reject { |id, _| id == '99' }, original.merge('100' => { 'recommended' => true }), original.merge('12' => { 'cover' => '/images/books/changed.jpg' })]
    changes.each { |value| assert_raises(BooksSettings::Error) { BooksSettings.save(@output, @settings, value, expected_token: token, backup_dir: @backup) } }
    assert_equal original, BooksSettings.load(@settings)
  end
  def test_changed_library_rejects_manager_save
    settings('12' => {})
    export(record)
    apply
    token = BooksSettings.token(@output, @settings)
    export(record('Book Id': '13'), record)
    apply
    assert_raises(BooksSettings::Error) { BooksSettings.save(@output, @settings, { '12' => { 'recommended' => true } }, expected_token: token, backup_dir: @backup) }
    assert_equal({}, BooksSettings.load(@settings)['12'])
  end
end

class BooksImportTest
  def test_disk_write_failure_keeps_library_and_choices_unchanged
    settings('12' => { 'history_hidden' => true })
    export(record)
    apply
    before_data = File.binread(@output)
    before_choices = File.binread(@settings)
    export(record('My Rating': '5'))
    plan = prepare
    Tempfile.stub(:create, ->(*_) { raise Errno::ENOSPC }) do
      assert_raises(Errno::ENOSPC) { apply(plan) }
      proposed = BooksSettings.load(@settings).merge('12' => { 'history_hidden' => false })
      token = BooksSettings.token(@output, @settings)
      assert_raises(Errno::ENOSPC) { BooksSettings.save(@output, @settings, proposed, expected_token: token, backup_dir: @backup) }
    end
    assert_equal before_data, File.binread(@output)
    assert_equal before_choices, File.binread(@settings)
  end
end
