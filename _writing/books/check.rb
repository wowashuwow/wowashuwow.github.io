# frozen_string_literal: true
require 'yaml'
require 'nokogiri'
require 'uri'
require_relative 'settings'

root = File.expand_path('../..', __dir__)
output = ARGV.fetch(0) { abort 'Usage: bundle exec ruby _writing/books/check.rb BUILD_OUTPUT' }
books = BooksSettings.yaml(File.read(File.join(root, '_data/books.yml')))
overrides = BooksSettings.load(File.join(root, '_data/books-overrides.yml'))
html = Nokogiri::HTML(File.read(File.join(output, 'books/index.html')))
errors = []
expected_posts = []
expected_total = 0
books.each do |book|
  custom = overrides[book['id']] || {}
  current = book['status'] == 'currently-reading' && !custom['currently_reading_hidden']
  history = book['status'] == 'read' && book['rating'] && !custom['history_hidden']
  recommended = custom['recommended'] == true
  entry = html.at_css("#book-#{book['id']}")
  recommendation = html.at_css("#recommendation-#{book['id']}")
  expected_total += 1 if current || history
  expected_total += 1 if recommended
  errors << "Incorrect main-section visibility: #{book['id']}" unless !!entry == !!(current || history)
  errors << "Incorrect recommendation visibility: #{book['id']}" unless !!recommendation == recommended
  [entry, recommendation].compact.each do |node|
    errors << "Title missing/changed: #{book['id']}" unless node.at_css('.book__title a')&.text == book['title']
    node.css('img').each do |img|
      errors << "Invalid/missing cover: #{img['src']}" unless img['src'].start_with?('/images/books/') && File.file?(File.join(output, img['src']))
    end
  end
  if recommendation && custom['recommendation_blurb'] && !custom['recommendation_blurb'].empty?
    errors << "Blurb changed/not escaped: #{book['id']}" unless recommendation.at_css('.book__blurb')&.text&.delete("\n") == custom['recommendation_blurb'].delete("\n") && recommendation.css('.book__blurb *:not(br)').empty?
  end
  next unless entry
  errors << "Wrong reading state: #{book['id']}" unless entry['class'].include?('book--current') == !!current
  errors << "Review missing: #{book['id']}" if book['review_html'] && !entry.at_css('details .book__review-text')
  errors << "Review HTML contains executable content: #{book['id']}" unless entry.css('.book__review-text script, .book__review-text iframe, .book__review-text [onclick], .book__review-text [onerror]').empty?
  if history
    if book['review_html']
      expected_year = custom['review_date'] ? custom['review_date'][0, 4] : 'undated'
      errors << "Wrong review grouping: #{book['id']}" unless entry.ancestors('section').any? { |section| section['aria-labelledby'] == "reviews-#{expected_year}" }
      errors << "Wrong review date: #{book['id']}" if custom['review_date'] && entry.at_css('.book__review-date time')&.[]('datetime') != custom['review_date']
    else
      errors << "Rating-only book in wrong section: #{book['id']}" unless entry.ancestors('#finished-list').any?
    end
    completion = entry.at_css('.book__finished time')
    errors << "Wrong/made-up completion date: #{book['id']}" unless completion&.[]('datetime') == book['date_read']
  end
  (custom['posts'] || []).each do |post|
    errors << "Invalid or missing published post: #{post}" unless File.file?(File.join(root, '_posts', post))
    expected_posts << post
  end
end
overrides.each { |id, custom| errors << "Recommended book missing from data: #{id}" if custom['recommended'] && !books.any? { |b| b['id'] == id } }
%w[recommended current].each do |section|
  key = section == 'recommended' ? 'recommendation_order' : 'currently_reading_order'
  selected = books.select { |b| c = overrides[b['id']] || {}; section == 'recommended' ? c['recommended'] : b['status'] == 'currently-reading' && !c['currently_reading_hidden'] }
  expected = selected.sort_by { |b| [(overrides[b['id']] || {})[key] || 999999, b['title'].downcase, b['id'].to_i] }.map { |b| b['id'] }
  selector = section == 'recommended' ? '.books-recommendations article' : '.books-shelf article'
  actual = html.css(selector).map { |node| node['id'].split('-').last }
  errors << "Incorrect #{section} order." unless actual == expected
end
ids = html.css('[id]').map { |e| e['id'] }
errors << 'Duplicate HTML IDs.' unless ids.uniq.length == ids.length
errors << 'Wrong number of book entries.' unless html.css('article.book').length == expected_total
errors << 'Some configured blog links were not rendered.' unless html.css('.book__posts a').length == expected_posts.length
html.css('.book__posts a, .books-explore, .books-jumps a').each do |link|
  url = URI.parse(link['href'])
  file = url.path.empty? ? File.join(output, 'books/index.html') : File.join(output, url.path)
  file = File.join(file, 'index.html') if File.directory?(file)
  file += '.html' unless File.file?(file)
  if !File.file?(file)
    errors << "Broken public link: #{link['href']}"
  elsif url.fragment && !Nokogiri::HTML(File.read(file)).at_css("[id='#{url.fragment}']")
    errors << "Broken anchor: #{link['href']}"
  end
end
errors << 'Wrong production canonical.' unless html.at_css('link[rel="canonical"]')&.[]('href') == 'https://wowashuwow.com/books/'
errors << 'Books missing from sitemap.' unless File.read(File.join(output, 'sitemap.xml')).include?('https://wowashuwow.com/books/')
%w[Drafts _drafts .obsidian _writing docs].each { |folder| errors << "Private folder emitted: #{folder}" if File.exist?(File.join(output, folder)) }
abort errors.join("\n") unless errors.empty?
puts "Books output passed: #{expected_total} displayed entries (including repeated recommendations), #{html.css('details.book__review').length} reviews, #{expected_posts.length} blog links; visibility, order, dates, IDs, covers, anchors, metadata and private-folder exclusion."
