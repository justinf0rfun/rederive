import { z } from "zod";

export const REDO_CONTRACT_VERSION = "redo.v1.0.0";

export const DebtIdSchema = z.string().regex(/^D[1-9]\d*$/, {
  message: "Debt IDs must use the D<N> format, starting at D1.",
});

export const SourceTypeSchema = z.enum([
  "official_docs",
  "release_notes",
  "design_doc",
  "proposal",
  "paper",
  "standard",
  "repository",
  "maintainer_post",
  "engineering_blog",
  "interview",
  "secondary_context",
]);

export const TrustLevelSchema = z.enum(["primary", "high", "medium", "low"]);
export const ClaimTypeSchema = z.enum([
  "fact",
  "inference",
  "controversial_judgment",
]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const TopicSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  displayName: z.string().min(1),
  aliases: z.array(z.string()),
  category: z.string().min(1),
});

export const VersionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  publishedAt: z.string().min(1),
  revisionNote: z.string(),
  supersedesVersionId: z.string().optional(),
});

export const TrustSummarySchema = z.object({
  reviewed: z.literal(true),
  sourceCount: z.number().int().nonnegative(),
  paperOrDesignDocCount: z.number().int().nonnegative(),
  claimCount: z.number().int().nonnegative(),
  inferenceCount: z.number().int().nonnegative(),
  controversialJudgmentCount: z.number().int().nonnegative(),
});

export const OrientationSchema = z.object({
  whatItIs: z.string().min(1),
  centralPressure: z.string().min(1),
  tradeoffTheme: z.string().min(1),
  oneSentenceVersion: z.string().min(1),
});

export const DesignQuestionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const StageOptionSchema = z.object({
  label: z.string().min(1),
  name: z.string().min(1),
  cost: z.string().min(1),
  outcome: z.enum(["rejected", "chosen"]),
  why: z.string().min(1),
});

export const StageDebtSchema = z.object({
  debtId: DebtIdSchema,
  summary: z.string().min(1),
});

export const RepaidDebtSchema = z.object({
  debtId: DebtIdSchema,
  repaymentType: z.enum(["resolved", "mitigated"]),
  summary: z.string().min(1),
});

export const RedoStageSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  slug: z.string().min(1),
  title: z.string().min(1),
  period: z.string().min(1),
  constraint: z.string().min(1),
  options: z.array(StageOptionSchema).min(3),
  keyTradeoff: z.string().min(1),
  debtsIntroduced: z.array(StageDebtSchema),
  debtsRepaid: z.array(RepaidDebtSchema).optional(),
  claimIds: z.array(z.string()),
  inferenceNoteIds: z.array(z.string()),
});

export const ThroughlineSchema = z.object({
  summary: z.string().min(1),
  cost: z.string().min(1),
  repeatedChoices: z
    .array(
      z.object({
        repeatedChoice: z.string().min(1),
        whatItAvoided: z.string().min(1),
        whatItMadeHarder: z.string().min(1),
        outcome: z.string().min(1),
      })
    )
    .min(1),
  designReviewSentence: z.string().min(1),
});

export const TransferablePatternSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  siblings: z
    .array(
      z.object({
        system: z.string().min(1),
        sameIdea: z.string().min(1),
        sharedConstraint: z.string().min(1),
        differentPrice: z.string().min(1),
      })
    )
    .min(1),
});

export const BoundarySchema = z.object({
  counterexample: z.string().min(1),
  oppositeChoice: z.string().min(1),
  boundaryRule: z.string().min(1),
});

export const DebtMapRowSchema = z.object({
  debtId: DebtIdSchema,
  debt: z.string().min(1),
  introducedInStage: z.string().min(1),
  resolvedOrMitigatedInStage: z.string().optional(),
  resolution: z.string().optional(),
  whatImproved: z.string().optional(),
  whatRemains: z.string().optional(),
  whyItRemainsHard: z.string().optional(),
  currentManifestation: z.string().optional(),
});

export const DebtMapSchema = z.object({
  resolved: z.array(DebtMapRowSchema),
  mitigated: z.array(DebtMapRowSchema),
  unresolved: z.array(DebtMapRowSchema),
});

export const PainPointSchema = z.object({
  rank: z.number().int().positive(),
  painPoint: z.string().min(1),
  oneLineExplanation: z.string().min(1),
  competitiveAttackAngle: z.string().min(1),
  relatedDebtIds: z.array(DebtIdSchema),
});

export const CausalChainSchema = z.object({
  story: z.string().min(1),
  oneSentenceVersion: z.string().min(1),
  stageRefs: z.array(z.string()),
  debtRefs: z.array(DebtIdSchema),
});

export const PublishedSourceSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  sourceType: SourceTypeSchema,
  trustLevel: TrustLevelSchema,
  retrievedAt: z.string().min(1),
  supportsClaimIds: z.array(z.string()),
});

export const SourceEvidenceSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  excerpt: z.string().min(1),
  locator: z.string().min(1),
  retrievedAt: z.string().min(1),
  contentHash: z.string().min(1),
  supportsClaimIds: z.array(z.string()),
});

export const EvidenceClaimSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  claimType: ClaimTypeSchema,
  confidence: ConfidenceSchema,
  moduleId: z.string().min(1),
  sourceEvidenceIds: z.array(z.string()),
  inferenceBasisClaimIds: z.array(z.string()),
  publishable: z.boolean(),
});

export const InferenceNoteSchema = z.object({
  id: z.string().min(1),
  moduleId: z.string().min(1),
  note: z.string().min(1),
  basisClaimIds: z.array(z.string()),
  confidence: ConfidenceSchema,
});

export const SocialCardManifestSchema = z.object({
  id: z.string().min(1),
  cardType: z.enum([
    "cover",
    "one_sentence",
    "causal_chain",
    "debt_map",
    "pain_ranking",
  ]),
  moduleKey: z.string().optional(),
  url: z.string().url().optional(),
  status: z.enum(["ready", "pending", "failed"]),
});

export const RedoCaseSnapshotSchema = z.object({
  contractVersion: z.literal(REDO_CONTRACT_VERSION),
  language: z.enum(["zh", "en"]),
  topic: TopicSchema,
  version: VersionSchema,
  trust: TrustSummarySchema,
  orientation: OrientationSchema,
  designQuestions: z.array(DesignQuestionSchema),
  stages: z.array(RedoStageSchema).min(1),
  throughline: ThroughlineSchema,
  transferablePattern: TransferablePatternSchema,
  boundaries: z.array(BoundarySchema),
  debtMap: DebtMapSchema,
  painRanking: z.array(PainPointSchema),
  causalChain: CausalChainSchema,
  sources: z.array(PublishedSourceSummarySchema),
  sourceEvidence: z.array(SourceEvidenceSchema),
  evidenceClaims: z.array(EvidenceClaimSchema),
  inferenceNotes: z.array(InferenceNoteSchema),
  socialCards: z.array(SocialCardManifestSchema),
});

export type RedoCaseSnapshot = z.infer<typeof RedoCaseSnapshotSchema>;
export type RedoStage = z.infer<typeof RedoStageSchema>;
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;
