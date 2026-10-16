# frozen_string_literal: true
require 'jekyll'
require 'open3'
require 'tmpdir'
require 'fileutils'

# Read the committed public post collection with Jekyll itself. Never scan private
# drafts or guess URLs from titles; custom permalinks and defaults must agree.
module BooksPosts
  def self.git(root, *args)
    out, error, status = Open3.capture3('git', *args, chdir: root)
    raise BooksSettings::Error, "Cannot read published posts: #{error.strip}" unless status.success?
    out
  end
  def self.catalog(root)
    return [] unless File.directory?(File.join(root, '_posts'))
    head = git(root, 'rev-parse', 'HEAD').strip
    files = git(root, 'ls-tree', '-rz', '--name-only', head, '--', '_posts', '_config.yml').split("\0")
    Dir.mktmpdir('books-post-catalog-') do |source|
      files.each do |file|
        next unless file == '_config.yml' || file.match?(%r{\A_posts/[^/]+\.md\z})
        target = File.join(source, file)
        FileUtils.mkdir_p(File.dirname(target))
        File.binwrite(target, git(root, 'show', "#{head}:#{file}"))
      end
      config = Jekyll.configuration('source' => source, 'destination' => File.join(source, '_output'), 'safe' => true, 'quiet' => true)
      site = Jekyll::Site.new(config)
      site.read
      site.posts.docs.sort_by { |post| [post.date, post.basename] }.reverse.map do |post|
        { 'ref' => File.basename(post.path), 'title' => post.data['title'].to_s,
          'url' => site.baseurl.to_s + post.url, 'date' => post.date.strftime('%Y-%m-%d') }
      end
    end
  rescue Jekyll::Errors::FatalException, Psych::Exception => e
    raise BooksSettings::Error, "Cannot read published posts: #{e.message}"
  end
end
