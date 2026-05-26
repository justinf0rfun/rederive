# Implementation Issues

Status: Active local tracker
Source spec: `docs/redo-site-prd-architecture.md`
UI spec: `docs/redo-site-ui-interaction-spec.md`

This file tracks implementation as local markdown issues until a real issue tracker is configured. Keep it in sync as work lands.

## Status Legend

- `todo`: not started
- `doing`: actively being worked on
- `blocked`: cannot proceed without a decision, credential, provider, or dependency
- `review`: implementation done, waiting for review or verification
- `done`: merged/accepted and verified

## Board

| ID | Status | Type | Issue | Blocked By |
|---|---|---|---|---|
| RDR-001 | done | AFK | Bootstrap Cloudflare full-stack app | None |
| RDR-002 | done | AFK | Define redo contract and validators | RDR-001 |
| RDR-003 | done | AFK | Public topic request intake | RDR-001 |
| RDR-004 | done | HITL | Cloudflare Access admin identity | RDR-001 |
| RDR-005 | done | AFK | Admin topic pool to generation run | RDR-003, RDR-004 |
| RDR-006 | done | AFK | Async generation orchestrator skeleton | RDR-005 |
| RDR-007 | done | AFK | Source discovery and source corpus review | RDR-006 |
| RDR-008 | done | AFK | Paper and design-doc discovery gate | RDR-007 |
| RDR-009 | done | AFK | Claim-evidence map | RDR-007, RDR-008 |
| RDR-010 | done | AFK | Stage outline and orientation generation | RDR-002, RDR-009 |
| RDR-011 | done | AFK | Stage module generation and review | RDR-010 |
| RDR-012 | done | AFK | Debt map, pain ranking, pattern, boundary, and causal chain | RDR-011 |
| RDR-013 | done | AFK | Module review actions and dependency invalidation | RDR-010, RDR-011, RDR-012 |
| RDR-014 | done | AFK | Hard QA and immutable publish | RDR-013 |
| RDR-015 | done | AFK | Public case page | RDR-014 |
| RDR-016 | done | AFK | Homepage, method, question, and pattern pages | RDR-014 |
| RDR-017 | done | AFK | Structured feedback and source correction flow | RDR-015 |
| RDR-018 | done | AFK | Social card generation | RDR-014 |
| RDR-019 | done | AFK | Subscription capture | RDR-001 |
| RDR-020 | done | AFK | Seed benchmark case and end-to-end demo | RDR-002, RDR-014, RDR-015, RDR-016 |
| RDR-021 | blocked | HITL | Production readiness pass | RDR-001 through RDR-020 |
| RDR-022 | done | AFK | Upgrade generation orchestration to Cloudflare Workflows | RDR-006, RDR-014 |
| RDR-023 | done | AFK | Migrate redo skill prompt into versioned generation prompts | RDR-006, RDR-022 |
| RDR-024 | done | AFK | Import local redo skill bundles as reviewable drafts | RDR-014, RDR-023 |

## Recommended Execution Order

1. RDR-001, RDR-002
2. RDR-003, RDR-004, RDR-005, RDR-006
3. RDR-007, RDR-008, RDR-009
4. RDR-010, RDR-011, RDR-012, RDR-013
5. RDR-014
6. RDR-015, RDR-016
7. RDR-017, RDR-018, RDR-019
8. RDR-020
9. RDR-021
10. RDR-022 when staged generation complexity justifies durable workflow execution.
11. RDR-023 before wiring real AI/search provider adapters.
12. RDR-024 when local redo skill remains the primary authoring path.

## RDR-001: Bootstrap Cloudflare Full-Stack App

Status: done
Type: AFK
Blocked by: None

Build the initial React Router v7 / Remix-style Cloudflare app with public and admin route groups, local development scripts, and placeholder bindings for D1, R2, async work, Turnstile, and provider secrets.

Acceptance criteria:

- [x] App runs locally with `pnpm`.
- [x] Public route renders.
- [x] Admin route group exists.
- [x] D1 migration/version check exists.
- [x] A server loader/action can read/write D1 in local dev.
- [x] Deployment config includes placeholders for D1, R2, Workflows/Queues, Turnstile, and provider secrets.
- [x] README or setup notes explain local dev commands.

Notes:

- Default to fake/local bindings where production credentials are not available.
- Do not block scaffold work on real provider keys.

## RDR-002: Define redo Contract and Validators

Status: done
Type: AFK
Blocked by: RDR-001

Add the versioned redo generation contract, schemas, and validators for snapshots, stages, debt maps, sources, inference notes, and claim-evidence maps.

Acceptance criteria:

- [x] Contract version is explicit.
- [x] Valid sample case passes validation.
- [x] Missing stage options fail validation.
- [x] Broken debt ID references fail validation.
- [x] Unsupported factual claims fail validation.
- [x] Validator output separates hard blockers from warnings.
- [x] Unit tests cover contract-critical failure modes.

Notes:

- Stubs must preserve the real quality gates.
- This is the foundation for generation, review, publish, and UI rendering.

## RDR-003: Public Topic Request Intake

Status: done
Type: AFK
Blocked by: RDR-001

Build `/zh/submit-topic` and the topic request action/API. Store topic text, reason, optional email, optional source links, locale, and anti-abuse metadata in D1.

Acceptance criteria:

- [x] Public user can submit a topic request.
- [x] Invalid URLs are rejected.
- [x] Overlong text is rejected.
- [x] Turnstile hook exists and is bypassable only in local/test.
- [x] Topic request rows are visible from a basic admin list.

## RDR-004: Cloudflare Access Admin Identity

Status: done
Type: HITL
Blocked by: RDR-001

Protect `/admin` and `/admin/*` with Cloudflare Access in deployed environments and provide safe local mock identity for development.

Acceptance criteria:

- [x] Admin routes require Cloudflare Access in staging/production.
- [x] Server actions can read reviewer email.
- [x] Admin identity is written to audit log.
- [x] Local mock identity cannot accidentally be enabled in production.

Human input needed:

- [x] Confirm allowed admin email/domain in Cloudflare Access.

Notes:

- Local mock identity is implemented as `local-admin@rederive.dev` for non-production environments.
- Production reads `Cf-Access-Authenticated-User-Email` and optionally enforces `ALLOWED_ADMIN_EMAILS`.
- Access application `rederive-admin-allow` protects `rederive.io/admin` and `rederive.io/admin/*`; policy allows `mxtsing@gmail.com`.

## RDR-005: Admin Topic Pool to Generation Run

Status: done
Type: AFK
Blocked by: RDR-003, RDR-004

Let an admin normalize or select a topic request cluster and create a generation run with topic, language, scope, and contract version.

Acceptance criteria:

- [x] Admin can create a topic if none exists.
- [x] Admin can start a generation run from a topic request.
- [x] Run is stored with `queued` status.
- [x] Audit log records who started the run.
- [x] Dashboard shows the run.

## RDR-006: Async Generation Orchestrator Skeleton

Status: done
Type: AFK
Blocked by: RDR-005

Implement the async orchestrator that advances a generation run through step records, initially using deterministic fake outputs.

Acceptance criteria:

- [x] Starting a run enqueues or starts async work.
- [x] `generation_steps` are created and updated.
- [x] Step failures set run status to `failed` with error details.
- [x] Admin can retry a failed step.
- [x] Admin timeline reads from D1 state.
- [x] The orchestrator abstraction does not leak a specific Cloudflare primitive into domain logic.

Notes:

- MVP should start with a Cloudflare Queue adapter because it is simpler and already represented in `wrangler.jsonc`.
- Keep the orchestration interface durable-step-shaped so RDR-022 can replace or augment Queue execution with Cloudflare Workflows later.

## RDR-023: Migrate redo Skill Prompt into Versioned Generation Prompts

Status: done
Type: AFK
Blocked by: RDR-006, RDR-022

Move the mature redo skill prompt from local skill runtime context into the website as a versioned generation prompt asset, without making the deployed Worker depend on local skill files.

Acceptance criteria:

- [x] Prompt version is explicit and importable by provider adapters.
- [x] Prompt source is recorded for traceability.
- [x] Core redo rules are preserved: evidence requirements, separate paper/design-doc discovery, stage decision pressure, candidate options, debt IDs, debt map, pain ranking, causal chain, sources, style, and QA gate.
- [x] Generation steps record prompt metadata in their output.
- [x] Tests fail if core prompt requirements are accidentally removed.

Notes:

- The deployed site does not call the local `redo` skill. It stores a synchronized prompt asset under `app/domain/generation-prompts/`.
- Future provider adapters should call `buildRedoPromptForStep` and persist the returned `promptVersion` with generated artifacts.

## RDR-024: Import Local redo Skill Bundles as Reviewable Drafts

Status: done
Type: AFK
Blocked by: RDR-014, RDR-023

Support the revised MVP production model: humans generate high-depth redo content locally with the mature redo skill, then import a structured `redo_bundle_v1` into the website for validation, module review, immutable publishing, and distribution.

Acceptance criteria:

- [x] `redo_bundle_v1` schema is explicit and validates against the published redo contract.
- [x] Bundles record `sourceMode=local_redo_skill` and `promptVersion`.
- [x] Admin can upload/paste redo Markdown or paste bundle JSON from `/admin`.
- [x] Import creates a generation run in `ready_for_review`.
- [x] Import stores sources, paper/design-doc coverage, claim-evidence map, draft modules, and source notes.
- [x] Publish still requires module approval and existing hard gates.
- [x] Tests reject bundles that remove required paper/design-doc coverage.

Notes:

- Public users still only submit topic requests and structured feedback.
- This path intentionally avoids provider dependency for MVP content production.
- Markdown import normalizes non-contract debt IDs such as `D3b` and `D2-4` instead of weakening the published contract.
- Future AI provider integration can remain additive instead of replacing the local authoring workflow.

## RDR-007: Source Discovery and Source Corpus Review

Status: done
Type: AFK
Blocked by: RDR-006

Add source discovery adapter interfaces and a first implementation path combining fake/automated results with submitted/manual URLs. Store source metadata and snapshot pointers.

Acceptance criteria:

- [x] Source discovery step stores candidate sources.
- [x] Sources are classified by type and trust level.
- [x] R2 object keys can be attached for snapshots.
- [x] Admin can inspect source list.
- [x] Admin can reject low-quality sources.
- [x] Run can be blocked when source count or trust is insufficient.

## RDR-008: Paper and Design-Doc Discovery Gate

Status: done
Type: AFK
Blocked by: RDR-007

Implement a separate paper/design-doc discovery step and hard quality gate.

Acceptance criteria:

- [x] Papers/design docs are tracked separately from general sources.
- [x] Admin sees paper/design-doc coverage.
- [x] QA fails if the step was skipped.
- [x] QA blocks publication if expected coverage is missing.
- [x] Admin can request more sources from this step.

## RDR-009: Claim-Evidence Map

Status: done
Type: AFK
Blocked by: RDR-007, RDR-008

Create the claim-evidence map: claims, evidence snippets, claim type, confidence, module usage, and support links.

Acceptance criteria:

- [x] Factual claims require evidence.
- [x] Inference claims require basis claims.
- [x] Controversial judgments can be represented.
- [x] Admin can inspect claims per source and per module.
- [x] Unsupported factual claims are hard blockers.

## RDR-010: Stage Outline and Orientation Generation

Status: done
Type: AFK
Blocked by: RDR-002, RDR-009

Generate orientation and stage outline modules from evidence using the redo contract.

Acceptance criteria:

- [x] Orientation includes what it is, central pressure, and trade-off theme.
- [x] Stage outline uses engineering decision pressure, not just chronology.
- [x] Mature topics target 7-9 stages or justify deviation.
- [x] Admin can approve/reject orientation and outline modules.
- [x] Rejecting outline marks dependent modules stale.

## RDR-011: Stage Module Generation and Review

Status: done
Type: AFK
Blocked by: RDR-010

Generate each stage module with constraint, option table, chosen option, key trade-off, debt introduced, and claim links.

Acceptance criteria:

- [x] Each stage has at least two rejected options and one chosen option.
- [x] Chosen option explains why it was rational under the constraint.
- [x] Debts introduced have clean IDs.
- [x] Claims are linked to evidence or inference notes.
- [x] Admin can review each stage separately.
- [x] Rejecting one stage allows targeted regeneration.

## RDR-012: Debt Map, Pain Ranking, Pattern, Boundary, and Causal Chain

Status: done
Type: AFK
Blocked by: RDR-011

Generate downstream analytical modules and validate cross-module consistency.

Acceptance criteria:

- [x] Debt map includes resolved, mitigated, and unresolved tables.
- [x] Debt IDs are traceable to stages.
- [x] Pain ranking uses present-day symptoms.
- [x] Competitive attack angles are trade-off-aware.
- [x] Transferable pattern compares mechanisms, not categories.
- [x] Boundary section includes counterexamples where appropriate.
- [x] Causal chain references existing stages and debt IDs.

## RDR-013: Module Review Actions and Dependency Invalidation

Status: done
Type: AFK
Blocked by: RDR-010, RDR-011, RDR-012

Implement approve, reject, request-more-sources, regenerate, and stale propagation for modules.

Acceptance criteria:

- [x] Approved module status is persisted.
- [x] Rejected module requires reason.
- [x] Regenerate action enqueues module regeneration.
- [x] Changing upstream modules marks downstream modules stale.
- [x] Stale modules block publication.
- [x] Audit log records all review actions.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local admin action E2E: reject without reason returned 400; rejecting `stage_2` marked downstream analytical modules stale; advancing the run blocked with `draft_modules_blocked`; request-more-sources and regenerate actions wrote `module_reviews` and `audit_log` rows with queue dispatch metadata.

## RDR-014: Hard QA and Immutable Publish

Status: done
Type: AFK
Blocked by: RDR-013

Implement publish preflight, immutable version creation, latest topic pointer update, and revision notes.

Acceptance criteria:

- [x] Publish fails if any hard gate fails.
- [x] Publish fails if any core module is not approved.
- [x] Publish creates `content_json` snapshot.
- [x] Published version number increments.
- [x] Latest topic pointer updates.
- [x] Immutable version route can fetch the snapshot.
- [x] Audit log records publication.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local admin publish E2E: blocked publish returned the preflight blocker UI; approving all modules created `published_versions` v1 with immutable `content_json`; the generation run moved to `published`; `/zh/cases/:slug` and `/zh/cases/:slug/v/:id` returned 200 from the snapshot.

## RDR-015: Public Case Page

Status: done
Type: AFK
Blocked by: RDR-014

Render the published case page from `published_versions.content_json` with decision map, modules, trust markers, anchors, and share actions.

Acceptance criteria:

- [x] `/zh/cases/:slug` renders latest version.
- [x] `/zh/cases/:slug/v/:id` renders immutable version.
- [x] Decision map links to stages, debts, and modules.
- [x] Scroll spy marks active section/stage.
- [x] Debt chips can focus related modules.
- [x] Module anchors work.
- [x] Trust markers show source count, paper/design-doc count, review status, and version.
- [x] Page is responsive and readable on mobile and desktop.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local route checks: latest and immutable routes returned 200; HTML includes decision map, debt focus, evidence claims, trust markers, stable claim/stage anchors, and source/inference sections.

Note:

- Browser screenshot tooling was not available in the current toolset and Playwright is not installed in the repo. The page uses responsive Tailwind breakpoints and was verified through SSR route output and production build.

## RDR-016: Homepage, Method, Question, and Pattern Pages

Status: done
Type: AFK
Blocked by: RDR-014

Build public discovery surfaces using published content metadata.

Acceptance criteria:

- [x] Homepage prioritizes design questions.
- [x] Featured cases render from published data.
- [x] Method page explains redo.
- [x] Question pages list related cases/modules.
- [x] Pattern pages list shared mechanisms and boundaries.
- [x] Empty states are professional and do not imply missing functionality.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local route checks: `/zh`, `/zh/method`, `/zh/questions/stage-1`, and `/zh/patterns/focused-boundary-before-broad-rewrite` returned 200 and rendered published-data sections.

## RDR-017: Structured Feedback and Source Correction Flow

Status: done
Type: AFK
Blocked by: RDR-015

Add module-level correction/source submission from public pages and admin review for feedback items.

Acceptance criteria:

- [x] Feedback can be tied to topic, version, and module anchor.
- [x] Feedback type is structured.
- [x] Optional source links are stored.
- [x] Admin can view feedback.
- [x] Admin can create a follow-up source request or generation run from feedback.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local E2E: case page exposes correction/source links; `/zh/feedback` loads with version/module context; POST stores `feedback_items` with source links; admin lists the feedback; admin follow-up action creates a queued generation run with feedback scope and marks the feedback `queued_follow_up`.

## RDR-018: Social Card Generation

Status: done
Type: AFK
Blocked by: RDR-014

Generate and store core share cards for case cover, one-sentence version, causal chain, debt map, and pain ranking.

Acceptance criteria:

- [x] Social card jobs run after publish.
- [x] Images are stored in R2.
- [x] `social_cards` rows store public URLs and metadata.
- [x] Case page share actions reference generated cards.
- [x] OG metadata uses cover card.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local E2E: publishing v2 generated five `social_cards` rows, wrote SVG assets to R2, served `/api/social-cards/:id` with immutable cache headers, and rendered case page `og:image` plus `Open share image`.

## RDR-019: Subscription Capture

Status: done
Type: AFK
Blocked by: RDR-001

Capture newsletter subscriptions without committing to a provider integration.

Acceptance criteria:

- [x] Public subscribe form stores email and locale.
- [x] Duplicate emails are handled.
- [x] Confirmation state is shown.
- [x] Admin can export or list subscribers.
- [x] Future provider integration point is documented.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Local E2E: `/zh` subscribe form rendered; invalid email showed validation; first valid subscribe stored `rdr019-reader@example.com`; duplicate subscribe showed the duplicate confirmation; admin listed the subscriber; `docs/subscription-provider-adapter.md` documents the future provider sync point.

## RDR-020: Seed Benchmark Case and End-to-End Demo

Status: done
Type: AFK
Blocked by: RDR-002, RDR-014, RDR-015, RDR-016

Create a seeded, reviewed demo case snapshot so the public UI and publish flow can be verified before the full generation pipeline is production-ready.

Acceptance criteria:

- [x] Seed case validates against contract.
- [x] Seed case can be inserted into D1.
- [x] Public latest and immutable routes render it.
- [x] Homepage/question/pattern pages include it.
- [x] End-to-end test covers the reader path.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Added seed validation test covering redo contract and public reader paths.
- Local E2E: admin `seed-benchmark-case` inserted Kafka `version-kafka-1`; `/zh/cases/kafka`, `/zh/cases/kafka/v/version-kafka-1`, `/zh`, `/zh/questions/why-logs-become-core-abstractions`, `/zh/patterns/log-as-shared-durable-history`, and `/api/social-cards/version-kafka-1-cover` returned 200 and rendered the expected seed content.

## RDR-021: Production Readiness Pass

Status: blocked
Type: HITL
Blocked by: RDR-001 through RDR-020

Run a release readiness pass across security, QA gates, visual quality, Cloudflare bindings, provider secrets, and first content candidates.

Acceptance criteria:

- [ ] Staging deployment works.
- [x] Admin Access policy is configured.
- [x] D1 migrations run cleanly.
- [x] R2 writes work.
- [x] Workflow binding type generation works locally; Queue fallback dispatch is tested.
- [x] Hard QA gates are tested.
- [ ] Public pages pass responsive visual review.
- [ ] First launch case list is approved.

Notes:

- Local readiness evidence and production smoke checklist are documented in `docs/production-readiness.md`.
- Remaining unchecked items require real Cloudflare production/staging resources and first launch case approval.

Human input needed:

- [ ] Confirm production Cloudflare project.
- [x] Confirm domain.
- [x] Confirm Access policy.
- [ ] Confirm first published cases.

## RDR-022: Upgrade Generation Orchestration to Cloudflare Workflows

Status: done
Type: AFK
Blocked by: RDR-006, RDR-014

Replace or augment the MVP Queue-backed generation orchestrator with Cloudflare Workflows once the staged generation pipeline has enough long-running, retryable steps to justify durable workflow execution.

Acceptance criteria:

- [x] Existing generation run state remains stored in D1 and is not locked inside Workflow internals.
- [x] Queue-backed orchestrator interface is preserved or cleanly adapted.
- [x] Workflows model the durable stages: source discovery, paper/design-doc discovery, evidence map, module generation, QA, and publish preparation.
- [x] Step retry and failure semantics are explicit.
- [x] Admin timeline continues reading canonical state from D1.
- [x] Existing Queue path can be removed or retained only as a narrow compatibility adapter.
- [x] Tests cover migration from queued generation runs to workflow-backed runs where applicable.

Notes:

- `GenerationWorkflow` is exported from `workers/app.ts` and configured in `wrangler.jsonc`.
- Admin actions dispatch through `createGenerationDispatcher`, which prefers `GENERATION_WORKFLOW` and falls back to `GENERATION_QUEUE`.
- Workflow steps update D1 generation state; the admin timeline remains a D1 read model.
- Queue consumption remains as a compatibility path for already-queued or fallback messages.
