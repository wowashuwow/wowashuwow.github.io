---
title: A Standardized Photo Naming Convention for WordCamps
description: Finding photos shouldn't be so hard for attendees.
image: "/images/fi-photo-naming-convention-for-wordcamps.jpg"
tags: [WordPress, WordCamp]
---

Finding photos after a multi-day, multi-room event like WordCamp Asia is harder than it should be. With several photographers shooting across different rooms and days, the resulting photo dump on Flickr feels like a needle-in-a-haystack problem for attendees. I'm proposing a simple naming convention that's easy for photographers to implement and makes finding their own photos less daunting for attendees. Other WordCamps are welcome to adopt it too, if they don't already have a naming convention in place.

## The Naming Convention

The standard format is:

```
eventname-year-day-room-photographername-number
```

**Examples:**

- `wordcamp-asia-2026-day-one-lobby-suhas-135`
- `wordcamp-asia-2026-day-two-room-one-lokesh-263`

For special events where everything happens in one location, drop the room and add the event name instead:

```
eventname-year-day-specialevent-photographername-number
```

**Examples:**

- `wordcamp-asia-2026-social-night-lokesh-54`
- `wordcamp-asia-2026-after-party-lokesh-54`

## Formatting Rules

- **Lowercase only.** Every word must be written in lowercase and separated by hyphens. Do not use camel case, snake case, or any other formatting.
- **Hyphens as separators.** Every word, including within a multi-word segment, must be separated by a hyphen. For example, an event named "Social Night" becomes `social-night`, and a room called "Main Hall" becomes `main-hall`.
- **Full names for duplicate first names.** If two photographers share the same first name, use their full name (e.g. `madan-panthi` instead of just `madan`).

## Why This Works: Flickr Search

Flickr lets anyone search for photos using a simple URL:

```
https://www.flickr.com/search/?text=search-term
```

Because the naming convention is hierarchical, people can search at whatever level of specificity they need, without an account.

| What you're looking for                                                    | Search term                                 |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| All photos from the event                                                  | `wordcamp-asia-2026`                        |
| All photos from a specific day                                             | `wordcamp-asia-2026-day-two`                |
| All photos from a specific room on a specific day                          | `wordcamp-asia-2026-day-two-room-one`       |
| All photos by a specific photographer in a specific room on a specific day | `wordcamp-asia-2026-day-two-room-one-madan` |

If the photographer knows an attendee personally, they can provide the exact number or range of numbers from their shots, so the attendee can go directly to those files.

## One Limitation to Know

Flickr only lets viewers scroll through a set of search results up to a certain point before throwing an alert prompting them to log in (as shown in the screenshot below). In that case, the viewer has to create an account or log in to continue viewing the rest of the set.

![Screenshot showing Flickr alert to sign up or log in after scrolling through a set of images]({{site.baseurl}}/images/flickr-asking-to-sign-up-or-log-in.jpg "Flickr pop-up prompting users to sign up or log in after scrolling through a few images")

[]()

## Open for Discussion

This convention is a starting point, not a final word. If you have suggestions, edge cases, or a better approach, please share them in the comments. The goal is to land on something that works well for photographers and attendees alike.
