# frozen_string_literal: true
require 'minitest/autorun'
require 'tmpdir'
require_relative '../books/settings'
require_relative '../books/posts'
class BooksPostsTest < Minitest::Test
  def setup
    @root = File.realpath(Dir.mktmpdir('books-post-links-'))
    @books = File.join(@root, '_data/books.yml'); @settings = File.join(@root, '_data/books-overrides.yml'); @backup = File.join(@root, 'Drafts/backups')
    FileUtils.mkdir_p(File.join(@root, '_data')); FileUtils.mkdir_p(File.join(@root, '_posts'))
    File.write(@books, YAML.dump([{ 'id' => '12' }, { 'id' => '13' }]))
    File.write(@settings, YAML.dump('12' => { 'posts' => ['2020-01-01-missing.md'], 'cover' => '/images/books/12.jpg', 'recommendation_blurb' => 'Preserve me' }))
    File.write(File.join(@root, '_config.yml'), "url: https://example.test\nbaseurl: /home\npermalink: /writing/:title/\n")
    git('init', '-q');git('config', 'user.name', 'Test');git('config', 'user.email', 'test@example.test')
    post('2020-01-01-one.md', "title: Same title\npermalink: /special-place/\n")
    post('2020-01-02-two.md', "title: Same title\n")
    post('2020-01-03-hidden.md', "title: Hidden\npublished: false\n")
    post('2999-01-01-future.md', "title: Future\n")
    FileUtils.mkdir_p(File.join(@root, 'Drafts'));File.write(File.join(@root, 'Drafts/private.md'), "---\ntitle: Private\n---\nSecret")
    git('add','_config.yml','_posts');git('commit','-qm','Public posts')
    post('2020-01-04-uncommitted.md', "title: Uncommitted\n")
  end
  def teardown; FileUtils.remove_entry(@root); end
  def git(*args);BooksPosts.git(@root,*args);end
  def post(name, meta);File.write(File.join(@root,'_posts',name),"---\n#{meta}---\nBody");end
  def save(value, refs)
    BooksSettings.save(@books,@settings,value,expected_token:BooksSettings.token(@books,@settings),backup_dir:@backup,published_posts:refs)
  end
  def test_catalogue_uses_committed_jekyll_posts_and_actual_urls
    posts=BooksPosts.catalog(@root)
    assert_equal %w[2020-01-02-two.md 2020-01-01-one.md],posts.map{|p|p['ref']}
    assert_equal ['Same title','Same title'],posts.map{|p|p['title']}
    assert_equal '/home/special-place/',posts.last['url']
    assert_equal '/home/writing/two/',posts.first['url']
    # Unsaved/private edits must not leak into picker titles.
    post('2020-01-01-one.md', "title: Private new title\n")
    assert_equal 'Same title',BooksPosts.catalog(@root).last['title']
  end
  def test_added_unpublished_missing_and_duplicate_refs_fail_without_writes
    original=File.binread(@settings)
    ['2020-01-03-hidden.md','2999-01-01-future.md','2020-01-04-uncommitted.md','../Drafts/private.md'].each do |ref|
      value=BooksSettings.load(@settings);value['12']['posts']=[ref]
      assert_raises(BooksSettings::Error){save(value,BooksPosts.catalog(@root).map{|p|p['ref']})}
      assert_equal original,File.binread(@settings)
    end
    value=BooksSettings.load(@settings);value['12']['posts']=['2020-01-01-one.md']*2
    assert_raises(BooksSettings::Error){save(value,['2020-01-01-one.md'])}
  end
  def test_repair_order_many_to_many_and_retention_of_other_fields
    value=BooksSettings.load(@settings);value['12']['posts']=['2020-01-02-two.md','2020-01-01-one.md'];value['13']={'posts'=>['2020-01-01-one.md']}
    assert save(value,BooksPosts.catalog(@root).map{|p|p['ref']})
    saved=BooksSettings.load(@settings);assert_equal value,saved;assert_equal 'Preserve me',saved['12']['recommendation_blurb']
    saved['12'].delete('posts');assert save(saved,['2020-01-01-one.md']);refute BooksSettings.load(@settings)['12'].key?('posts')
  end
  def test_old_missing_links_are_retained_but_newly_removed_posts_are_rejected
    value=BooksSettings.load(@settings);value['12']['history_hidden']=true
    assert save(value,[]) # No silent removal of old missing references.
    assert_equal ['2020-01-01-missing.md'],BooksSettings.load(@settings)['12']['posts']
    value['12']['posts']=['2020-01-01-one.md'];git('rm','_posts/2020-01-01-one.md');git('commit','-qm','Remove post')
    assert_raises(BooksSettings::Error){save(value,BooksPosts.catalog(@root).map{|p|p['ref']})}
  end
end
