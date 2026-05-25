# redo Case Page UI and Interaction Spec

Status: Draft for implementation
Date: 2026-05-23
Related product spec: `docs/redo-site-prd-architecture.md`

## 1. Purpose

This document defines the UI and interaction direction for the redo public case reading page. It turns the product idea into an implementable reading experience.

The case page is the product's proof surface. The homepage can attract readers, but the case page must prove that redo is different from a blog post, timeline, source walkthrough, or AI summary.

The page should help a reader do three things:

1. Build a fast mental model of why a mature system evolved.
2. Trace design consequences across stages, debt, pain points, and evidence.
3. Share precise modules without needing to screenshot manually.

## 2. Scope

### 2.1 In Scope

- Public case page layout.
- Decision map interaction.
- Stage reading flow.
- Debt ID cross-highlighting.
- Claim/evidence visibility.
- Module-level anchors and share actions.
- Social card entry points.
- Trust markers.
- Responsive behavior.
- Loading, empty, error, blocked, and version states.
- Visual system guidance for the case page.
- Implementation acceptance criteria.

### 2.2 Out of Scope

- Admin review UI details.
- Homepage full design.
- Method page full design.
- Question/pattern aggregation page full design.
- Generated social card visual templates beyond entry points.
- Final brand identity, logo, and domain lockup.

The public homepage and admin workbench should later reuse the same visual grammar: evidence tags, debt chips, stage rails, state labels, and crisp data modules.

## 3. Reference: Variant

Variant is useful as an interaction reference, not as a visual skin to copy.

References:

- Variant public site: https://variant.com/
- Third-party project page: https://www.snapp.world/project/variant
- Product listing reference: https://www.productcool.com/product/variant-2

The useful principle is scroll-native exploration:

- Scrolling is the primary act of discovery.
- Each viewport presents a complete, judgeable unit.
- The product reduces up-front explanation and quickly shows concrete output.
- Interaction should create a feeling of finding structure, not filling forms.

For redo, this translates to:

- The reader scrolls through the system's evolution, not a generic article.
- Each stage is a complete decision artifact.
- The sticky decision map keeps the global structure visible.
- Clicking a debt ID, stage, source, or claim reveals relationships across modules.
- Share actions are attached to modules, not only to the full page.

Do not copy:

- Infinite design-feed positioning.
- Generic generated-gallery behavior.
- Decorative motion for its own sake.
- Visual treatment that makes the page feel like a design tool instead of an engineering case file.

## 4. Design Direction

### 4.1 Experience Metaphor

The page should feel like opening a system evolution dossier:

- A decision map at the top.
- A traceable chain of constraints and consequences.
- Evidence and inference visible at the point of use.
- Debt and pain treated as first-class artifacts.
- Sharing built into each artifact.

The feeling should be:

- Premium.
- Precise.
- Dense but not crowded.
- Fluid but not playful.
- Analytical but not academic.
- Alive through meaningful highlighting and state transitions.

### 4.2 Wrong Directions

Avoid:

- Generic blog layout with a large article column and table of contents.
- Marketing landing page composition.
- Card-heavy dashboard aesthetics.
- Academic PDF imitation.
- Purple/blue AI gradients.
- Decorative orbit/blob backgrounds.
- Gratuitous animation.
- Visual effects that obscure text.
- Dense cockpit UI that makes reading tiring.

### 4.3 Design Values

1. Traceability over decoration.
2. Scannability before depth.
3. Cause-and-effect over chronology.
4. Module independence for sharing.
5. Evidence close to claims.
6. Motion only when it clarifies relationship or state.

## 5. Primary User Action

The most important action is not "read from top to bottom".

The primary action is:

> Understand the system's central trade-off, then trace one consequence through stages, debt, pain, and evidence.

The UI should make this path natural:

```text
central pressure
  -> stage decision
  -> debt introduced
  -> later mitigation or unresolved pain
  -> source/evidence boundary
  -> shareable module
```

## 6. Information Architecture

The case page should use this module order:

1. Case header and trust strip.
2. Decision map.
3. Orientation summary.
4. Evolution stages.
5. Throughline.
6. Transferable pattern.
7. Where the pattern stops.
8. Debt map.
9. Pain point ranking.
10. Causal chain.
11. Sources and inference notes.
12. Feedback and next case actions.

The page may visually place the orientation and decision map in the same first section, but the data model should keep them separate.

## 7. Desktop Layout

### 7.1 Breakpoint Assumption

Desktop layout applies at `lg` and above. Recommended content max width: 1360-1440px.

### 7.2 Page Frame

Use a three-zone structure:

```text
left rail        main reading column                  right map rail
metadata         stage/module content                 sticky decision map
version          option tables                        debt focus
source trust     diagrams                             module nav
```

Recommended proportions:

- Left rail: 180-220px.
- Main column: 720-840px.
- Right rail: 280-360px.
- Gutter: 24-32px.

If viewport is narrower than roughly 1180px, collapse the left rail into the header and keep only a compact right rail. If narrower than tablet, collapse the right rail into a sticky top or bottom navigator.

### 7.3 Left Rail

Purpose:

- Stable metadata and trust context.
- Version visibility.
- Source summary.
- Language/version switch entry.

Content:

- Topic name.
- Version number.
- Published date.
- Review status.
- Source count.
- Paper/design-doc count.
- Claim count.
- Inference count.
- Copy case link.
- Open version history.

Interaction:

- Trust items can open a lightweight popover explaining what they mean.
- Version history opens a drawer or dedicated section.
- On scroll, the left rail remains visible only if it does not compete with the right rail.

### 7.4 Main Column

Purpose:

- Primary reading flow.
- Each module is a complete shareable artifact.

Rules:

- Do not wrap every module in decorative cards.
- Use full-width bands, thin dividers, internal headers, and consistent rhythm.
- Use framed surfaces only for decision tables, maps, source evidence, and shareable artifacts.
- Keep paragraph line length near 60-75 characters in Chinese-equivalent density.
- Tables must be horizontally safe on mobile.

### 7.5 Right Rail

Purpose:

- Decision map.
- Reading progress.
- Current stage.
- Active debt focus.
- Jump links.

Desktop behavior:

- Sticky below top nav.
- Shows current section using scroll spy.
- Highlights active stage as reader scrolls.
- Shows debt IDs introduced/repayed in active stage.
- When a debt is selected, the rail switches into debt focus mode.

Right rail should not become a full second article. It is a map, not a summary column.

## 8. Mobile Layout

### 8.1 Mobile Principles

Mobile must not be a squeezed desktop layout. It should be a single-column reading experience with quick navigation.

Rules:

- No horizontal page scroll.
- Decision map becomes a compact navigator.
- Tables become stacked comparison blocks or horizontally scrollable only when the structure genuinely needs columns.
- Share controls collapse into an icon button with an action sheet.
- Evidence details open inline or in a bottom sheet.
- Sticky UI must not cover content.

### 8.2 Mobile Navigation

Use one of these patterns:

1. Sticky top segmented navigator:
   - Map.
   - Stages.
   - Debt.
   - Sources.
2. Sticky bottom mini navigator:
   - Current section label.
   - Progress indicator.
   - Open map button.
   - Share button.

Preferred MVP:

- Sticky top compact case nav after the first viewport.
- Bottom action sheet for module actions.

### 8.3 Mobile Decision Map

Collapsed map states:

- Closed: current stage and progress only.
- Open: full-screen or bottom-sheet map with stage list, debt IDs, and jump links.
- Debt focus: shows selected debt and related modules.

## 9. Visual System

### 9.1 Typography

Use a technical sans + mono pairing.

Recommended:

- UI/headings: Geist, Satoshi, or similar high-end sans.
- Numbers, IDs, source labels, and debt IDs: Geist Mono or JetBrains Mono.

Rules:

- No serif for case page UI.
- No oversized hero typography.
- Use weight, spacing, and structure for hierarchy.
- Letter spacing should be normal or slightly tight only for large headings if the font supports it.
- Avoid viewport-based font scaling.

### 9.2 Color

Use a restrained neutral base with one accent.

Recommended palette direction:

- Background: warm-neutral or zinc off-white, not pure white everywhere.
- Text: charcoal/zinc, not pure black.
- Borders: low-contrast neutral.
- Accent: a desaturated technical color, such as green, cyan, or amber.
- Debt/pain states can use semantic accents, but keep saturation controlled.

Avoid:

- Purple/blue AI gradient.
- Neon glows.
- One-note dark blue/slate.
- Overuse of red for every problem state.

Suggested semantic tokens:

- `fact`: neutral/blue-gray.
- `inference`: amber.
- `controversial`: rose or rust.
- `resolved`: green.
- `mitigated`: amber.
- `unresolved`: red/rust.
- `stale`: gray/amber.
- `active`: primary accent.

### 9.3 Surfaces

Use four surface levels:

1. Page background.
2. Reading band.
3. Structured artifact surface.
4. Floating overlay/drawer.

Structured artifact surfaces:

- Option tables.
- Debt map.
- Causal chain.
- Source evidence panel.
- Decision map.
- Share card preview.

Border radius:

- Most UI: 6-8px.
- Large panels: 10-12px only when needed.
- Avoid pill overuse except for compact state tags and debt IDs.

### 9.4 Icons

Use icons for:

- Copy link.
- Share.
- Open evidence.
- Jump.
- Expand/collapse.
- Source.
- Version.
- Warning/blocker.

Prefer lucide or another existing icon library once dependencies are chosen. Do not draw ad hoc SVG icon sets unless there is a clear reason.

### 9.5 Motion

Motion intensity: moderate.

Allowed:

- Scroll-spy highlight transitions.
- Debt focus cross-highlighting.
- Expand/collapse transitions.
- Drawer/bottom-sheet transitions.
- Copy/share success feedback.
- Staggered entrance for first-load decision map.
- Source evidence reveal.

Avoid:

- Background animation loops.
- Floating decorative elements.
- Large parallax that competes with reading.
- Animating layout dimensions on scroll.
- Cursor effects.

Technical rules:

- Animate `transform` and `opacity`.
- Prefer CSS transitions for MVP.
- If using a motion library later, isolate interactive components.
- Respect `prefers-reduced-motion`.

## 10. Core Components

### 10.1 Case Header

Purpose:

- Establish topic, promise, and trust in the first 10 seconds.

Content:

- Topic display name.
- Category.
- What it is.
- Central pressure.
- Trade-off theme.
- One-sentence version.
- Review/trust strip.

Layout:

- Asymmetric, not centered.
- Main claim on the left.
- Compact trust/version panel on the right or below on mobile.
- Hint of decision map below first viewport.

Interactions:

- Copy case link.
- Open version history.
- Switch language if available.
- Trust popovers.

### 10.2 Trust Strip

Content:

- Reviewed.
- Version.
- Published date.
- Sources.
- Papers/design docs.
- Claims.
- Inferences.

Behavior:

- Each trust item has a short explanation on hover/focus.
- Clicking sources jumps to Sources module.
- Clicking inferences jumps to Inference Notes.

### 10.3 Decision Map

Purpose:

- Give a compact system-level map before deep reading.
- Stay useful throughout the page.

Content:

- Stage list with numbers and short names.
- Active stage.
- Debt IDs per stage.
- Debt status summary.
- Pain ranking top 3.
- Current focus mode.

Interaction states:

1. Default map:
   - Shows stage sequence and debt markers.
2. Scroll-linked map:
   - Active stage changes as reader scrolls.
3. Debt focus:
   - Selected debt ID highlights related stage, debt map row, pain row, and causal chain segment.
4. Source focus:
   - Selected claim/source highlights modules using that claim.
5. Compact mobile map:
   - Opens as bottom sheet or full-screen drawer.

Rules:

- Decision map must never obscure content.
- It should be readable at a glance.
- It should not duplicate every paragraph.
- Stage labels must stay short.

### 10.4 Orientation Module

Content:

- What the system is.
- Central pressure.
- Repeated trade-off theme.
- One-sentence version.

Layout:

- Use a two-column structure on desktop:
  - Left: concise prose.
  - Right: compressed "pressure -> trade-off -> debt" diagram.
- Collapse to one column on mobile.

### 10.5 Stage Module

Each stage is the main repeatable unit.

Content:

- Stage number.
- Stage title.
- Period/versions.
- Constraint.
- Option table.
- Key trade-off.
- Debt introduced.
- Debt repaid or mitigated if applicable.
- Claim/evidence links.
- Share actions.

Layout:

- Header band with stage number and period.
- Constraint as a short, emphasized block.
- Option table as structured artifact.
- Key trade-off as a concise callout.
- Debt IDs as clickable chips.
- Evidence markers near claims.

Option table rules:

- At least two rejected options and one chosen option.
- Chosen row is visually distinct but not celebratory.
- Columns: Option, Cost, Why it did or did not win.
- On mobile, table can become stacked option blocks:
  - Option name.
  - Cost.
  - Decision reason.
  - Chosen/rejected state.

### 10.6 Debt Chip

Purpose:

- Make consequences traceable.

Visual:

- Mono label like `D3`.
- Compact state color.
- Tooltip with debt summary.

Interactions:

- Click toggles debt focus mode.
- Focus mode highlights:
  - originating stage.
  - later mitigation/resolution stage.
  - debt map row.
  - causal chain segment.
  - related pain point if any.
- Escape or clear button exits focus mode.

### 10.7 Evidence Marker

Purpose:

- Keep sources close to claims without cluttering reading.

Visual:

- Compact marker such as `S4` or `source`.
- Claim type tag:
  - fact.
  - inference.
  - controversial.

Interaction:

- Hover/focus opens short evidence popover on desktop.
- Click opens evidence drawer.
- Mobile opens bottom sheet.

Evidence drawer content:

- Claim.
- Claim type.
- Confidence.
- Source title.
- Source type.
- Locator.
- Short excerpt.
- Used in modules.
- Link to full source if public.

### 10.8 Throughline Module

Purpose:

- Name the recurring design philosophy.

Content:

- One paragraph.
- Cost sentence.
- Repeated choice table.
- Design-review sentence.

Visual:

- Treat the design-review sentence as a shareable artifact.
- Keep the table tight and readable.

### 10.9 Transferable Pattern Module

Purpose:

- Help readers generalize the mechanism.

Content:

- Pattern explanation.
- Sibling systems table.
- Shared constraint.
- Different price.

Interaction:

- Related systems link to existing cases when available.
- If a case is not yet published, show it as a future topic/request link.

### 10.10 Boundary Module

Purpose:

- Prevent overgeneralization.

Content:

- Counterexamples.
- Why opposite choice is rational.
- Boundary rule.

Visual:

- Boundary rows should feel like a design review checklist.
- Use caution styling, not error styling.

### 10.11 Debt Map Module

Purpose:

- Signature redo artifact.

Structure:

- Resolved debt.
- Mitigated debt.
- Unresolved debt.

Visual:

- Use a matrix/table hybrid.
- Debt IDs remain visible while scanning rows.
- Status colors are semantic but restrained.
- Rows should be shareable as a module.

Interactions:

- Click debt ID enters debt focus.
- Click stage reference jumps to stage.
- Hover row highlights related stage and causal chain segment.
- Copy module link.
- Open debt map social card.

### 10.12 Pain Ranking Module

Purpose:

- Translate architectural debt into today's user pain.

Content:

- Rank.
- Pain point.
- One-line explanation.
- Competitive attack angle.

Visual:

- Ranks are prominent but not huge.
- Present-day symptom should be most readable.
- Competitive angle should be visibly secondary.

Interaction:

- Related debt chips focus corresponding debt.
- Share top pain or full ranking.

### 10.13 Causal Chain Module

Purpose:

- Make the history memorable.

Visual:

- Render as readable story map, not just monospace text if possible.
- Preserve a text fallback.
- Stages and debts are clickable.

Interactions:

- Click stage jumps to stage.
- Click debt enters debt focus.
- Hover segment highlights source modules.

### 10.14 Sources and Inference Module

Purpose:

- Make trust auditable without turning the page into an internal log.

Content:

- Source groups:
  - Papers.
  - Design docs/proposals.
  - Official docs.
  - Release notes.
  - Maintainer/engineering posts.
  - Secondary context.
- Inference notes.
- Uncertainty notes.
- Controversial judgments.

Interaction:

- Filter by source type.
- Expand source to see supported claims.
- Jump from claim to modules where used.

### 10.15 Module Action Bar

Every major module should expose actions:

- Copy link.
- Copy summary.
- Share image.
- Submit correction/source.

Desktop:

- Actions appear in module header or on hover/focus.
- Avoid hidden-only interactions; keyboard users must reach them.

Mobile:

- One action button opens action sheet.

Success feedback:

- Copy action shows compact confirmation.
- Share image opens card preview or direct asset.

## 11. Interaction Model

### 11.1 Scroll Spy

Behavior:

- As the reader scrolls, current module and stage update in the decision map.
- The active stage marker should move smoothly.
- URL hash may update only when the user explicitly clicks a module link, not constantly during scroll.

Acceptance:

- Scrolling does not cause layout shift.
- Reduced motion users get state changes without animated movement.

### 11.2 Debt Focus Mode

Entry:

- Click any debt chip.
- Click a debt map row.
- Click a causal chain debt reference.

State:

- Selected debt appears in decision map.
- Related modules are highlighted.
- Non-related debt chips become visually quieter.
- A clear focus action is visible.

Exit:

- Click clear.
- Press Escape.
- Click another debt.
- Navigate to another module if focus context no longer applies.

Acceptance:

- The selected debt is visible in at least two places: current content and map.
- Focus state is reflected in URL hash or query only if this helps shareability. MVP can keep it as UI state.

### 11.3 Evidence Focus Mode

Entry:

- Click source marker.
- Click claim in Sources module.

State:

- Evidence drawer opens.
- Current claim is shown with source and confidence.
- Modules using the claim are listed.

Acceptance:

- The drawer can be closed with Escape.
- Drawer is accessible by keyboard.
- Source links open safely.

### 11.4 Module Sharing

Entry:

- Click module share button.

Actions:

- Copy module link.
- Copy module summary.
- Open share image.
- Submit correction/source.

Acceptance:

- Each module has a stable anchor.
- Copy uses canonical latest URL for casual pages and immutable version URL on version pages.
- Share image links to a generated asset when available.
- If no image exists yet, show a graceful unavailable state.

### 11.5 Version Awareness

Behavior:

- Latest route shows a small "latest version" label.
- Immutable route shows fixed version label.
- If a newer version exists while viewing an older immutable version, show a non-blocking notice.

Acceptance:

- The reader can understand whether they are viewing latest or historical content.
- Immutable version pages do not silently redirect.

## 12. Key States

### 12.1 Loading

Use skeletons shaped like the eventual layout:

- Header skeleton.
- Trust strip skeleton.
- Decision map skeleton.
- Stage block skeleton.

Avoid generic spinners for page-level loading.

### 12.2 Empty Case

If no published case exists:

- Show topic name if known.
- Explain that no reviewed redo case is published yet.
- Offer topic request/subscription action.
- Do not show admin/generation language to public readers.

### 12.3 Missing Module

Published snapshots should not normally miss required modules. If a non-critical optional module is missing:

- Show a compact unavailable state.
- Do not break page rendering.
- Log the issue.

### 12.4 Source Unavailable

If a source URL is unavailable:

- Keep source metadata.
- Show retrieved date and snapshot availability if allowed.
- Do not remove the source row.

### 12.5 Share Image Unavailable

If a share image failed generation:

- Keep copy link and copy summary.
- Show "share image unavailable" in plain language.
- Do not block reading.

### 12.6 Error

Public error states:

- Clear explanation.
- Retry where useful.
- Link back to cases.

No stack traces or provider details.

### 12.7 Reduced Motion

If `prefers-reduced-motion` is enabled:

- Disable animated map movement.
- Disable reveal transitions.
- Keep instant state highlights.
- Keep focus modes functional.

## 13. Accessibility

Requirements:

- All interactive chips are buttons or links with accessible names.
- Debt focus mode can be operated by keyboard.
- Evidence drawer traps focus while open and returns focus on close.
- Color is never the only state indicator.
- Tables have meaningful headers.
- Mobile bottom sheet is accessible.
- Copy/share success messages are announced politely.
- Contrast targets WCAG AA.
- Anchor navigation accounts for sticky headers.

## 14. Responsive Acceptance Criteria

Desktop:

- Right decision map remains sticky and readable.
- Main content line length is comfortable.
- Stage tables do not exceed their container.

Tablet:

- Left metadata collapses into header.
- Decision map can remain right rail or become top drawer depending width.

Mobile:

- Single column.
- No horizontal page scroll.
- Option tables remain understandable.
- Module action bar collapses.
- Evidence and map use bottom sheets or inline disclosure.
- Sticky navigation does not cover headings or action bars.

## 15. Performance Rules

The case page can contain many modules, tables, and references. Keep it light.

Rules:

- Server-render published snapshot content.
- Avoid client-rendering the full article unless necessary.
- Hydrate only interactive islands:
  - decision map.
  - debt focus.
  - evidence drawer.
  - share actions.
  - mobile nav.
- Use CSS for simple transitions.
- Avoid scroll listeners that update React state on every frame.
- Prefer IntersectionObserver for scroll spy.
- Virtualization is not needed for MVP unless cases become much larger than expected.
- Do not animate expensive layout properties.

## 16. MVP Interaction Requirements

Must ship in MVP:

1. Responsive case header.
2. Trust strip.
3. Decision map with section/stage navigation.
4. Scroll spy active section/stage.
5. Stage modules with option table.
6. Clickable debt chips.
7. Debt focus highlighting across visible modules.
8. Debt map module.
9. Pain ranking module.
10. Causal chain module.
11. Sources/inference module.
12. Stable anchors.
13. Copy module link.
14. Copy module summary.
15. Share image entry point.
16. Feedback/source correction action.
17. Mobile map drawer or compact navigator.
18. Loading and error states.

Can defer:

1. Advanced animated causal-chain rendering.
2. Source filter UI.
3. Full version comparison.
4. Persistent debt focus in URL.
5. Keyboard shortcuts.
6. Inline social card preview.
7. Rich related-case previews.

## 17. Component Inventory

Initial public case components:

- `CasePage`
- `CaseHeader`
- `TrustStrip`
- `DecisionMap`
- `MobileCaseNavigator`
- `ModuleShell`
- `ModuleActionBar`
- `OrientationModule`
- `StageModule`
- `OptionDecisionTable`
- `DebtChip`
- `EvidenceMarker`
- `EvidenceDrawer`
- `ThroughlineModule`
- `TransferablePatternModule`
- `BoundaryModule`
- `DebtMapModule`
- `PainRankingModule`
- `CausalChainModule`
- `SourcesModule`
- `FeedbackAction`
- `VersionNotice`

Implementation rule:

- Keep layout components mostly server-rendered.
- Keep interactive components as isolated client islands.
- Do not introduce global state unless debt/evidence focus becomes too hard to pass through local context.

## 18. Sample Interaction Walkthrough

Reader opens `/zh/cases/kafka`.

1. Header shows Kafka, central pressure, trade-off theme, trust markers.
2. Reader scans the decision map and sees stages plus debt IDs.
3. Reader clicks `D2` in Stage 2.
4. Decision map enters debt focus mode.
5. The originating stage, related debt map row, related pain ranking item, and causal chain segment are highlighted.
6. Reader opens the source marker attached to the stage claim.
7. Evidence drawer shows the source, excerpt, locator, confidence, and modules using the claim.
8. Reader copies the debt map module link.
9. Reader opens the share image for the pain ranking.
10. Reader submits a source correction tied to `#stage-2`.

This is the core redo reading loop.

## 19. Implementation Acceptance Checklist

Before considering the case page UI ready:

- [ ] First viewport communicates topic, central pressure, trade-off theme, and trust.
- [ ] Reader can jump from decision map to any stage.
- [ ] Reader can identify the current stage while scrolling.
- [ ] Debt IDs are clickable and traceable across modules.
- [ ] Evidence markers are visible but not noisy.
- [ ] Sources and inference boundaries are accessible.
- [ ] Module anchors work.
- [ ] Module share actions work.
- [ ] Mobile page has no horizontal overflow.
- [ ] Tables are readable on mobile.
- [ ] Loading, empty, error, and share-unavailable states exist.
- [ ] Reduced motion mode remains usable.
- [ ] No decorative motion competes with reading.
- [ ] The UI feels like a structured engineering case, not a blog.

## 20. Open Questions for Implementation

These can be resolved during Slice 15 implementation:

1. Whether debt focus should update the URL in MVP.
2. Whether the right rail should show top pain points at all times or only above the fold.
3. Whether evidence drawer is a side drawer on desktop or inline popover plus full drawer.
4. Which exact icon library will be used after package setup.
5. Whether social card preview opens inline, in a modal, or as a new asset URL.
6. Whether Chinese case typography needs separate tuning after real content is seeded.
