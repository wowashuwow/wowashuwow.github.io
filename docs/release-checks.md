# Personal-site release checks — 12 October 2026

Branch: codex/personal-site-redesign. Local preview: http://127.0.0.1:4101/.

Requested Hypertropher description and gallery-05 first image implemented. Six gallery images now have accurate alt text based on visual inspection. Subscription uses an HTTPS Mailchimp form endpoint, required email input, autocomplete, and native validation. No subscription was submitted.

Passed: Jekyll production build; JavaScript syntax; Git whitespace; all generated internal links/assets resolve; 36 posts present on the year-grouped Blog; article tags match assigned tags; production HTTPS canonicals and no unintended noindex; valid sitemap/feed; retired pagination excluded from sitemap; unpublished author draft excluded from preview/build and untouched.

External destinations: Hypertropher, Case Study Academy, work portfolio and photography site returned HTTP 200. Browser checks: desktop gallery/photo replacement, gallery opens and Escape closes, phone overflow absent, social link names and 44px targets, mobile menu opens/closes. Keyboard focus and hover-description dismissal previously checked. Dark mode and image-free post presentation previously reviewed.

Limitations: no end-to-end email delivery test, no full WCAG certification, no guarantee of Google indexing. Direct pointer-driven project tilt not manually exercised; it is gated off for touch and reduced-motion preferences. No deployment performed; publishing requires merging the reviewed redesign branch into the deployed newtheme branch.

Final rebuild passed after the HTTPS/native-validation correction. Final dark-mode gallery and mobile menu visually reviewed.
