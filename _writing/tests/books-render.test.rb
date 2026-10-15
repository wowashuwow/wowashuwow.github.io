# frozen_string_literal: true
require 'minitest/autorun'
require 'jekyll'
require 'nokogiri'
require 'tmpdir'

class BooksRenderTest < Minitest::Test
  ROOT = File.expand_path('../..', __dir__)
  def setup
    @temp = File.realpath(Dir.mktmpdir('books-render-'))
    %w[_layouts _includes _pages _data].each { |dir| FileUtils.mkdir_p(File.join(@temp, dir)) }
    File.write(File.join(@temp, '_layouts/default.html'), "<!DOCTYPE html>\n<main>\n{{ content }}\n</main>\n")
    %w[book-entry.html book-selection.html external-icon.html].each { |file| FileUtils.cp(File.join(ROOT, '_includes', file), File.join(@temp, '_includes', file)) }
    FileUtils.cp(File.join(ROOT, '_pages/books.html'), File.join(@temp, '_pages/books.html'))
    @books = [
      { 'id' => '12', 'title' => 'Reviewed', 'author' => 'A', 'status' => 'read', 'rating' => 4, 'review_html' => '<p>Review</p>', 'date_read' => '2026-02-01' },
      { 'id' => '13', 'title' => 'Rated only', 'author' => 'B', 'status' => 'read', 'rating' => 5, 'date_read' => '2025-01-01' },
      { 'id' => '14', 'title' => 'Current A', 'author' => 'C', 'status' => 'currently-reading' },
      { 'id' => '15', 'title' => 'Current B', 'author' => 'D', 'status' => 'currently-reading' },
      { 'id' => '16', 'title' => 'Unrated recommendation', 'author' => 'E', 'status' => 'read' }
    ]
    @books.each { |b| b['source_url'] = "https://www.goodreads.com/book/show/#{b['id']}" }
  end
  def teardown
    FileUtils.remove_entry(@temp)
  end
  def render(overrides)
    File.write(File.join(@temp, '_data/books.yml'), YAML.dump(@books))
    File.write(File.join(@temp, '_data/books-overrides.yml'), YAML.dump(overrides))
    config = Jekyll.configuration('source' => @temp, 'destination' => File.join(@temp, 'output'), 'include' => ['_pages'], 'plugins' => [], 'safe' => true, 'strict_front_matter' => true, 'quiet' => true)
    Jekyll::Site.new(config).process
    Nokogiri::HTML(File.read(File.join(@temp, 'output/books/index.html')))
  end
  def test_sections_independent_hidden_history_and_current_order
    html = render('12' => { 'recommended' => true, 'history_hidden' => true }, '14' => { 'currently_reading_hidden' => true }, '15' => { 'currently_reading_order' => 0 }, '16' => { 'recommended' => true, 'recommendation_order' => 0 })
    assert html.at_css('#recommendation-12')
    refute html.at_css('#book-12')
    refute html.at_css('#book-14')
    refute html.at_css('#book-16')
    assert_equal %w[recommendation-16 recommendation-12], html.css('.books-recommendations article').map { |n| n['id'] }
    assert_equal ['book-15'], html.css('.books-shelf article').map { |n| n['id'] }
    assert_equal '2025-01-01', html.at_css('#book-13 .book__finished time')['datetime']
  end
  def test_all_hidden_empty_sections_and_no_false_recommendation
    html = render('12' => { 'history_hidden' => true, 'recommended' => false }, '13' => { 'history_hidden' => true }, '14' => { 'currently_reading_hidden' => true }, '15' => { 'currently_reading_hidden' => true })
    assert_empty html.css('.books-recommended, .books-current, .books-history, .books-jumps a')
  end
  def test_future_year_unknown_dates_unique_ids_and_blurb_escaping
    html = render('12' => { 'recommended' => true, 'recommendation_blurb' => '<script>alert(1)</script>', 'review_date' => '2027-01-02', 'review_source_url' => 'https://www.goodreads.com/review/show/1' })
    assert html.at_css('#reviews-2027')
    assert_equal '<script>alert(1)</script>', html.at_css('.book__blurb').text
    assert_empty html.css('.book__blurb script')
    assert_equal html.css('[id]').length, html.css('[id]').map { |n| n['id'] }.uniq.length
    html = render({})
    assert html.at_css('.books-review-year[aria-labelledby="reviews-undated"] #book-12')
    refute html.at_css('#book-12 .book__review-date')
    refute html.at_css('#book-15 time')
  end
  def test_current_preference_cannot_hide_a_finished_book
    @books.find { |b| b['id'] == '14' }.merge!('status' => 'read', 'rating' => 4)
    html = render('14' => { 'currently_reading_hidden' => true })
    assert html.at_css('#finished-list #book-14')
    refute html.at_css('#reading-shelf #book-14')
  end
end
