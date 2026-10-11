# Clancy, personalised

12 October 2026 · first review preview

## Design commitments

Keep the existing masthead, greeting, Source Sans 3, white/violet light palette, dark mode, rounded photo gallery, and conversational writing. Use direct section headings. Personal content supplies the identity; no decorative eyebrows, artificial numbering, invented metrics, generic marketing copy, or palette replacement.

## Initial typography and layout

- Source Sans 3 remains the body and heading family; retain the current loading fallbacks.
- Body: 20px on desktop, 18px on small phones; article line-height 1.65.
- Article reading width: 38rem, separate from the wider photo canvas.
- Masthead and greeting retain Clancy's existing responsive scale.
- Article/page title: 62px desktop, 48px at the desktop breakpoint, 32px on small phones.
- Article subheadings: 36/28/24px for h2/h3/h4; h2/h3 become 30/25px on small phones.
- Dates: 16px desktop, 15px on small phones; normal case and tabular numerals.
- Captions: 15px with 1.5 line-height; footnotes: 17px with 1.6 line-height.
- Visible violet focus outlines, consistent links, native buttons, reduced-motion support.

## Two restrained writing-list options

Both use the same content, theme, gallery, projects, and navigation. Option A gives titles slightly more presence: 1.4rem/600 weight, with 22px row padding. Option B is denser: 1.2rem/500 weight, with 15px row padding. Small-phone titles are 22px and 20px respectively, with dates below the title. These are local build variants; no visual switcher is added to the public site.

## First preview scope

Five recent posts without images; a full year-grouped archive; topic browsing; retained paginated blog URLs; all 15 existing gallery photographs; two projects; photography-site navigation; social/portfolio links in About and the footer. The author's existing post bodies and optional featured images remain intact.

## Verification and known limits

Jekyll 3.10 builds; generated-output checks cover counts, archive URL uniqueness, topic IDs/anchors, old pagination, and draft exclusion. Browser checks cover phone/desktop layouts, dark mode, photo viewing, menu controls, and an image-free render of the existing Exercise post. Reduced-motion testing found and fixed a lightbox close issue: animation completion events must still fire.

An image-free article sample is generated only into a temporary preview directory, not into repository content. Goodreads/Letterboxd data and Obsidian publishing are later phases. No deployment, merge, or theme purchase has occurred.
