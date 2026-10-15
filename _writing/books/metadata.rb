# frozen_string_literal: true
require 'nokogiri'
require 'uri'
require 'base64'
require_relative 'settings'

# Supplemental feed data never changes CSV membership or personal ratings/reviews.
module BooksMetadata
  PROFILE = '66848291'
  COVER_HOSTS = %w[i.gr-assets.com images.gr-assets.com covers.openlibrary.org].freeze
  def self.cover_url?(value)
    uri = URI.parse(value.to_s)
    return false unless uri.scheme == 'https' && !uri.userinfo && !uri.port.to_s.empty? && uri.port == 443 && !uri.fragment
    return false unless COVER_HOSTS.include?(uri.host) && !value.match?(/(?:nophoto|no_cover|default_book|\.\. |[\x00-\x20<>])/ix)
    if uri.host == 'covers.openlibrary.org'
      uri.path.match?(%r{\A/b/(?:id|isbn)/[0-9Xx]+-[SML]\.jpg\z})
    else
      uri.path.start_with?('/images/') && uri.path.match?(/\.(?:jpe?g|png|webp)\z/i)
    end
  rescue URI::InvalidURIError
    false
  end
  def self.review_url(value)
    uri = URI.parse(value.to_s)
    return nil unless uri.scheme == 'https' && uri.host == 'www.goodreads.com' && !uri.userinfo && uri.port == 443 && uri.path.match?(%r{\A/review/show/[1-9]\d*\z})
    "https://www.goodreads.com#{uri.path}"
  rescue URI::InvalidURIError
    nil
  end
  def self.parse(feeds)
    raise BooksSettings::Error, 'Invalid supplemental feed input.' unless feeds.is_a?(Array) && feeds.length <= 12
    records = {}
    feeds.each do |text|
      raise BooksSettings::Error, 'Feed is too large or contains unsupported XML declarations.' unless text.is_a?(String) && text.bytesize <= 2_000_000 && !text.match?(/<!DOCTYPE|<!ENTITY/i)
      doc = Nokogiri::XML(text) { |config| config.strict.nonet }
      raise BooksSettings::Error, 'Expected a Goodreads RSS feed.' unless doc.at_xpath('/rss/channel')
      doc.xpath('/rss/channel/item').each do |item|
        id = item.at_xpath('book_id')&.text.to_s
        next unless id.match?(/\A[1-9]\d*\z/)
        cover = %w[book_large_image_url book_medium_image_url book_image_url].map { |tag| item.at_xpath(tag)&.text }.find { |url| cover_url?(url) }
        source = review_url(item.at_xpath('link')&.text)
        next if records.key?(id) # repeated RSS pages cannot loop or overwrite a match
        records[id] = { 'cover' => cover, 'review_source_url' => source }.compact
      end
    end
    records
  rescue Nokogiri::XML::SyntaxError => e
    raise BooksSettings::Error, "Invalid Goodreads RSS: #{e.message.lines.first.to_s.strip}"
  end
  def self.enrichment(books, overrides, feeds, supplemental = {})
    raise BooksSettings::Error, 'Invalid supplemental records.' unless supplemental.is_a?(Hash) && supplemental.length <= 2000 && supplemental.all? { |id, value| id.is_a?(String) && value.is_a?(Hash) && (value.keys - %w[cover cover_source review_source_url]).empty? }
    records = parse(feeds).merge(supplemental)
    books.each_with_object({}) do |book, result|
      custom = overrides[book['id']] || {}
      source = records[book['id']] || {}
      changes = {}
      if !custom['cover'] && !custom['cover_disabled'] && source['cover']
        changes.merge!('cover' => source['cover'], 'cover_source' => source['cover_source'] || book['source_url'], 'cover_origin' => 'automatic')
      end
      if book['review_html'] && !custom['review_source_url'] && source['review_source_url']
        changes['review_source_url'] = source['review_source_url']
      end
      result[book['id']] = changes unless changes.empty?
    end
  end
  def self.merge_automatic(books, overrides, changes)
    raise BooksSettings::Error, 'Invalid fetched metadata.' unless changes.is_a?(Hash)
    eligible = books.to_h { |b| [b['id'], b] }
    output = Marshal.load(Marshal.dump(overrides))
    changes.each do |id, values|
      raise BooksSettings::Error, 'Fetched metadata no longer matches the library.' unless eligible[id] && values.is_a?(Hash) && (values.keys - %w[cover cover_source cover_origin review_source_url]).empty?
      current = output[id] ||= {}
      if values['cover']
        raise BooksSettings::Error, 'Invalid fetched cover.' unless cover_url?(values['cover']) && values['cover_origin'] == 'automatic' && values['cover_source'].is_a?(String) && values['cover_source'].match?(%r{\Ahttps://(?:www\.goodreads\.com/book/show/[1-9]\d*|openlibrary\.org/(?:books|works)/OL[0-9]+[MW])\z})
        current.merge!(values.slice('cover', 'cover_source', 'cover_origin')) unless current['cover'] || current['cover_disabled']
      end
      if values['review_source_url']
        raise BooksSettings::Error, 'Invalid fetched review source.' unless review_url(values['review_source_url']) == values['review_source_url']
        current['review_source_url'] ||= values['review_source_url'] if eligible[id]['review_html']
      end
    end
    BooksSettings.validate(output)
  end
  def self.manual(books, overrides, changes, today: Date.today)
    raise BooksSettings::Error, 'Invalid book metadata edits.' unless changes.is_a?(Hash)
    output = Marshal.load(Marshal.dump(overrides))
    library = books.to_h { |b| [b['id'], b] }
    assets = {}
    changes.each do |id, edit|
      raise BooksSettings::Error, 'Book is no longer in this library.' unless library[id] && edit.is_a?(Hash) && (edit.keys - %w[cover review]).empty?
      custom = output[id] ||= {}
      if edit.key?('cover')
        value = edit['cover']
        if value.nil?
          custom.delete('cover'); custom.delete('cover_source'); custom.delete('cover_origin'); custom['cover_disabled'] = true
        elsif value.is_a?(String) && cover_url?(value)
          custom.merge!('cover' => value, 'cover_origin' => 'manual'); custom.delete('cover_disabled'); custom['cover_source'] = value
        elsif value.is_a?(Hash) && value.keys.sort == %w[jpeg source]
          bytes = Base64.strict_decode64(value['jpeg'])
          raise BooksSettings::Error, 'Choose a normalized JPEG cover of at most 1 MB.' unless bytes.bytesize.between?(4, 1_048_576) && bytes.start_with?("\xFF\xD8\xFF".b) && bytes.end_with?("\xFF\xD9".b)
          digest = Digest::SHA256.hexdigest(bytes)
          target = "images/books/#{id}-#{digest[0, 20]}.jpg"
          assets[target] = bytes
          custom.merge!('cover' => '/' + target, 'cover_origin' => 'manual'); custom.delete('cover_disabled')
          custom.delete('cover_source')
        else
          raise BooksSettings::Error, 'Choose a valid fetched cover or JPEG file.'
        end
      end
      if edit.key?('review')
        raise BooksSettings::Error, 'This book has no written review.' unless library[id]['review_html']
        value = edit['review']
        if value.nil?
          custom.delete('review_date'); custom.delete('review_fingerprint')
        else
          raise BooksSettings::Error, 'Invalid review date edit.' unless value.is_a?(Hash) && (value.keys - %w[date source confirmed]).empty? && value['confirmed'] == true
          date = Date.iso8601(value.fetch('date'))
          raise BooksSettings::Error, 'Review date must be a real date, not in the future.' unless value['date'].match?(/\A[0-9]{4}-[0-9]{2}-[0-9]{2}\z/) && date.year.positive? && date <= today
          source = review_url(value['source'])
          raise BooksSettings::Error, 'Use the Goodreads review URL, not a book or status URL.' unless source
          custom.merge!('review_date' => date.iso8601, 'review_source_url' => source, 'review_fingerprint' => Digest::SHA256.hexdigest(library[id]['review_html']))
        end
      end
    end
    [BooksSettings.validate(output), assets]
  rescue ArgumentError, KeyError, TypeError
    raise BooksSettings::Error, 'Invalid image or review date. Existing choices were preserved.'
  end
end
