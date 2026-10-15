# frozen_string_literal: true
require 'base64'
require_relative 'settings'

# A durable intent makes a two-YAML save recoverable after a process interruption.
module BooksTransaction
  def self.allowed?(relative)
    %w[_data/books.yml _data/books-overrides.yml].include?(relative) || relative.to_s.match?(%r{\Aimages/books/[1-9]\d*-[0-9a-f]{20}\.jpg\z})
  end
  def self.safe_path(root, relative)
    raise BooksSettings::Error, 'Invalid recovery/save path.' unless allowed?(relative)
    file = File.join(File.realpath(root), relative)
    ancestor = file
    ancestor = File.dirname(ancestor) until File.exist?(ancestor) || File.symlink?(ancestor)
    raise BooksSettings::Error, 'Books save path must not contain symlinks.' unless File.realpath(ancestor) == ancestor
    file
  end
  def self.replace(file, bytes)
    FileUtils.mkdir_p(File.dirname(file))
    Tempfile.create(['.books-atomic-', '.tmp'], File.dirname(file)) do |temp|
      temp.binmode; temp.write(bytes); temp.flush; temp.fsync; temp.chmod(0o644)
      File.rename(temp.path, file)
    end
  end
  def self.recover(root, directory)
    journal = File.join(directory, 'pending.json')
    raw = BooksSettings.bytes(journal)
    return unless raw
    intent = JSON.parse(raw)
    raise BooksSettings::Error, 'Invalid Books recovery record.' unless intent.is_a?(Hash) && intent['files'].is_a?(Array)
    intent['files'].each do |item|
      safe_path(root, item['path'])
      current = BooksSettings.bytes(File.join(root, item['path']))
      before = item['before'] && Base64.strict_decode64(item['before'])
      after = Base64.strict_decode64(item.fetch('after'))
      raise BooksSettings::Error, 'Books files changed during interrupted save. Restore from the private backup before continuing.' unless [before, after].include?(current)
    end
    # Roll forward only the known frozen transaction. No user edits are overwritten.
    intent['files'].each { |item| replace(File.join(root, item['path']), Base64.strict_decode64(item['after'])) }
    File.rename(journal, journal + ".#{Time.now.to_f}.recovered")
  end
  def self.write(root, files, directory, expected: {})
    expected.each { |relative, bytes| raise BooksSettings::Error, 'Books changed while saving; reload before trying again.' unless BooksSettings.bytes(safe_path(root, relative)) == bytes }
    entries = files.filter_map do |relative, bytes|
      safe_path(root, relative)
      before = BooksSettings.bytes(File.join(root, relative))
      next if before == bytes
      { 'path' => relative, 'before' => before && Base64.strict_encode64(before), 'after' => Base64.strict_encode64(bytes) }
    end
    return false if entries.empty?
    FileUtils.mkdir_p(directory, mode: 0o700)
    journal = File.join(directory, 'pending.json')
    raise BooksSettings::Error, 'A previous save needs recovery first.' if File.exist?(journal)
    replace(journal, JSON.generate('files' => entries))
    entries.each do |item|
      file = safe_path(root, item['path'])
      before = item['before'] && Base64.strict_decode64(item['before'])
      raise BooksSettings::Error, 'Books changed during save. Recovery preserved the external edit.' unless BooksSettings.bytes(file) == before
      replace(file, Base64.strict_decode64(item['after']))
    end
    File.rename(journal, journal + ".#{Time.now.to_f}.saved")
    true
  end
end
