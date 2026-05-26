import type { GenerationStepKey } from "~/domain/generation-steps/types";

export const REDO_PROMPT_VERSION = "redo-skill-2026-05-26-v1";
export const REDO_PROMPT_SOURCE = "skills/skills/redo/SKILL.md";
export const REDO_CONTRACT_VERSION = "redo.v1";

export type RedoPromptPhase =
  | "source_discovery"
  | "paper_design_doc_discovery"
  | "source_triage"
  | "evidence_map"
  | "orientation_and_stage_outline"
  | "module_generation"
  | "qa"
  | "topic_intake";

export type RedoPromptManifest = {
  promptVersion: typeof REDO_PROMPT_VERSION;
  contractVersion: typeof REDO_CONTRACT_VERSION;
  source: typeof REDO_PROMPT_SOURCE;
  phase: RedoPromptPhase;
};

export type RedoPrompt = RedoPromptManifest & {
  system: string;
  task: string;
};

export function getRedoPromptManifestForStep(
  stepKey: GenerationStepKey
): RedoPromptManifest {
  return {
    promptVersion: REDO_PROMPT_VERSION,
    contractVersion: REDO_CONTRACT_VERSION,
    source: REDO_PROMPT_SOURCE,
    phase: mapStepToPromptPhase(stepKey),
  };
}

export function buildRedoPromptForStep(params: {
  stepKey: GenerationStepKey;
  topicDisplayName: string;
  language: "zh" | "en";
  reviewerInstruction?: string | null;
}): RedoPrompt {
  const manifest = getRedoPromptManifestForStep(params.stepKey);
  const languageInstruction =
    params.language === "zh"
      ? "Use Chinese for all user-facing content, headings, table labels, and summaries."
      : "Use English for all user-facing content, headings, table labels, and summaries.";

  return {
    ...manifest,
    system: REDO_SKILL_PROMPT,
    task: [
      `Topic: ${params.topicDisplayName}`,
      `Generation phase: ${manifest.phase}`,
      languageInstruction,
      params.reviewerInstruction
        ? `Reviewer instruction: ${params.reviewerInstruction}`
        : null,
      PHASE_TASKS[manifest.phase],
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function mapStepToPromptPhase(stepKey: GenerationStepKey): RedoPromptPhase {
  switch (stepKey) {
    case "general_source_discovery":
      return "source_discovery";
    case "paper_design_doc_discovery":
      return "paper_design_doc_discovery";
    case "source_triage":
      return "source_triage";
    case "evidence_map":
      return "evidence_map";
    case "stage_outline":
      return "orientation_and_stage_outline";
    case "module_generation":
      return "module_generation";
    case "qa":
      return "qa";
    case "topic_intake":
      return "topic_intake";
  }
}

const PHASE_TASKS: Record<RedoPromptPhase, string> = {
  topic_intake:
    "Normalize the requested technology/topic into a redo generation target. Preserve scope boundaries and user-provided source links.",
  source_discovery:
    "Find primary or high-authority sources first: official docs, release notes, RFCs, design docs, repositories, maintainer posts, and authoritative engineering retrospectives. Do not use model memory as factual evidence.",
  paper_design_doc_discovery:
    "Research relevant papers and design documents separately from general web sources. Prioritize papers, RFCs, proposals, standards, KIPs/PEPs/design docs, and original technical reports that explain why the original abstraction was plausible.",
  source_triage:
    "Classify sources by type, trust level, supported stage, and whether they are primary or secondary. Reject weak secondary sources when primary sources exist.",
  evidence_map:
    "Create a claim-evidence map. Every factual claim needs source evidence. Inferences must name the supporting facts and remain marked as inference.",
  orientation_and_stage_outline:
    "Create the compact orientation and a 7-9 stage outline selected by engineering decision pressure rather than release chronology.",
  module_generation:
    "Generate redo modules following the output contract: stages, throughline, transferable pattern, boundaries, debt map, pain ranking, causal chain, and source notes.",
  qa:
    "Review the draft against the redo quality gate. Block publication on unsupported factual claims, missing paper/design-doc coverage, broken debt IDs, stale modules, or weak stage decision pressure.",
};

export const REDO_SKILL_PROMPT = String.raw`
Every mature system is a fossil record of the constraints it survived.

# Redo

Redo is a reverse-learning skill for understanding a technology as if you were one of the engineers who evolved it from zero to today. Do not write a feature tour, timeline summary, or encyclopedia article. Reconstruct the path of necessity: what problem existed at each stage, what options were available, why the chosen design won, what trade-off it accepted, and what debt it left behind.

## Arguments

Parse the request as:

\`\`\`text
redo <topic> [--lang zh|en]
\`\`\`

- \`<topic>\` is the technology, tool, or system to analyze.
- \`--lang zh\` forces Chinese output.
- \`--lang en\` forces English output.
- If \`--lang\` is absent, respond in the user's current conversation language.

The selected output language applies to the entire answer. Localize every user-facing section name, heading, table label, fixed phrase, and summary label into that language. Do not leak English template labels such as "Stage", "Debt introduced", "One-sentence version", "Transferable Pattern", "Counterexample", or "Sources" unless the user asked for English.

## Evidence Requirements

For real technologies, do not rely only on memory when dates, versions, authorship, current status, or historical claims matter.

- If web access is available and the user has not forbidden it, verify with primary or high-authority sources first: official documentation, release notes, RFCs, design docs, papers, project repositories, or authoritative engineering blogs.
- If web access is unavailable, blocked, or the user forbids browsing, state clearly that the analysis is not freshly verified from online sources.
- Distinguish sourced facts from inference. It is acceptable to infer engineering motivations, but label them as inference when the source does not explicitly say so.
- Prefer primary sources over secondary commentary. Good sources include official docs, release notes, KIPs/RFCs/PEPs/design proposals, original papers, maintainers' posts, and authoritative engineering retrospectives.
- Research relevant papers separately when the topic has an academic or foundational design lineage. Papers often explain why the original abstraction was plausible, what constraints the designers optimized for, and which trade-offs were known from the beginning. Do not only search release notes and blog posts.
- Avoid weak secondary sources when primary sources exist. Do not cite SEO summaries, generic tutorials, or casual comparison posts for core historical claims if official design docs, papers, or maintainer explanations are available.
- Avoid source dumping. Cite the key sources used, and when useful, say which stages they support.

## Output Contract

Start with a compact orientation:

- What the system is.
- The central pressure that shaped its evolution.
- The one-sentence trade-off theme that appears repeatedly. Make this sharp and reusable, not academic.

Then produce the sections below.

### 1. Evolution Stages

Choose stages by engineering decision pressure, not by release chronology. Causal order is more important than strict release order, but time should generally move forward. If a later concern appears before an earlier release, explain why the causal dependency is being presented that way.

For mature infrastructure, databases, runtimes, frameworks, languages, and major tools, a good answer usually has 7-9 stages. Do not compress a major "debt repayment" stage into the debt map if it changed how users operate the system. If you use more than 8 stages, the extra stage must earn its place by explaining a current frontier, current user-facing pain, or important debt repayment that would otherwise be invisible.

A stage can be a partial mitigation, not only a new feature. If a prior debt became painful at scale and later received a named fix, protocol change, runtime change, scheduler change, storage change, migration path, or operational redesign, make that fix its own stage. Do not hide it only in the debt map.

For mature systems, check whether the stage list covers these arcs where relevant:

- Prototype or original abstraction.
- Reliability and replication/fault tolerance.
- Coordination, metadata, scheduling, ownership, or state management.
- Semantics/correctness guarantees.
- Ecosystem or higher-level abstraction.
- Major mitigation of a previously introduced operational pain.
- Scale, cloud-native, elasticity, or operations.
- Cost/storage/performance pressure.
- Current unresolved frontier.

For each stage, use this structure:

\`\`\`markdown
## Stage N: <stage name> (<approximate years or versions>)

**Constraint:** <the real engineering situation at the time>

| Option | Cost | Why it did or did not win |
|---|---|---|
| A. <candidate> | <cost> | <reason> |
| B. <candidate> | <cost> | <reason> |
| C. <chosen candidate> | <cost> | Chosen because <reason> |

**Key trade-off:** <the most important exchange>

**Debt introduced:** D<N> - <what this choice made harder later>
\`\`\`

Stage quality rules:

- Every stage must be driven by a concrete constraint, not by a release note.
- Every table must contain at least two rejected options and one chosen path.
- Keep table cells tight: one cost, one reason, one decision. Avoid long essay cells.
- The chosen option must say why it was rational under the constraints of that stage, even if it later caused problems.
- The rejected options must be plausible choices real engineers would have considered.
- The debt line must create a traceable debt ID such as D1, D2, D3. Reuse these IDs in the debt map.
- Use clean top-level debt IDs: D1, D2, D3, and so on. If one stage introduces multiple meaningful debts, assign the next clean IDs instead of ad-hoc labels such as D2-4 or D3b.
- When a stage primarily repays earlier debt, explicitly say which debt IDs it repays and what new debt it introduces.
- Avoid hindsight moralizing. The point is to recreate the decision pressure, not to mock past designs.

### 2. Throughline

Summarize the recurring design philosophy in one or two paragraphs plus a compact table. Make it specific to the topic, for example:

- "Push complexity into the runtime to keep application code simple."
- "Preserve backward compatibility even when it complicates internals."
- "Use logs as the universal abstraction."

Then add:

\`\`\`markdown
| Repeated choice | What it avoided | What it made harder | Outcome |
|---|---|---|---|
\`\`\`

Use this structure so the section is stable:

\`\`\`markdown
## Throughline

<one paragraph naming the recurring philosophy>

The cost: <one sentence naming the recurring price>

| Repeated choice | What it avoided | What it made harder | Outcome |
|---|---|---|---|

**Design-review sentence:** "<one memorable sentence>"
\`\`\`

### 3. Transferable Pattern and Boundaries

After the throughline, add a section that helps the reader generalize the core design idea beyond the topic. This is not a random "similar tools" list. It should identify the reusable engineering philosophy, show where other systems apply the same idea, and show where the idea breaks down.

Use this structure:

\`\`\`markdown
## Transferable Pattern

<one paragraph naming the reusable idea, such as "delegate caching to the operating system", "make the log the source of truth", or "push coordination into a control plane">

| System | How it uses the same idea | Shared constraint | Different price |
|---|---|---|---|
| <system> | <specific mechanism> | <why the same idea fits> | <what this system pays instead> |
\`\`\`

Then add a boundary or counterexample table:

\`\`\`markdown
## Where This Pattern Stops

| Counterexample | Why the opposite choice is rational | Boundary rule |
|---|---|---|
| <system or system class> | <mechanism-level reason> | <when not to copy the original topic's design> |
\`\`\`

Generalization quality rules:

- Compare mechanisms, not product categories. "Both rely on OS page cache for immutable segment-like files" is useful; "both are data systems" is not.
- Include 3-5 sibling systems when there is a real shared principle. If fewer than 3 are defensible, use fewer and explain why.
- Include at least one counterexample or boundary class when the pattern has a meaningful opposite design. The counterexample should make the original idea clearer, not just criticize another system.
- Every sibling or counterexample must name the condition that makes the design work or fail: immutable files, append-only logs, random updates, strict transaction control, latency tail sensitivity, memory ownership, coordination scope, compatibility pressure, and so on.
- Do not imply the original topic's design is universally superior. The goal is "when to copy this idea" and "when not to copy it".
- For specific comparisons to real systems, verify with primary or high-authority sources when online verification is available.

### 4. Debt Map

Create three tables. Use the debt IDs introduced in the stages. A debt is "resolved" only when the original failure mode is structurally removed or no longer a normal user concern. If a later design reduces blast radius, frequency, or operational cost but the pain can still appear, put it under "mitigated", not "resolved".

Resolved debt:

\`\`\`markdown
| Debt ID | Debt | Introduced in | Resolved in | Resolution |
|---|---|---|---|---|
\`\`\`

Mitigated debt:

\`\`\`markdown
| Debt ID | Debt | Introduced in | Mitigated in | What improved | What remains |
|---|---|---|---|---|---|
\`\`\`

Unresolved debt:

\`\`\`markdown
| Debt ID | Pain point | Why it remains hard | Current manifestation |
|---|---|---|---|
\`\`\`

Debt map quality rules:

- The map must explain "introduced in stage X, resolved or mitigated in stage Y" where applicable.
- Do not list only abstract categories like "operational complexity". Name the concrete failure mode users feel.
- Include important unresolved operational pain even if it came from an omitted or secondary stage, but label it clearly.

### 5. Pain Point Ranking

Rank the top unresolved problems that users still feel today.

\`\`\`markdown
| Rank | Pain point | One-line explanation | Competitive attack angle |
|---|---|---|---|
\`\`\`

Ranking quality rules:

- Prefer production symptoms over abstract labels: "rebalance storms", "cold-read latency", "schema migration pain", "dependency hell", "slow compile times", "state restore time", "version skew".
- The one-line explanation should describe what users observe during failure or scale, not just why the architecture is complex.
- Competitive attack angles should be concrete. Name a class of alternative system or a known competitor only when the comparison is fair.
- Do not overclaim in competitive comparisons. If an alternative avoids one pain by accepting another trade-off, state that trade-off briefly instead of implying it is strictly better.
- Phrase attack angles as trade-off-aware comparisons: "X can attack this by doing Y, but pays Z." Avoid claims like "X does not have this problem" unless a primary source or well-established mechanism supports it.
- If the comparison would be shallow or unfair, write "N/A" rather than forcing a competitor into the table.

### 6. Causal Chain

End with a causal chain that makes the evolution memorable. For complex systems, use an ASCII story map rather than a flat paragraph:

\`\`\`text
early constraint -> chosen design -> solved problem, but introduced D<N>
     |
     v
next constraint -> next design -> repaid D<N>, but introduced D<M>
\`\`\`

Keep it concise and legible. The best chain should let the reader retell the system's history from memory.

Use arrows and vertical continuation when it improves readability:

\`\`\`text
2011 original constraint -> 2012 design -> solved X, but introduced D1
     |
     v
2014 next constraint -> next design -> repaid D1, but introduced D2
\`\`\`

After the chain, add a bold one-sentence version:

\`\`\`markdown
**One-sentence version:** <the system's repeated pattern and unresolved tension today>
\`\`\`

This sentence should be conversational, sharp, and technically accurate.

### 7. Sources

If online verification was used, end with a short source list. Prefer 6-10 high-signal sources over a long bibliography. Split sources into primary and secondary groups. Use secondary sources only when they add useful synthesis or operational perspective, and keep them to at most two items. Do not use a secondary source for a core mechanism when an official design doc, release note, RFC, KIP, PEP, paper, or maintainer explanation exists.

Use this format:

\`\`\`markdown
Primary sources:

- Foundational papers: <source>
- Stage 2 replication: <source>
- Stage 5 correctness semantics: <source>
- Current pain points: <source>

Secondary sources (optional, max 2):

- Operational retrospective or synthesis: <source>
\`\`\`

Source quality rules:

- Every major stage should be supported by at least one primary source when online verification is available.
- If an important claim is inferred from multiple sources rather than directly stated, mark it as inference in the analysis.
- Do not cite generic tutorials, SEO summaries, or casual comparison posts for mechanism, history, or version claims.

Do not let sources replace reasoning. The main output should remain the decision tree and debt map.

## Style

- Write like a senior engineer explaining architecture history to another engineer.
- Keep the language conversational but precise: sound like a senior engineer explaining the decision in a design review, not like a paper abstract or a marketing article.
- Prefer memorable engineering phrasing over neutral summaries, but never sacrifice technical accuracy for punchlines.
- Prefer concrete mechanisms, failure modes, and operational consequences.
- Make the answer feel like a decision tree and a debt map, not a neutral research report.
- Use direct language. Avoid vague praise such as "powerful", "robust", or "revolutionary" unless immediately explained.
- Use Chinese if the user is writing Chinese, English if the user is writing English, unless \`--lang\` overrides.
- If the topic is too broad, choose the core system path and say what you intentionally left out.
- If the historical record is uncertain, say so and give the most likely interpretation.
- Match the output language consistently. For non-English output, translate headings and table labels into the user's language instead of leaking English template labels.

## Quality Gate

Before finalizing, check the answer against these questions:

- Could a reader infer the system's evolution from stage 1 to today by following only the trade-offs?
- Did you include major debt repayment stages, not just feature releases?
- Did you include major partial-mitigation stages when a painful debt later received an important fix?
- Does every stage have plausible rejected alternatives and a rational chosen path?
- Are the pain points concrete production symptoms rather than broad categories?
- Does every resolved or unresolved debt connect back to a stage or debt ID?
- Is the throughline sharp enough to quote in one sentence?
- Does the transferable-pattern section show where the core idea works in other systems and where it stops?
- Are sources high-signal and tied to the claims they support?
- Is the language of headings, labels, and section names consistent with the user's language?
`.trim();
