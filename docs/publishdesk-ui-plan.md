# PublishDesk interface improvement plan

Status: implemented in PublishDesk 1.2.1 and released through PR #5 on 16 October 2026. The author accepted the installed workflow before release. The design/research plan below is retained as implementation rationale; final release evidence is in release-checks.md. Native agent UI automation remained unavailable, so its individual checks are not falsely marked passed.

## Problem and evidence

The author's Manage books screenshot shows repeated equally weighted separators, a book title styled like a field label, narrow blurb inputs, and nested scrolling. The code confirms every book's header, blog links, cover, review date and blurb are sibling Setting rows in one flat list. There is no enclosing book element. Manager and PostLinks force a 45vh inner scroller; ImageChoice forces a 320px scroller while the modal can also scroll. A textarea may add a third scrolling surface.

The plugin currently has no styles.css; setup.js bundles JavaScript and copies the manifest only. Both the package and refresh path must install the new stylesheet. Theme snippets are not the appropriate delivery mechanism for plugin layout.

## Research and decisions

- Official Obsidian HTML-elements documentation explicitly demonstrates grouping book title/author inside a containing element, with a border/padding and theme variables. Use this documented pattern with native inputs/buttons, not a new UI framework.
- Official plugin guidelines recommend CSS classes/styles.css, Obsidian variables, sentence case, safe DOM creation and consistent native headings. Apply layout within a PublishDesk namespace only; no global .setting-item or modal overrides.
- Context7 official API documentation reports SettingGroup since 1.11.0. The current manifest minimum is 1.13.0 and installed app is 1.14.4. It is available, but repeated book records are content groups rather than plugin preferences: use explicit labelled book containers with native Setting controls, choosing SettingGroup only where its generated markup fits. Do not adopt newer declarative settings APIs or raise the version requirement for this visual pass.
- The official sample plugin includes styles.css in its installed/release artifact. Extend our existing bundle installer accordingly, preserving vault settings and recovery records.
- Grouping, scroll ownership and footer placement below are design decisions for this workflow, not claims that Obsidian mandates a particular layout. Retain native fuzzy book/post pickers.

Sources:
- https://docs.obsidian.md/Plugins/User%20interface/HTML%20elements
- https://raw.githubusercontent.com/obsidianmd/obsidian-developer-docs/main/en/Plugins/Releasing/Plugin%20guidelines.md
- https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Reference/TypeScript%20API/SettingGroup.md
- https://docs.obsidian.md/Reference/CSS%20variables/Components/Modal
- https://github.com/obsidianmd/obsidian-sample-plugin

## Proposed interaction and visual design

### Additional interaction-design review

Follow-up research after the author challenged the depth of the first pass: Obsidian API knowledge alone is insufficient. Apply these established principles to each dialog, then validate the result with real tasks.

- **Common region and proximity:** NN/g explains that a shared boundary communicates membership, while excess borders create clutter. One understated boundary per book, more space between books than between its fields, and no border around every nested control. Title/author must remain visibly associated with all actions. Sources: https://www.nngroup.com/articles/common-region/ and https://www.nngroup.com/articles/gestalt-proximity/ .
- **Actions belong near their objects:** place reorder/visibility at the relevant book, selection beside its cover candidate, unlink beside its post. Reserve the footer for the whole dialog. Source: https://www.nngroup.com/articles/closeness-of-actions-and-objects-gui/ .
- **Form readability:** permanent labels above multiline fields, readable line length and room for real text. Placeholder is supplementary. Use native Obsidian controls and visual language, not GOV.UK styling. Source: https://design-system.service.gov.uk/components/textarea/ .
- **Visible state:** make current choice, pending local edits, fetching, failure, saved locally, uploaded and confirmed live distinguishable. Do not show success based only on a click or use an error announcement region for normal progress. Preserve existing state-machine decisions; presentation must reflect them accurately. Source: https://www.nngroup.com/articles/visibility-system-status/ .
- **Action hierarchy:** a single primary completion action per dialog; secondary navigation/cancellation and destructive/reset actions clearly distinguished. Do not make every book control an accent button. Source: https://design-system.service.gov.uk/components/button/ .
- **Accessible dialogs:** use Obsidian's existing modal mechanism, verify focus enters and stays in the active child dialog, Escape closes that child, and focus returns to its invoking book control. Long review dialogs should initially expose the title/context rather than scroll straight to a distant action. Avoid duplicating native focus traps. Source: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ .
- **No footer overlay:** lay out header/body/footer as separate flex/grid regions; the body alone shrinks/scrolls. Do not float a footer on top of fields. At very short heights/large text, allow a safe layout fallback so actions remain reachable. Check every focused field remains fully visible (stronger than minimum). Source: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html .
- **Recoverable errors:** retain entered values, explain the problem and corrective action beside the relevant control, and associate it programmatically. Distinguish validation failure from unavailable network services. Source: https://design-system.service.gov.uk/components/error-message/ .

Required capabilities: interaction design for repeated-record forms, Obsidian native UI/DOM/CSS, keyboard/accessibility testing, asynchronous-state handling, bundle packaging and regression testing. Existing native APIs and this repository's JS/Ruby test tools cover implementation; no extra design framework, plugin or agent skill installation is needed. Reading documentation is not evidence of a successful design: native visual and task acceptance below remains mandatory.

First design review must demonstrate: identify where Mindset ends and Cuckold starts without reading every field; edit blurbs on both without losing either; change a cover then cancel the manager without saving; reorder a book and retain keyboard context; understand whether a change is pending, saved locally or published. Inspect this first working manager before restyling all dialogs. If grouping is still unclear, revise it before proceeding.

### Manage books — first priority

1. Separate the section/search/add controls from the records. Keep the familiar section dropdown and search; do not add a dashboard or new navigation hierarchy.
2. Render each book as one padded, subtly outlined panel with visible space before the next book. Title is the strongest text, author secondary. Give each panel an accessible name from its title; duplicate titles also retain author/ID identity internally.
3. Keep Remove/reorder or website visibility controls in the book header, clearly associated with that book. Removal says it removes the recommendation, not the imported record. Hidden books remain findable/editable.
4. Place Blog posts, Cover and applicable Review date controls together within that panel. Suppress the default line between every field; preserve clear focus styles and comfortable target sizes. Display pending cover/date/link state so Done is not mistaken for a disk save.
5. Put the recommendation blurb below those controls, label above a near-full-width textarea. Start around five lines high, allow vertical resizing, preserve the 2,000-character limit. Long text can still scroll inside its textarea when necessary; lists must not create extra scrolling boxes.
6. Keep panels expanded initially. Solve grouping without requiring a click on every book. Assess actual density with long titles/blurbs before considering optional disclosure; no accordion needed in this pass.
7. Use one scrolling modal body. Keep Cancel and Save locally in a footer outside that body, with no obscured fields/focus. Move Reload saved choices to a secondary control and state explicitly that it discards unsaved edits. Preserve its existing behaviour in this presentation pass; do not introduce a new confirmation dialog.
8. Put Retry missing data in a separate maintenance group within the body, above the final footer. Preserve its existing unsaved-edit guard and cancellation behaviour. Show progress beside this action, rather than treating progress as an error.

### All other interfaces

- **Cover:** book title/author context; current or pending cover and dimensions as a single preview group; cover candidates grouped with thumbnail, title/author/provider and visible selected state. Separate automatic search, file replacement and no-cover actions. Retain Done/Cancel and current validation/normalization. A broken image must not collapse the layout or disable recovery.
- **Review date:** retain book context, source/excerpt, labelled date/URL, confirmation and pending state. Clearly separate Clear date from Done. Preserve validation and the fact that date entry is optional.
- **Blog posts:** retain book identity, native post search, ordered links and unavailable-link warning. One clear record per linked post; labelled unlink/reorder buttons; single body scroll and Done/Cancel footer.
- **Import Goodreads:** visually separate file selection, fetching progress, proposed additions/updates/removals, warnings and Apply locally. Keep removal acknowledgement and import-preservation guarantees. Long change details can use native disclosure; critical warnings and final action stay visible. Empty, unchanged, offline and cancelled states must be understandable.
- **Publish post and Publish Bookshelf:** consistent review layout: content identity/destination, human-readable changes, optional public Git note and expandable file details. Privacy/public-source notices and setup blockers remain prominent. Preserve the existing Publish action, frozen checks and initial-release gating.
- **Featured image:** group import, existing-image search/results and removal; keep the optional Also insert toggle clearly labelled. Preserve supported formats and file handling. Single body scroll; text paths wrap. No new thumbnail-fetch pipeline in this UI pass.
- **New draft:** simple labelled title and consistent Create draft/Cancel placement, initial focus and keyboard behaviour. Preserve title validation/slug creation.
- **Draft deletion / leftover cleanup:** clearly distinct files moving to recoverable trash and files being kept with reasons. Folder chooser gets readable wrapping/grouping. Preserve every cleanup exclusion and final confirmation.
- **Preview / stop preview / retry upload / publication status:** audit short notices and errors for clear operation/result/next action. Retain existing timings/lifecycle and automatic browser-opening behaviour. Do not create new dialogs for simple success messages; important failures should remain copyable/readable and must not be hidden behind another modal.
- **Plugin settings:** native setting appearance, readable helper text and input width; retain existing property setting and persistence.

## Shared implementation boundary

Start with ordinary labelled containers and one _writing/styles.css. Continue using Modal, Setting and FuzzySuggestModal. Scope classes under publishdesk-*. Use Obsidian typography, spacing, border/background, focus and error tokens. Wider manager, smaller task dialogs; responsive stacking for narrow/resized desktop windows. No fixed-height clipping, decorative gradients, animations, custom fonts or new dependencies.

Expected changes: _writing/main.js, _writing/lib/books-ui.js, _writing/styles.css, _writing/setup.js, relevant UI/bundle tests and user documentation. Do not introduce a UI module in advance. Extract a small layout helper only if actual implementation duplicates the same layout across both source files; otherwise simple local functions/markup are sufficient. If extraction is justified, explicitly bundle it and test the actual built artifact. Do not create a configurable modal framework, component registry or new state-management layer.

No data schema/migration, cover-provider, CSV, transaction, Git, cleanup algorithm or Jekyll template changes are planned. Preserve command IDs/names and return values. Saving remains local; publishing remains a separate explicit action. No AI dependency added.

Simplicity review: this is a presentation improvement, not a workflow redesign. Keep existing controls, pickers, handlers and save/cancel rules. Add book containers, spacing, readable inputs, shared CSS and reliable scroll/footer layout. Existing status text can be repositioned or clarified without building a new notification system. Existing publication detail disclosures can be retained; no new accordion, tabs, inline book editor, cover caching or background service. Audit every option, but leave a screen alone if it is already clear. Do not force a scrolling shell onto short dialogs that fit naturally. Extra automated checks should target changed UI behaviour, bundle delivery and regression risks; do not add tests for arbitrary spacing values or repeat provider/network testing when those modules are unchanged.

## Failure cases and acceptance checks

- Long/duplicate titles, long author names, 2,000-character blurbs, missing images, unavailable links, no recommendations, empty search, many records, all hidden and mixed hidden/visible entries.
- Search, section switching, reorder and child-dialog return preserve edits, focus and sensible scroll position. Never attach one book's event handler or pending metadata to another after rendering. Use stable book IDs.
- Tab order, visible focus, keyboard reorder, named toggles/buttons, Escape/cancel and focus return to the invoking control. Do not override native Enter in multiline textareas or accidentally trigger Publish/Save.
- Keep status announcements polite; errors actionable and associated with the relevant field/action. Do not depend on colour or hover to explain state. Check contrast in the actual user theme and default light/dark themes.
- Two independent books edited before Save; child Done then parent Cancel; failed Save then retry; cancellation during lookup/import; repeated clicks; stale-data rejection; plugin unload. Existing guards/AbortController behaviour must remain intact.
- Refresh copies stylesheet and bundle only, retains settings/recovery records, does not alter personal-vault appearance. CSS leaves other plugins/settings untouched. Confirm generated Jekyll output still excludes plugin internals.
- Use disposable data/Git repos for writes/publishing/deletion tests; byte-compare real bookshelf data before/after cancel-only native checks. No real publication during UI testing.

## Implementation sequence and completion gates

- [x] Audit current commands/dialogs and identify causes from source/screenshot.
- [x] Research official plugin UI/styling/APIs and record plan.
- [x] Capture current baseline tests and source/data fingerprints. Work on the existing feature branch with recoverable backup.
- [x] Add scoped stylesheet, minimal shared layout and bundle/refresh support; check built artifact without changing vault settings.
- [x] Implement Manage books grouping/scroll/blurb changes first and inspect it visually before propagating the pattern.
- [x] Apply matching treatment to book subdialogs, import/publication, then draft/image/cleanup/settings and feedback.
- [x] Extend behaviour tests for containment, correct book identity, draft/pending edits, cancel/save/async guards; update flat-row test harness to traverse actual groups instead of preserving the broken layout.
- [x] Run full existing JS/Ruby regression suites, temporary bundle checks and isolated site build. Failure means fix before installation/release.
- [ ] Native Obsidian check in the actual theme, default light/dark, resized window and enlarged text. Visually verify one book boundary at a glance, usable blurbs, a single list scroll area and reachable footer controls. Capture screenshots. Browser/mock tests alone do not count as native acceptance.
- [ ] Install through the existing refresh path, complete user walkthrough, update docs/checklist, commit focused changes. If native automation is still unavailable, report that check as open and have the user verify it; do not claim it passed.

Production release remains separate. This plan does not mark the earlier cover-search/native acceptance as passed merely because the current manager opens.


## Implementation evidence — 16 October

PublishDesk 1.2.1 source/bundle installed through --refresh. One scoped stylesheet and a 19-line layout helper shared by the two existing UI files; no framework or new dependencies. Each book is a labelled group, header controls belong to it, blurbs span the panel, and cover/date pending edits remain labelled after rerender. Modal bodies own list scrolling, with a separate footer; native pickers and existing command IDs persist. Native modal titles replace custom h2 titles. Other dialogs share the layout; post publication file details are collapsible. Normal importer/retry/pending-edit messages use polite status regions instead of error alerts. Existing settings, runtime preview notices and core handlers were otherwise retained.

Package inspection found a pre-existing setup.js error: modules['books-fetch', 'books-publish'] selected the publishing adapter due to the JavaScript comma operator. Corrected to modules['books-fetch']; an actual generated-bundle test now checks cover adapter exports, cover URL validation, shared layout and matching installed stylesheet. Fetch-provider logic was not modified.

Verification: 53 JavaScript cases passed in the full suite; the final focused run passed 18 cases including one additional bundle-mapping regression (54 distinct JS cases overall). All 38 Ruby cases passed, with 199 assertions. An isolated real-library Jekyll build and output/privacy checker passed. Both real bookshelf data files and publishing.js, preview.js and cleanup.js remain byte-identical to the pre-UI backup. Backups and test logs are under /private/tmp/publishdesk-ui-*. Feature publication, site data and vault settings were not changed by these UI checks.

Visual evidence comes from an isolated browser harness running actual books-ui.js/ui.js and styles.css against copied real library data, with a minimal native-control stand-in and the current theme stylesheet. It showed distinct panels, readable blurbs, no inner list scrollbar, footer visibility and no horizontal overflow at 520px, and light/dark inspection. It is NOT proof of Obsidian's actual modal sizing, focus traps or screen-reader behaviour. Native CUA observed the correct vault but its palette shortcut again produced no change. Native keyboard/theme/enlarged-text acceptance and the user's final walkthrough remain OPEN. Installed files require a PublishDesk plugin reload before the new interface appears. Screenshot: /private/tmp/publishdesk-ui-preview.png. No push or deployment.


Release acceptance update — 16 October: author reported the installed workflow works and authorized PR #5. The native agent-only automation checklist remains a recorded tooling limitation rather than a current release blocker. Live Bookshelf browser and deployment checks passed.
