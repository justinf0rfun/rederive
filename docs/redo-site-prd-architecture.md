# redo Website PRD and Technical Architecture

Status: Draft for implementation planning
Date: 2026-05-23
Owner: Justin

## 1. Executive Summary

redo is a method for reverse-learning mature programming technologies by reconstructing their evolution as a chain of engineering constraints, candidate designs, trade-offs, technical debt, later fixes, and unresolved pain points.

This project turns redo from a local skill into a full web product:

- A public content site for reading and sharing high-density redo cases.
- A Cloudflare-backed backend service for generating, reviewing, publishing, versioning, and serving structured redo content.
- An admin-only generation and review workflow that keeps AI-generated content behind strict evidence and quality gates.
- A D1/R2-backed evidence system that preserves sources, claim mappings, generated drafts, module review state, and immutable published versions.

The site must not become a generic AI article generator. Its differentiator is a repeatable, auditable engineering reasoning format:

```text
constraint -> options -> chosen design -> trade-off -> debt -> mitigation/resolution -> unresolved pain
```

## 2. Product Positioning

### 2.1 Target Reader

The primary reader is an engineer with roughly 3-8 years of experience who already knows how to use major technologies and now wants to understand why mature systems evolved the way they did.

The first audience should bias toward:

- Backend engineers
- Infrastructure engineers
- Platform engineers
- Database and distributed systems learners
- AI infrastructure engineers
- Senior engineers preparing for architectural judgment and design review work

The site is not optimized for absolute beginners, tutorial readers, or news-driven technology coverage.

### 2.2 Core Promise

Use engineering constraints to retrace the evolution of mature technologies, so readers train their ability to make system design trade-offs.

The homepage promise should be close to:

> 用工程约束重走成熟技术的演化路径，训练你做系统设计取舍的能力。

English positioning can be:

> redo is a way to learn mature systems by reconstructing the constraints they survived.

### 2.3 Brand Model

redo is the primary brand. Justin appears as the creator, curator, and method owner.

This should feel like a method and case library, not a personal blog. Personal identity is used for trust, authorship, and curation, not as the main navigation or visual center.

### 2.4 Visual Direction

The visual direction is "engineering war room / system map", but elevated and fluid.

This means:

- Dense but readable information architecture.
- Strong visual treatment for decision maps, debt maps, evidence, state tags, and causal chains.
- Motion and interaction used to clarify relationships, not decorate the page.
- No generic marketing hero, no decorative orb backgrounds, no empty visual effects.
- Screenshots and share cards should feel like crisp engineering artifacts.
- The UI should be sophisticated, high-signal, and alive through interaction.

## 3. Product Goals

### 3.1 Goals

1. Publish high-quality structured redo cases that are more rigorous than normal architecture essays.
2. Make individual modules inside a case shareable: causal chains, debt maps, pain rankings, key decision tables, and pattern boundaries.
3. Build a generation system that can produce complete redo drafts while enforcing source coverage, paper/design-doc discovery, claim-evidence mapping, module review, and hard quality gates.
4. Keep generation admin-only in v1, with public users limited to reading, subscribing, submitting topic requests, and submitting structured corrections or source additions.
5. Preserve immutable published versions for citation and revision history.
6. Support Chinese-first publishing while keeping the data model ready for independent English generation and review.

### 3.2 Non-Goals for MVP

1. Public user accounts.
2. Public free-form comments.
3. Public redo generation.
4. Community voting boards.
5. A generic CMS or rich text editor.
6. Manual editing of generated article body text.
7. Complex knowledge graph visualization.
8. Multi-author editorial workflow.
9. Real-time collaborative review.
10. Full bilingual launch parity.

## 4. Core Product Decisions

The following decisions are already accepted and should be treated as constraints:

1. The first version prioritizes reading and propagation over public generation.
2. The content format is a structured engineering case, not a normal blog article.
3. The homepage should organize entry points by system design questions first, topic names second.
4. The case page should lead with a scannable decision map and support linear deep reading.
5. Debt map and pain point ranking are signature modules.
6. Source and inference boundaries are standard visible modules.
7. Small modules must be independently shareable.
8. First release should prioritize 6-10 benchmark cases, not broad coverage.
9. Primary conversion is subscription; secondary conversion is topic submission.
10. The method page is a first-class page.
11. Generated content is stored in Cloudflare D1.
12. Generated content enters D1 as draft and requires human review before publishing.
13. Generation is admin-only in v1.
14. Generation is staged and stores intermediate results.
15. Web source discovery is mandatory; model memory alone cannot support factual claims.
16. Paper and design-document discovery is an explicit generation step and publishing gate.
17. The website backend uses its own versioned redo generation contract, synchronized conceptually with the redo skill.
18. Published versions are immutable; updates produce new versions.
19. Humans review, reject, request more sources, or trigger regeneration; they do not directly edit body text.
20. Regeneration is module-level by default, with dependency invalidation.
21. Frontend trust markers are visible but not a full internal log dump.
22. D1 stores workflow relations and immutable JSON snapshots; R2 stores heavier artifacts and generated cards.
23. Claim-evidence map is a core structure.
24. Controversial judgments are allowed only when explicitly marked and bounded.
25. Adjacent systems and competitors are used only as controlled comparisons, not as product reviews.
26. MVP must include the minimal automatic search/generation/review/publish loop.
27. Cloudflare Access protects admin routes.
28. Topic requests go to a private candidate pool, not a public voting board.
29. Generation runs asynchronously and are tracked in D1.
30. Hard redo quality checks block publishing.
31. Public topic URL defaults to latest published version; version URLs provide immutable citation links.
32. Lightweight design-question and pattern aggregation pages are included in v1.
33. Chinese is first; English is modeled but can launch later.
34. Core module social cards are generated automatically.
35. Module-level anchors and share actions are required.
36. Module-level review is required before final publication.
37. Structured correction/source feedback is required; comments are not.
38. Source evidence should include metadata, excerpts, retrieval time, and content hash.

## 5. PRD

### 5.1 Problem Statement

Engineers often learn mature technologies through tutorials, API guides, timelines, or feature tours. These formats explain what a system does, but they rarely reconstruct why the system was forced into its current shape.

As a result, readers miss the reusable engineering judgment:

- What constraint existed at the time?
- What alternatives were realistic?
- Why did the chosen design win?
- What cost did it accept?
- Which debt was introduced?
- Which debt was later resolved, mitigated, or left unresolved?
- What pattern can be copied elsewhere?
- Where does the pattern stop working?

redo already encodes this method as a skill. The missing product is a web service that can generate, review, publish, preserve, and distribute redo cases with evidence-backed rigor.

### 5.2 Solution

Build a Cloudflare-native full-stack website where:

- Public readers browse structured redo cases by system design question, pattern, and topic.
- Each case is rendered as a decision map with deep modules: stages, throughline, transferable pattern, boundaries, debt map, pain ranking, causal chain, sources, and inference notes.
- Readers can copy links, share module cards, submit topics, subscribe, and submit structured corrections or source additions.
- Admins can trigger staged AI generation for a topic.
- The backend discovers sources, separately discovers papers/design docs, builds a claim-evidence map, generates modules, validates redo contract rules, and stores everything in D1.
- Admins review modules, reject modules with reasons, request more sources, trigger regeneration, and publish immutable versions only when hard gates pass.

### 5.3 User Stories

1. As a senior engineer, I want to understand why Kafka evolved around logs, so that I can judge when log-centered architecture is appropriate.
2. As a backend engineer, I want to scan a case in 30 seconds, so that I can decide whether to read deeply.
3. As a reader, I want the case to start from the central pressure, so that I know what problem shaped the system.
4. As a reader, I want each stage to show plausible rejected options, so that the chosen design does not feel inevitable.
5. As a reader, I want debt IDs to connect stages to debt maps, so that I can trace consequences across time.
6. As a reader, I want to distinguish resolved, mitigated, and unresolved debt, so that I do not confuse partial fixes with structural fixes.
7. As a reader, I want pain points ranked by present-day user symptoms, so that I understand what still hurts in production.
8. As a reader, I want transferable patterns and boundaries, so that I know when to copy the idea and when not to.
9. As a reader, I want controlled comparison to adjacent systems, so that trade-offs are visible without turning the site into a versus page.
10. As a reader, I want a compact causal chain, so that I can remember and retell the system's evolution.
11. As a reader, I want source and inference markers, so that I know which claims are sourced facts and which are engineering judgment.
12. As a reader, I want stable anchors for each module, so that I can cite a specific stage, debt map, or pain ranking.
13. As a reader, I want shareable module images, so that I can post the most useful part without screenshot cleanup.
14. As a reader, I want immutable version links, so that citations remain stable after a case is updated.
15. As a reader, I want the latest topic URL to show the newest reviewed version, so that casual browsing stays current.
16. As a reader, I want to browse by system design question, so that I can learn reusable patterns instead of only searching known technologies.
17. As a reader, I want to browse by transferable pattern, so that I can compare how multiple systems solve similar constraints.
18. As a reader, I want a method page, so that I understand how redo differs from timelines, tutorials, and feature tours.
19. As a reader, I want to submit a topic request, so that I can influence future coverage.
20. As a reader, I want to add optional source links to a topic request, so that I can help the generation process.
21. As a reader, I want to subscribe to updates, so that I can receive new cases.
22. As a reader, I want to submit a structured correction, so that factual errors and missing sources can be addressed.
23. As a reader, I want to submit a correction tied to a specific module, so that feedback is precise.
24. As an admin, I want to see topic request clusters, so that repeated demand is visible without public voting.
25. As an admin, I want to start generation from a topic, language, and scope, so that I can produce a draft candidate.
26. As an admin, I want generation to run asynchronously, so that long research and generation tasks do not block the browser.
27. As an admin, I want to see generation step status, so that I know whether a run is researching, blocked, failed, or ready for review.
28. As an admin, I want paper and design-doc discovery shown separately, so that I can reject weak source coverage before generation continues.
29. As an admin, I want each generated claim mapped to evidence, so that review can focus on correctness.
30. As an admin, I want each module reviewed independently, so that one weak section does not force rerunning the entire case.
31. As an admin, I want to reject a module with a reason, so that regeneration has targeted feedback.
32. As an admin, I want to request more sources, so that weak evidence can be fixed before publishing.
33. As an admin, I want to trigger module-level regeneration, so that cost and review scope stay controlled.
34. As an admin, I want dependency invalidation, so that downstream debt maps and causal chains do not remain approved after upstream stage changes.
35. As an admin, I want hard QA gates, so that a case cannot be published when redo contract rules are broken.
36. As an admin, I want published versions to be immutable, so that updates are explicit revisions.
37. As an admin, I want revision notes, so that readers understand why a new version exists.
38. As an admin, I want all admin actions audited with identity and timestamp, so that publication decisions are traceable.
39. As a system operator, I want Cloudflare Access to protect admin routes, so that no custom auth system is needed in v1.
40. As a system operator, I want Turnstile and rate limits on public forms, so that spam does not pollute D1.
41. As a system operator, I want generated source snapshots and social cards stored in R2, so that D1 remains focused on relational metadata and content snapshots.
42. As a system operator, I want published pages cached safely, so that public reading is fast and generation workflows do not affect serving.
43. As a developer, I want the redo generation contract versioned in the repo, so that the backend does not depend on local Codex skill runtime.
44. As a developer, I want validators and state machines tested independently, so that quality gates are reliable.
45. As a developer, I want a seed/demo case path, so that frontend rendering can be built before generation is perfect.

### 5.4 Public Information Architecture

Recommended routes:

```text
/                          -> redirect or locale detection
/zh                        -> Chinese homepage
/zh/cases                  -> case index
/zh/cases/:topicSlug       -> latest published version for topic
/zh/cases/:topicSlug/v/:id -> immutable published version
/zh/questions              -> system design question index
/zh/questions/:slug        -> question aggregation page
/zh/patterns               -> transferable pattern index
/zh/patterns/:slug         -> pattern aggregation page
/zh/method                 -> redo method page
/zh/submit-topic           -> topic request form
/zh/subscribe              -> subscription capture or landing state
/zh/feedback               -> structured correction/source submission
/en/...                    -> reserved for independent English content
/admin                     -> admin dashboard, protected by Cloudflare Access
```

### 5.5 Homepage Requirements

The homepage should make the brand and method immediately clear. It should not look like a personal blog or landing page for a SaaS product.

Required modules:

1. First viewport:
   - redo brand.
   - Core promise.
   - 2-3 compact featured design questions.
   - Link to method page.
   - Link to latest/featured case.
   - A hint of case/question content below the fold.
2. Design question entry:
   - Curated questions such as "为什么日志会变成系统核心抽象？"
   - Each question links to related cases and modules.
3. Featured benchmark cases:
   - Kafka, React, Docker, Kubernetes, PostgreSQL, Redis, Git, TypeScript as likely initial candidates.
4. Signature modules preview:
   - Debt map preview.
   - Pain ranking preview.
   - Causal chain preview.
5. Method teaser:
   - Explain redo by contrast with tutorial, timeline, source walkthrough, and feature tour.
6. Subscribe and submit topic:
   - Subscription is primary.
   - Topic submission is secondary.

### 5.6 Case Page Requirements

The case page is the core product surface.

Required top-level structure:

1. Header:
   - Topic name.
   - What the system is.
   - Central pressure.
   - One-sentence trade-off theme.
   - Version, date, language, review status, source count, paper/design-doc count.
2. Decision map:
   - Stage navigation.
   - Debt status overview.
   - Current pain ranking summary.
   - Repeated trade-off summary.
3. Evolution stages:
   - 7-9 stages for mature systems unless a topic justifies fewer/more.
   - Each stage has constraint, options table, key trade-off, debt introduced.
4. Throughline:
   - Recurring design philosophy.
   - Repeated choice table.
   - Design-review sentence.
5. Transferable pattern:
   - Mechanism-level sibling systems.
   - Shared constraint.
   - Different price.
6. Pattern boundaries:
   - Counterexamples.
   - Opposite rational choices.
   - Boundary rules.
7. Debt map:
   - Resolved debt.
   - Mitigated debt.
   - Unresolved debt.
8. Pain point ranking:
   - Present-day symptoms.
   - Competitive attack angle where fair.
9. Causal chain:
   - ASCII/story-map visual.
   - One-sentence version.
10. Sources and inference:
   - Source list grouped by type.
   - Paper/design-doc section.
   - Inference notes.
   - Uncertainty notes.
11. Feedback and sharing:
   - Module-level anchors.
   - Copy link.
   - Copy summary.
   - Open/download social card.
   - Submit correction/source.

### 5.7 Method Page Requirements

The method page should explain redo as a reusable thinking framework.

Required sections:

1. What redo is.
2. What redo is not:
   - Not a tutorial.
   - Not a feature tour.
   - Not a release timeline.
   - Not a source-code walkthrough.
   - Not a generic AI summary.
3. Core loop:
   - Constraint.
   - Options.
   - Chosen path.
   - Trade-off.
   - Debt.
   - Mitigation/resolution.
   - Unresolved pain.
   - Transferable pattern.
   - Boundary.
4. Evidence discipline:
   - Facts need sources.
   - Papers/design docs are first-class.
   - Inferences must be marked.
   - Controversial judgments need boundaries.
5. How to read a case.
6. How to use redo on your own systems.

### 5.8 Admin Product Requirements

Admin is not an editor. It is a generation and review workbench.

Required admin surfaces:

1. Dashboard:
   - Pending topic requests.
   - Active generation runs.
   - Drafts ready for review.
   - Blocked runs.
   - Recently published versions.
2. Topic request pool:
   - Deduplicated topic clusters.
   - Request count.
   - Representative user reasons.
   - Submitted source links.
   - Create generation run.
3. Generation run detail:
   - Run status.
   - Step timeline.
   - Inputs.
   - Errors.
   - Source coverage.
   - Paper/design-doc coverage.
   - Generated modules and review status.
4. Source review:
   - Source type.
   - Trust level.
   - Metadata.
   - Extracted evidence snippets.
   - Claims supported.
   - Missing evidence warnings.
5. Module review:
   - View generated module.
   - View linked claims/evidence.
   - Approve module.
   - Reject module with reason.
   - Request more sources.
   - Regenerate module.
   - View stale dependencies.
6. Publish screen:
   - Hard QA results.
   - Module approval status.
   - Revision note.
   - Preview latest route.
   - Preview immutable version route.
   - Publish action.

Admin must not allow direct editing of generated body content in MVP.

## 6. Content Model

### 6.1 Case Snapshot Shape

Published versions should freeze a content snapshot similar to:

```ts
type RedoCaseSnapshot = {
  contractVersion: string;
  language: "zh" | "en";
  topic: {
    id: string;
    slug: string;
    displayName: string;
    aliases: string[];
    category: string;
  };
  version: {
    id: string;
    number: number;
    publishedAt: string;
    revisionNote: string;
    supersedesVersionId?: string;
  };
  trust: {
    reviewed: true;
    sourceCount: number;
    paperOrDesignDocCount: number;
    claimCount: number;
    inferenceCount: number;
    controversialJudgmentCount: number;
  };
  orientation: {
    whatItIs: string;
    centralPressure: string;
    tradeoffTheme: string;
    oneSentenceVersion: string;
  };
  designQuestions: Array<{
    slug: string;
    title: string;
    summary: string;
  }>;
  stages: RedoStage[];
  throughline: RedoThroughline;
  transferablePattern: RedoTransferablePattern;
  boundaries: RedoBoundary[];
  debtMap: RedoDebtMap;
  painRanking: RedoPainPoint[];
  causalChain: RedoCausalChain;
  sources: PublishedSourceSummary[];
  inferenceNotes: InferenceNote[];
  socialCards: SocialCardManifest[];
};
```

### 6.2 Stage Shape

```ts
type RedoStage = {
  id: string;
  number: number;
  slug: string;
  title: string;
  period: string;
  constraint: string;
  options: Array<{
    label: "A" | "B" | "C" | string;
    name: string;
    cost: string;
    outcome: "rejected" | "chosen";
    why: string;
  }>;
  keyTradeoff: string;
  debtsIntroduced: Array<{
    debtId: string;
    summary: string;
  }>;
  debtsRepaid?: Array<{
    debtId: string;
    repaymentType: "resolved" | "mitigated";
    summary: string;
  }>;
  claimIds: string[];
  inferenceNoteIds: string[];
};
```

### 6.3 Claim-Evidence Map

The claim-evidence map is a first-class data model, not a footnote.

```ts
type EvidenceClaim = {
  id: string;
  draftId: string;
  statement: string;
  claimType: "fact" | "inference" | "controversial_judgment";
  confidence: "high" | "medium" | "low";
  moduleId: string;
  sourceEvidenceIds: string[];
  inferenceBasisClaimIds: string[];
  publishable: boolean;
};

type SourceEvidence = {
  id: string;
  sourceId: string;
  excerpt: string;
  locator: string;
  retrievedAt: string;
  contentHash: string;
  supportsClaimIds: string[];
};
```

Rules:

- Factual claims require at least one source evidence link.
- High-impact factual claims should prefer primary or high-authority sources.
- Inference claims require basis claims.
- Controversial judgments require a boundary note or alternative interpretation.
- Low-confidence inference cannot be used as a central conclusion.

## 7. Generation Workflow

### 7.1 Run Lifecycle

```text
queued
  -> researching_general_sources
  -> researching_papers_and_design_docs
  -> triaging_sources
  -> building_evidence_map
  -> outlining_stages
  -> generating_modules
  -> qa
  -> ready_for_review
  -> published
```

Failure and blocking states:

```text
blocked_source_insufficient
blocked_paper_coverage_insufficient
blocked_claim_evidence_incomplete
blocked_contract_validation_failed
failed
cancelled
```

### 7.2 Generation Steps

1. Topic intake:
   - Normalize topic name.
   - Detect aliases.
   - Select language.
   - Select scope.
   - Create generation run.
2. General source discovery:
   - Official documentation.
   - Release notes.
   - RFC/KIP/PEP/design proposals.
   - Maintainer posts.
   - Engineering retrospectives.
   - Project repositories.
3. Paper/design-doc discovery:
   - Original papers.
   - Related academic papers.
   - Architecture/design documents.
   - Standards documents where relevant.
   - Formal proposals.
4. Source triage:
   - Classify source type.
   - Assign trust level.
   - Extract candidate evidence.
   - Detect weak secondary sources.
   - Remove low-value SEO/tutorial material unless useful only for non-core context.
5. Evidence map:
   - Extract claims.
   - Bind claims to evidence snippets.
   - Mark claim type.
   - Mark confidence.
   - Identify unsupported or weak claims.
6. Stage outline:
   - Produce 7-9 engineering-pressure stages for mature systems.
   - Avoid simple release chronology.
   - Identify debt IDs.
   - Identify dependencies between modules.
7. Module generation:
   - Orientation.
   - Stage modules.
   - Throughline.
   - Transferable pattern.
   - Boundary/counterexample table.
   - Debt map.
   - Pain ranking.
   - Causal chain.
   - Sources and inference notes.
   - Social card manifests.
8. Contract QA:
   - Validate structure.
   - Validate debt ID consistency.
   - Validate source coverage.
   - Validate paper/design-doc step completion.
   - Validate claim-evidence bindings.
   - Validate inference boundaries.
   - Validate module dependencies.
9. Review:
   - Human approves/rejects modules.
   - Rejected modules can be regenerated.
   - Source gaps can trigger source discovery.
   - Upstream changes mark downstream modules stale.
10. Publish:
   - Freeze immutable JSON snapshot.
   - Generate social cards.
   - Update latest published pointer.
   - Write audit log.
   - Refresh sitemap/RSS where applicable.

### 7.3 Module Dependency Rules

Dependencies should be explicit.

Examples:

- Stage outline changes mark all stages, debt map, pain ranking, causal chain, and patterns stale.
- A stage change marks debt map and causal chain stale.
- A debt ID change marks every module referencing that debt ID stale.
- New source evidence marks affected claims and modules needing revalidation.
- Source rejection can invalidate claims and any module using those claims.
- Social cards become stale when their source module changes.

## 8. Quality Gates

### 8.1 Hard Publish Blockers

A draft cannot publish if any of the following are true:

1. Paper/design-doc discovery step is incomplete.
2. No paper/design-doc source exists for a topic where such sources are expected.
3. Any core factual claim lacks source evidence.
4. Any module has status other than approved.
5. Any module is stale.
6. Any required module is missing.
7. A mature system has an unjustified stage count outside the expected 7-9 range.
8. A stage lacks at least two rejected options and one chosen option.
9. A chosen option does not explain why it was rational under the stage constraint.
10. Debt IDs introduced in stages are missing from the debt map.
11. Debt map references debt IDs not introduced or explicitly added as secondary debt.
12. Resolved/mitigated/unresolved debt classifications conflict.
13. Causal chain references non-existent stage or debt IDs.
14. Transferable pattern compares product categories instead of mechanisms.
15. Boundary section has no meaningful counterexample where one is needed.
16. Competitive attack angle overclaims or lacks trade-off framing.
17. Inference notes are missing for engineering motivations not directly stated by sources.
18. Controversial judgment lacks boundary or alternative explanation.
19. Source list uses weak secondary sources for core historical claims when stronger sources exist.
20. Required social cards failed generation.

### 8.2 Warnings

Warnings do not block publication, but should be visible:

- Source diversity is low.
- Too many claims rely on one source.
- The same source supports too many unrelated stages.
- Pain ranking has weak competitive context.
- Some sources have missing publication dates.
- A module has high inference density.
- A case lacks enough sibling systems for pattern comparison.

## 9. Technical Architecture

### 9.1 Recommended Stack

Use a Cloudflare-friendly full-stack React architecture:

- Frontend/runtime: React Router v7 or Remix-style full-stack routing.
- Hosting: Cloudflare Pages or Workers-based deployment.
- Database: Cloudflare D1.
- Object storage: Cloudflare R2.
- Async work: Cloudflare Queues or Cloudflare Workflows.
- Admin auth: Cloudflare Access.
- Public anti-abuse: Cloudflare Turnstile plus rate limits.
- Search/generation providers: adapter-based, configured by environment.
- AI generation: server-side provider adapter using a versioned redo generation contract.

The exact React Router/Remix deployment wrapper can be chosen during implementation, but the architecture should preserve:

- Server-rendered public pages.
- Loader/action style data mutations.
- D1 bindings in server code.
- Admin and public routes in one deployable app.
- Queue/workflow worker for long-running generation.

### 9.2 System Components

#### Public Web App

Responsibilities:

- Render homepage, case pages, method page, question pages, pattern pages.
- Serve latest and immutable version routes.
- Submit topic requests.
- Submit structured feedback.
- Capture subscriptions.
- Expose module anchors and share actions.
- Render trust markers.

#### Admin Web App

Responsibilities:

- Read Cloudflare Access identity.
- Display dashboard.
- Manage topic request pool.
- Start generation runs.
- Review sources.
- Review claim-evidence map.
- Review modules.
- Trigger regeneration.
- Publish versions.
- Inspect audit log.

#### Generation Orchestrator

Responsibilities:

- Consume generation queue/workflow events.
- Execute staged generation.
- Persist step outputs.
- Call search adapters.
- Call paper/design-doc adapters.
- Call AI generation adapters.
- Run contract validators.
- Mark blocked/failed states.

#### redo Generation Contract

Responsibilities:

- Define schema for every module.
- Define prompts/instructions for each generation step.
- Define validation rules.
- Define source quality rules.
- Define module dependency graph.
- Define publish gates.

This contract lives in the website repo and is versioned independently from the local redo skill, while preserving the same philosophy.

#### Evidence Engine

Responsibilities:

- Store source metadata.
- Store source evidence snippets.
- Store claim-evidence links.
- Validate source coverage.
- Validate inference chains.
- Support admin review.
- Support public source summaries.

#### Publication Service

Responsibilities:

- Check hard gates.
- Freeze JSON snapshot.
- Assign immutable version.
- Update latest topic pointer.
- Create social card jobs.
- Write audit log.

#### Social Card Service

Responsibilities:

- Generate share cards for case cover, one-sentence version, causal chain, debt map, and pain ranking.
- Store generated images in R2.
- Persist card manifest in D1.
- Expose stable URLs for public sharing.

### 9.3 High-Level Flow

```text
Public reader submits topic
  -> D1 topic_requests
  -> Admin reviews candidate pool
  -> Admin starts generation run
  -> Queue/Workflow executes staged generation
  -> Sources + claims + modules stored in D1, snapshots in R2
  -> Admin reviews modules
  -> QA gates pass
  -> Publish immutable version
  -> Public site serves latest topic route and version route
```

### 9.4 D1 Schema Draft

#### topics

Stores canonical technology topics.

```sql
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  latest_published_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### topic_requests

Stores public topic submissions.

```sql
CREATE TABLE topic_requests (
  id TEXT PRIMARY KEY,
  topic_text TEXT NOT NULL,
  normalized_topic_slug TEXT,
  reason TEXT,
  submitter_email TEXT,
  source_links_json TEXT NOT NULL DEFAULT '[]',
  locale TEXT NOT NULL DEFAULT 'zh',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### generation_runs

Stores each admin-triggered generation run.

```sql
CREATE TABLE generation_runs (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  language TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  status TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  error_code TEXT,
  error_message TEXT,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
```

#### generation_steps

Stores staged generation progress and outputs.

```sql
CREATE TABLE generation_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(run_id, step_key),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);
```

#### source_documents

Stores source metadata and R2 snapshot pointers.

```sql
CREATE TABLE source_documents (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  url TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT,
  authors_json TEXT NOT NULL DEFAULT '[]',
  publisher TEXT,
  published_at TEXT,
  retrieved_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  trust_level TEXT NOT NULL,
  content_hash TEXT,
  r2_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);
```

Source types should include:

- official_docs
- release_notes
- design_doc
- proposal
- paper
- standard
- repository
- maintainer_post
- engineering_blog
- interview
- secondary_context

#### source_evidence

Stores evidence snippets extracted from sources.

```sql
CREATE TABLE source_evidence (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  locator TEXT,
  evidence_type TEXT NOT NULL,
  content_hash TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES source_documents(id),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);
```

#### evidence_claims

Stores claims used by modules.

```sql
CREATE TABLE evidence_claims (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  confidence TEXT NOT NULL,
  module_id TEXT,
  publishable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);
```

#### claim_evidence_links

Connects claims to evidence snippets.

```sql
CREATE TABLE claim_evidence_links (
  claim_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  support_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (claim_id, evidence_id),
  FOREIGN KEY (claim_id) REFERENCES evidence_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES source_evidence(id)
);
```

#### draft_modules

Stores generated modules and review state.

```sql
CREATE TABLE draft_modules (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  module_key TEXT NOT NULL,
  module_type TEXT NOT NULL,
  status TEXT NOT NULL,
  content_json TEXT NOT NULL,
  validation_json TEXT NOT NULL DEFAULT '{}',
  stale_reason TEXT,
  generated_from_step_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(run_id, module_key),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);
```

Module types:

- source_corpus
- evidence_map
- orientation
- stage_outline
- stage
- throughline
- transferable_pattern
- boundaries
- debt_map
- pain_ranking
- causal_chain
- source_notes
- social_card_manifest

#### module_dependencies

Stores module dependency graph.

```sql
CREATE TABLE module_dependencies (
  run_id TEXT NOT NULL,
  upstream_module_id TEXT NOT NULL,
  downstream_module_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (run_id, upstream_module_id, downstream_module_id),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id),
  FOREIGN KEY (upstream_module_id) REFERENCES draft_modules(id),
  FOREIGN KEY (downstream_module_id) REFERENCES draft_modules(id)
);
```

#### module_reviews

Stores review actions.

```sql
CREATE TABLE module_reviews (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  reviewer_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (module_id) REFERENCES draft_modules(id),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);
```

Actions:

- approve
- reject
- request_more_sources
- regenerate
- mark_inference_too_speculative
- block_publish

#### published_versions

Stores immutable published snapshots.

```sql
CREATE TABLE published_versions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  language TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  content_json TEXT NOT NULL,
  render_manifest_json TEXT NOT NULL DEFAULT '{}',
  source_summary_json TEXT NOT NULL DEFAULT '{}',
  revision_note TEXT,
  supersedes_version_id TEXT,
  published_by TEXT NOT NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(topic_id, language, version_number),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
```

#### social_cards

Stores generated social card metadata.

```sql
CREATE TABLE social_cards (
  id TEXT PRIMARY KEY,
  published_version_id TEXT NOT NULL,
  card_type TEXT NOT NULL,
  module_key TEXT,
  r2_object_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (published_version_id) REFERENCES published_versions(id)
);
```

#### feedback_items

Stores structured correction/source submissions.

```sql
CREATE TABLE feedback_items (
  id TEXT PRIMARY KEY,
  topic_id TEXT,
  published_version_id TEXT,
  module_anchor TEXT,
  feedback_type TEXT NOT NULL,
  body TEXT NOT NULL,
  source_links_json TEXT NOT NULL DEFAULT '[]',
  submitter_email TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### subscribers

Stores subscription intent.

```sql
CREATE TABLE subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'zh',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### audit_log

Stores admin and system actions.

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
```

### 9.5 API Surface

Public actions:

```text
POST /api/topic-requests
POST /api/feedback
POST /api/subscribers
GET  /api/social-cards/:id
```

Admin actions:

```text
GET  /admin/api/topic-requests
POST /admin/api/generation-runs
GET  /admin/api/generation-runs/:id
POST /admin/api/generation-runs/:id/cancel
POST /admin/api/modules/:id/approve
POST /admin/api/modules/:id/reject
POST /admin/api/modules/:id/request-more-sources
POST /admin/api/modules/:id/regenerate
POST /admin/api/generation-runs/:id/publish
GET  /admin/api/audit-log
```

Internal worker messages:

```ts
type GenerationMessage =
  | { type: "start_run"; runId: string }
  | { type: "execute_step"; runId: string; stepKey: string }
  | { type: "regenerate_module"; runId: string; moduleId: string; reason: string }
  | { type: "generate_social_cards"; publishedVersionId: string };
```

### 9.6 Security

Public:

- Turnstile on topic request, feedback, and subscription forms.
- Per-IP and per-email rate limits.
- Input length limits.
- URL validation for submitted sources.
- No public generation endpoint.

Admin:

- Cloudflare Access protects `/admin/*`.
- Server reads verified Access identity headers.
- Admin actions require Access identity.
- Every admin action writes audit_log.
- Generation provider keys and search provider keys stay in Worker secrets.
- Preview unpublished drafts only through admin routes.

Data:

- D1 stores metadata, workflow state, evidence snippets, and published JSON.
- R2 stores source snapshots, PDFs, HTML snapshots, and generated images.
- Do not expose source snapshots publicly unless intentionally allowed.
- Published pages expose source summaries and selected evidence, not full internal logs.

### 9.7 Caching

Recommended policy:

- Immutable version pages: long cache TTL.
- Latest topic pages: shorter TTL or cache purge on publication.
- Homepage/question/pattern indexes: cache with purge/revalidation after publication.
- Admin pages: no public cache.
- Social cards: long cache TTL because they are versioned.

### 9.8 Observability

Track:

- Generation step duration.
- Source discovery counts by type.
- Paper/design-doc coverage.
- Claim count and unsupported claim count.
- Module rejection reasons.
- Regeneration count per case.
- QA gate failures.
- Publish count.
- Feedback count by type.
- Topic request clusters.

Minimum implementation:

- Structured logs from workers.
- D1 generation_steps and audit_log.
- Admin timeline UI.

### 9.9 Testing Strategy

Unit tests:

- redo contract validators.
- State machines.
- Module dependency invalidation.
- Claim-evidence validation.
- D1 repository functions.
- Slug/version helpers.

Integration tests:

- Topic request submission writes D1.
- Admin starts generation run.
- Queue message advances generation step.
- Module rejection marks status.
- Upstream regeneration marks downstream stale.
- Publish fails when hard gates fail.
- Publish succeeds when required modules are approved and QA passes.
- Latest topic pointer updates after publication.

End-to-end tests:

- Reader opens homepage and case page.
- Reader copies module anchor.
- Reader submits topic request.
- Admin reviews and publishes a seeded draft.
- Published immutable route remains stable.

Visual/UX verification:

- Desktop and mobile case page screenshots.
- Ensure decision map, debt map, tables, and share controls do not overflow.
- Ensure text inside compact cards/buttons fits.
- Ensure core content remains readable without motion.

## 10. MVP Scope

### 10.1 Must Include

1. Cloudflare full-stack app scaffold.
2. D1 schema and migrations.
3. R2 binding for source snapshots and social cards.
4. Admin route protected by Cloudflare Access.
5. Public homepage, method page, case page, question page, pattern page.
6. Public topic request form.
7. Public structured feedback/source form.
8. Subscriber capture.
9. Admin topic request pool.
10. Admin generation run creation.
11. Async generation worker.
12. General source discovery adapter interface.
13. Paper/design-doc discovery adapter interface.
14. Source triage and evidence extraction storage.
15. Claim-evidence map.
16. redo generation contract schemas and validators.
17. Stage/module generation.
18. Module review and rejection.
19. Module-level regeneration.
20. Dependency invalidation.
21. Hard publish gates.
22. Immutable published versions.
23. Latest topic pointer.
24. Core social cards.
25. Basic sitemap and RSS/feed.

### 10.2 Can Be Minimal

1. Search provider adapters can start with one configured provider plus manual submitted URLs.
2. Paper search can start with 1-2 adapters if the adapter interface is explicit.
3. Social cards can use a fixed template set.
4. Question/pattern aggregation can be tag-based, not graph-based.
5. Subscription can store emails before integrating a newsletter provider.
6. English routes can exist but return "not launched" unless content exists.

### 10.3 Not in MVP

1. Public generation.
2. User accounts.
3. Public voting.
4. Comments.
5. Rich text editing.
6. Manual body editing.
7. Full source snapshot public browser.
8. Complex knowledge graph.
9. Multi-tenant admin roles.
10. Payment or monetization.

## 11. Initial Benchmark Case Set

Recommended first candidates:

1. Kafka: log as core abstraction.
2. React: UI state and rendering model evolution.
3. Docker: environment as distributable artifact.
4. Kubernetes: control plane and declarative reconciliation.
5. PostgreSQL: correctness, compatibility, and extensibility.
6. Redis: memory model, persistence, clustering debt.
7. Git: content addressing, distributed collaboration, human workflow friction.
8. TypeScript: type system layered onto JavaScript compatibility.

The first public launch should publish fewer strong cases rather than many weak cases. A realistic first release can ship with 3-5 polished cases and more queued in admin.

## 12. Task Breakdown

The tasks below are written as vertical slices. Each should produce a demoable or verifiable behavior across the stack.

### 12.1 Slice 1: Bootstrap Cloudflare Full-Stack App

Type: AFK

Blocked by: None

What to build:

Create the initial React Router/Remix-style Cloudflare app with public and admin route groups, D1/R2/Queue bindings, local dev scripts, and a simple health page that reads a D1 migration version.

Acceptance criteria:

- App runs locally.
- Public route renders.
- Admin route exists but can be stubbed.
- D1 migration table exists.
- A loader/action can read/write D1 in local dev.
- Deployment configuration has placeholders for D1, R2, Queue/Workflow, Turnstile, and provider secrets.

### 12.2 Slice 2: Define redo Contract and Validators

Type: AFK

Blocked by: Slice 1

What to build:

Add the versioned redo generation contract, TypeScript schemas, and validators for case snapshots, stages, debt maps, source summaries, inference notes, and claim-evidence maps.

Acceptance criteria:

- Contract version is explicit.
- Valid sample case passes.
- Missing stage options fail validation.
- Broken debt ID references fail validation.
- Unsupported factual claims fail validation.
- Validator output distinguishes hard blockers from warnings.

### 12.3 Slice 3: Public Topic Request Intake

Type: AFK

Blocked by: Slice 1

What to build:

Build `/zh/submit-topic` and `POST /api/topic-requests`, storing topic text, reason, optional email, optional source links, locale, and anti-abuse metadata in D1.

Acceptance criteria:

- Public user can submit a topic request.
- Invalid URLs are rejected.
- Overlong text is rejected.
- Turnstile hook is present and can be bypassed only in local dev/test.
- Admin dashboard can show submitted requests in a basic list.

### 12.4 Slice 4: Cloudflare Access Admin Identity

Type: HITL

Blocked by: Slice 1

What to build:

Protect `/admin/*` using Cloudflare Access in deployed environments and read verified admin identity in server code. In local dev, provide a safe mock identity.

Acceptance criteria:

- Admin routes require Access in staging/prod.
- Server actions receive reviewer email.
- Admin identity is written to audit_log.
- Local dev identity cannot accidentally be enabled in production.

Human decision needed:

- Confirm allowed admin email/domain in Cloudflare Access.

### 12.5 Slice 5: Admin Topic Pool to Generation Run

Type: AFK

Blocked by: Slices 3, 4

What to build:

Let an admin normalize or select a topic request cluster and create a generation run with topic, language, scope, and contract version.

Acceptance criteria:

- Admin can create a topic if none exists.
- Admin can start a generation run from a topic request.
- Run is stored with `queued` status.
- Audit log records who started the run.
- Dashboard shows the run.

### 12.6 Slice 6: Async Generation Orchestrator Skeleton

Type: AFK

Blocked by: Slice 5

What to build:

Implement the queue/workflow consumer that advances a generation run through step records, initially using deterministic stub outputs.

Acceptance criteria:

- Starting a run enqueues work.
- generation_steps are created and updated.
- Step failures set run status to failed with error details.
- Retrying a failed step is possible from admin.
- Admin timeline updates from D1 state.

### 12.7 Slice 7: Source Discovery and Source Corpus Review

Type: AFK

Blocked by: Slice 6

What to build:

Add source discovery adapter interfaces and a first implementation path that can combine automated search results with submitted/manual URLs. Store source metadata and snapshots/index pointers.

Acceptance criteria:

- Source discovery step stores candidate sources.
- Sources are classified by type and trust level.
- R2 object keys can be attached for snapshots.
- Admin can inspect source list.
- Admin can reject low-quality sources.
- Run can be blocked when source count/trust is insufficient.

### 12.8 Slice 8: Paper and Design-Doc Discovery Gate

Type: AFK

Blocked by: Slice 7

What to build:

Implement a separate paper/design-doc discovery step and hard gate. The first adapter set can be minimal, but the step must be explicit and reviewable.

Acceptance criteria:

- Papers/design docs are tracked separately from general sources.
- Admin sees paper/design-doc coverage.
- QA fails if the step was skipped.
- QA blocks publication if expected paper/design-doc coverage is missing.
- Admin can request more sources from this step.

### 12.9 Slice 9: Claim-Evidence Map

Type: AFK

Blocked by: Slices 7, 8

What to build:

Extract or generate claims, bind them to source evidence snippets, mark claim type and confidence, and expose the map in admin.

Acceptance criteria:

- Factual claims require evidence.
- Inference claims require basis claims.
- Controversial judgments can be represented.
- Admin can inspect claims per source and per module.
- Unsupported factual claims are hard blockers.

### 12.10 Slice 10: Stage Outline and Orientation Generation

Type: AFK

Blocked by: Slices 2, 9

What to build:

Generate orientation and stage outline modules from evidence using the redo contract. Store draft modules and validate them.

Acceptance criteria:

- Orientation includes what it is, central pressure, and trade-off theme.
- Stage outline uses engineering decision pressure, not only chronology.
- Mature topics target 7-9 stages or justify deviation.
- Admin can approve/reject orientation and outline modules.
- Rejecting outline marks dependent modules stale.

### 12.11 Slice 11: Stage Module Generation and Review

Type: AFK

Blocked by: Slice 10

What to build:

Generate each stage module with constraint, option table, chosen option, key trade-off, debt introduced, and claim links.

Acceptance criteria:

- Each stage has at least two rejected options and one chosen option.
- Chosen option explains why it was rational under the constraint.
- Debts introduced have clean IDs.
- Claims are linked to evidence or inference notes.
- Admin can review each stage separately.
- Rejecting one stage allows targeted regeneration.

### 12.12 Slice 12: Debt Map, Pain Ranking, Pattern, Boundary, and Causal Chain

Type: AFK

Blocked by: Slice 11

What to build:

Generate downstream analytical modules and validate cross-module consistency.

Acceptance criteria:

- Debt map includes resolved, mitigated, and unresolved tables.
- Debt IDs are traceable to stages.
- Pain ranking uses present-day symptoms.
- Competitive attack angles are trade-off-aware.
- Transferable pattern compares mechanisms, not categories.
- Boundary section includes counterexamples where appropriate.
- Causal chain references existing stages and debt IDs.

### 12.13 Slice 13: Module Review Actions and Dependency Invalidation

Type: AFK

Blocked by: Slices 10, 11, 12

What to build:

Implement approve, reject, request-more-sources, regenerate, and stale propagation for modules.

Acceptance criteria:

- Approved module status is persisted.
- Rejected module requires reason.
- Regenerate action enqueues module regeneration.
- Changing upstream modules marks downstream modules stale.
- Stale modules block publication.
- Audit log records all review actions.

### 12.14 Slice 14: Hard QA and Immutable Publish

Type: AFK

Blocked by: Slice 13

What to build:

Implement publish preflight, immutable version creation, latest topic pointer update, and revision notes.

Acceptance criteria:

- Publish fails if any hard gate fails.
- Publish fails if any core module is not approved.
- Publish creates content_json snapshot.
- Published version number increments.
- Latest topic pointer updates.
- Immutable version route can fetch the snapshot.
- Audit log records publication.

### 12.15 Slice 15: Public Case Page

Type: AFK

Blocked by: Slice 14

What to build:

Render the published case page from `published_versions.content_json` with decision map, modules, trust markers, anchors, and share actions.

Acceptance criteria:

- `/zh/cases/:slug` renders latest version.
- `/zh/cases/:slug/v/:id` renders immutable version.
- Decision map links to stages/debts/modules.
- Module anchors work.
- Trust markers show source count, paper/design-doc count, review status, and version.
- Page is responsive and readable on mobile and desktop.

### 12.16 Slice 16: Homepage, Method, Question, and Pattern Pages

Type: AFK

Blocked by: Slice 14

What to build:

Build the public discovery surfaces using published content metadata.

Acceptance criteria:

- Homepage prioritizes design questions.
- Featured cases render from published data.
- Method page explains redo.
- Question pages list related cases/modules.
- Pattern pages list shared mechanisms and boundaries.
- Empty states are professional and do not imply missing functionality.

### 12.17 Slice 17: Structured Feedback and Source Correction Flow

Type: AFK

Blocked by: Slice 15

What to build:

Add module-level correction/source submission from public pages and admin review for feedback items.

Acceptance criteria:

- Feedback can be tied to topic, version, and module anchor.
- Feedback type is structured.
- Optional source links are stored.
- Admin can view feedback.
- Admin can create a follow-up source request or generation run from feedback.

### 12.18 Slice 18: Social Card Generation

Type: AFK

Blocked by: Slice 14

What to build:

Generate and store core share cards for case cover, one-sentence version, causal chain, debt map, and pain ranking.

Acceptance criteria:

- Social card jobs run after publish.
- Images are stored in R2.
- social_cards rows store public URLs and metadata.
- Case page share actions reference generated cards.
- OG metadata uses cover card.

### 12.19 Slice 19: Subscription Capture

Type: AFK

Blocked by: Slice 1

What to build:

Capture newsletter subscriptions without committing to a provider integration.

Acceptance criteria:

- Public subscribe form stores email and locale.
- Duplicate emails are handled.
- Confirmation state is shown.
- Admin can export or list subscribers.
- Future provider integration point is documented.

### 12.20 Slice 20: Seed Benchmark Case and End-to-End Demo

Type: AFK

Blocked by: Slices 2, 14, 15, 16

What to build:

Create a seeded, reviewed demo case snapshot so the public UI and publish flow can be verified before the full generation pipeline is production-ready.

Acceptance criteria:

- Seed case validates against contract.
- Seed case can be inserted into D1.
- Public latest and immutable routes render it.
- Homepage/question/pattern pages include it.
- E2E test covers the reader path.

### 12.21 Slice 21: Production Readiness Pass

Type: HITL

Blocked by: Slices 1-20

What to build:

Run a release readiness pass across security, QA gates, visual quality, Cloudflare bindings, provider secrets, and first content candidates.

Acceptance criteria:

- Staging deployment works.
- Admin Access policy is verified.
- D1 migrations run cleanly.
- R2 writes work.
- Queue/workflow execution works.
- Hard QA gates are tested.
- Public pages pass responsive visual review.
- First launch case list is approved.

Human decision needed:

- Confirm production Cloudflare project, domain, Access policy, and first published cases.

## 13. Implementation Order

Recommended order:

1. Slices 1-2: app and contract foundation.
2. Slices 3-6: intake, admin identity, run creation, async skeleton.
3. Slices 7-9: source, paper, evidence foundation.
4. Slices 10-13: generation modules, review, invalidation.
5. Slice 14: publish.
6. Slices 15-16: public reading surfaces.
7. Slices 17-19: feedback, social cards, subscription.
8. Slice 20: seed demo and E2E.
9. Slice 21: production readiness.

## 14. Open Implementation Choices

These do not block the PRD, but should be decided before or during implementation:

1. Exact full-stack framework package:
   - React Router v7 Cloudflare template vs Remix-style setup.
2. Async primitive:
   - Cloudflare Queues vs Cloudflare Workflows.
3. Search providers:
   - Keep provider adapters pluggable.
   - Decide the first production web search provider.
   - Decide the first paper/design-doc providers.
4. AI model/provider:
   - Keep generation adapter pluggable.
   - Start with one reliable provider/model configuration.
5. Social card rendering:
   - Worker-side image generation vs build-time/admin-triggered rendering.
6. Newsletter provider:
   - Capture in D1 first; provider can be integrated later.
7. Source snapshot policy:
   - Decide which source types are snapshotted fully into R2 and which only store metadata/excerpts.

## 15. Success Metrics

Content quality:

- Percentage of published cases with paper/design-doc coverage.
- Average unsupported factual claims at publish time: must be zero.
- Module rejection rate by type.
- Regeneration count per published case.
- Reader correction rate per case.

Reader engagement:

- Case page read depth.
- Module anchor copy/share actions.
- Social card opens/downloads.
- Topic request submissions.
- Subscription conversion.
- Return visits.

Operational:

- Generation run success rate.
- Average time from run start to ready for review.
- Average time from review to publish.
- QA blocker frequency.
- Source discovery failure rate.

## 16. Glossary

- redo case: A structured analysis of a technology's evolution through constraints, trade-offs, debt, fixes, and unresolved pain.
- module: A separately generated/reviewed section of a redo case.
- claim-evidence map: The mapping from factual or inferred statements to source evidence and confidence.
- source corpus: The selected set of sources used for a generation run.
- paper/design-doc coverage: Evidence that foundational papers, design docs, proposals, RFCs, KIPs, PEPs, or equivalent high-authority documents were searched and included where relevant.
- hard gate: A validation rule that blocks publication.
- stale module: A module whose upstream dependency changed after it was generated or approved.
- immutable version: A published snapshot that never changes after publication.
- latest route: A topic URL that points to the latest published version.
