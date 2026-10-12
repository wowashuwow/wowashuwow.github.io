# frozen_string_literal: true
require 'yaml'
require 'nokogiri'
require 'uri'

root = File.expand_path('../..', __dir__)
output = ARGV.fetch(0) { abort 'Usage: bundle exec ruby _writing/books/check.rb BUILD_OUTPUT' }
books = YAML.safe_load_file(File.join(root, '_data/books.yml'))
overrides = YAML.safe_load_file(File.join(root, '_data/books-overrides.yml')) || {}
html = Nokogiri::HTML(File.read(File.join(output, 'books/index.html')))
errors = []
expected_posts = []
overrides.each do |id, custom|
  errors << "Invalid override ID #{id}" unless id.is_a?(String) && id.match?(/\A[1-9]\d*\z/)
  (custom['posts'] || []).each do |post|
    errors << "Invalid or missing published post: #{post}" unless post.is_a?(String) && !post.include?('/') && File.file?(File.join(root, '_posts', post))
    expected_posts << post if books.any? { |b| b['id'] == id }
  end
end
books.each do |book|
  entry = html.at_css("#book-#{book['id']}")
  unless entry
    errors << "Book missing from generated page: #{book['id']}"
    next
  end
  errors << "Title missing/changed: #{book['id']}" unless entry.at_css('h3 a')&.text == book['title']
  errors << "Wrong reading state: #{book['id']}" unless entry['class'].include?('book--current') == (book['status'] == 'currently-reading')
  errors << "Review missing: #{book['id']}" if book['review_html'] && !entry.at_css('details .book__review-text')
  errors << "Review HTML contains executable content: #{book['id']}" unless entry.css('.book__review-text script, .book__review-text iframe, .book__review-text [onclick], .book__review-text [onerror]').empty?
  entry.css('img').each do |img|
    errors << "Invalid/missing cover: #{img['src']}" unless img['src'].start_with?('/images/books/') && File.file?(File.join(output, img['src']))
  end
end
ids = html.css('[id]').map { |e| e['id'] }
errors << 'Duplicate HTML IDs.' unless ids.uniq.length == ids.length
errors << 'Wrong number of book entries.' unless html.css('article.book').length == books.length
errors << 'Some configured blog links were not rendered.' unless html.css('.book__posts a').length == expected_posts.length
html.css('.book__posts a, .books-explore').each do |link|
  url = URI.parse(link['href'])
  file = File.join(output, url.path)
  file = File.join(file, 'index.html') if File.directory?(file)
  file += '.html' unless File.file?(file)
  if !File.file?(file)
    errors << "Broken public link: #{link['href']}"
  elsif url.fragment && !Nokogiri::HTML(File.read(file)).at_css("[id='#{url.fragment}']")
    errors << "Broken topic anchor: #{link['href']}"
  end
end
errors << 'Wrong production canonical.' unless html.at_css('link[rel="canonical"]')&.[]('href') == 'https://wowashuwow.com/books/'
errors << 'Books missing from sitemap.' unless File.read(File.join(output, 'sitemap.xml')).include?('https://wowashuwow.com/books/')
%w[Drafts .obsidian _writing docs].each { |folder| errors << "Private folder emitted: #{folder}" if File.exist?(File.join(output, folder)) }
abort errors.join("\n") unless errors.empty?
puts "Books output passed: #{books.length} books, #{html.css('details.book__review').length} reviews, #{expected_posts.length} blog links, covers, anchors, metadata and private-folder exclusion."
