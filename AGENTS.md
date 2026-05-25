# AGENTS.md

This file governs the entire `/Users/justin/workspace/rederive` repository.

## Project Identity

This project is `rederive`, a Cloudflare-backed website for publishing and reviewing structured `redo` cases.

- `rederive` is the site and parent brand.
- `redo` is the core content format, generation contract, and reading experience.
- The product is not a generic blog, AI article generator, or tutorial site.
- The core value is helping engineers retrace mature systems through constraints, candidate designs, trade-offs, technical debt, fixes, unresolved pain, and evidence.

## Required Reading

Before implementing product, architecture, data model, generation, or UI changes, read the relevant sections of:

- `docs/redo-site-prd-architecture.md`
- `docs/redo-site-ui-interaction-spec.md`

Use those documents as the source of truth for product scope, MVP boundaries, data model, generation workflow, quality gates, and the public case page interaction model.

## Default Stack

Unless the user explicitly changes direction, use these defaults:

- Package manager: `pnpm`
- Full-stack framework: React Router v7 / Remix-style routing on Cloudflare
- Runtime/deployment target: Cloudflare Workers or Cloudflare Pages with Worker bindings
- Database: Cloudflare D1
- Object storage: Cloudflare R2
- Async work: Cloudflare Workflows preferred, Cloudflare Queues acceptable behind an abstraction
- Admin protection: Cloudflare Access
- Public anti-abuse: Cloudflare Turnstile and rate limiting
- Styling: modern CSS/Tailwind-compatible component system, chosen after project scaffold is in place

Keep provider integrations behind adapters. Do not hard-code the business workflow to a single AI, search, paper-search, queue, or newsletter provider.

## Implementation Order

Follow the vertical slices in `docs/redo-site-prd-architecture.md`.
Track implementation status in `docs/implementation-issues.md`.

Default starting point:

1. Bootstrap the Cloudflare full-stack app.
2. Define the versioned `redo` generation contract and validators.
3. Add intake, admin identity, async generation skeleton, source/evidence flow, module review, publishing, then public reading surfaces.

Prefer demoable vertical slices over horizontal layer-only work. A slice should cut through schema, server behavior, UI, and tests when practical.

## Product Constraints

Preserve these decisions unless the user explicitly revises the product direction:

- Public users can read, subscribe, submit topic requests, and submit structured corrections/source additions.
- Public users cannot generate redo cases in MVP.
- Admin generation is asynchronous and staged.
- Generated content is stored as drafts first, then reviewed before publishing.
- Humans review, reject, request more sources, and trigger regeneration; humans do not directly edit generated body text in MVP.
- Published versions are immutable. Updates create new versions.
- The latest topic route points to the latest reviewed version; version routes are stable citation links.
- D1 stores workflow state, relational metadata, evidence snippets, and published JSON snapshots.
- R2 stores heavier artifacts such as source snapshots, PDFs, HTML snapshots, and generated social cards.
- The claim-evidence map is a core data structure, not a decorative source list.

## Generation Quality Gates

Do not bypass redo quality gates for speed.

Published content must enforce:

- General source discovery.
- Separate paper/design-doc discovery.
- Source triage and trust classification.
- Claim-to-evidence mapping.
- Explicit distinction between facts, inferences, and controversial judgments.
- Stage structure with concrete constraints and candidate options.
- Debt IDs that trace through stages, debt map, pain ranking, and causal chain.
- Module-level review and dependency invalidation.
- Hard publish blockers for unsupported factual claims, stale modules, missing required modules, broken debt IDs, and incomplete paper/design-doc coverage.

If implementation starts with fake providers or seeded data, keep the real gates and interfaces visible. Stubs must not weaken the contract.

## UI Direction

The first-class UI surface is the public case reading page.

Follow `docs/redo-site-ui-interaction-spec.md`:

- Build a structured engineering case experience, not a generic blog article.
- Prioritize the case page before polishing the homepage.
- Use a decision map, stage modules, debt chips, evidence markers, debt map, pain ranking, causal chain, and module-level sharing.
- Borrow Variant's scroll-native exploration principle, not its product positioning or visual skin.
- Motion should clarify relationships and state. Do not add decorative animation.
- The UI should feel premium, precise, dense but readable, and alive through meaningful interaction.
- Mobile must be a true single-column reading experience with compact navigation, not a squeezed desktop layout.

Avoid generic AI/SaaS visual patterns: purple-blue gradients, decorative blobs, marketing hero composition, card spam, and effects that compete with reading.

## Frontend Implementation Rules

- Use server rendering for published content where possible.
- Hydrate only interactive islands such as the decision map, debt focus, evidence drawer, share actions, and mobile navigator.
- Prefer `IntersectionObserver` for scroll spy behavior.
- Respect `prefers-reduced-motion`.
- Keep text readable and prevent overflow on mobile and desktop.
- Use stable anchors for shareable modules.
- Prefer established icon libraries once dependencies are present; do not hand-roll ad hoc icon sets.
- Include loading, empty, error, unavailable, and reduced-motion states for user-facing surfaces.

## Testing and Verification

Scale tests with risk, but do not leave core behavior untested.

Prioritize tests for:

- `redo` contract validators.
- Claim-evidence validation.
- Debt ID consistency.
- Module dependency invalidation.
- Publish gates.
- D1 repository behavior.
- Public latest/version route behavior.
- Case page rendering and module anchors.

For frontend work, verify responsive behavior for desktop and mobile. Check that decision maps, tables, debt maps, and share controls do not overflow.

If a test, lint, typecheck, or visual verification step cannot be run, state that clearly in the final response.

## What Not To Do

- Do not build a marketing-first landing page as the primary product surface.
- Do not add public generation in MVP.
- Do not add comments, public voting, user accounts, or a rich CMS unless the user reopens scope.
- Do not replace structured modules with free-form Markdown articles.
- Do not weaken source, paper, evidence, or review requirements to make generation easier.
- Do not store large source snapshots directly in D1.
- Do not couple the backend to a local Codex skill runtime. The website owns a versioned `redo` generation contract.
