import { z } from "zod";

import {
  BoundarySchema,
  CausalChainSchema,
  ClaimTypeSchema,
  ConfidenceSchema,
  DebtMapSchema,
  DesignQuestionSchema,
  EvidenceClaimSchema,
  OrientationSchema,
  PainPointSchema,
  PublishedSourceSummarySchema,
  REDO_CONTRACT_VERSION,
  RedoStageSchema,
  SourceEvidenceSchema,
  SourceTypeSchema,
  ThroughlineSchema,
  TransferablePatternSchema,
  TrustLevelSchema,
  type RedoCaseSnapshot,
} from "~/domain/redo/contract";
import { validateRedoCaseSnapshot } from "~/domain/redo/validators";

export const REDO_LOCAL_BUNDLE_VERSION = "redo_bundle_v1";
export const REDO_LOCAL_SOURCE_MODE = "local_redo_skill";

const BundleTopicSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  category: z.string().min(1).default("unknown"),
});

const BundleSourceSchema = PublishedSourceSummarySchema.extend({
  url: z.string().url(),
  sourceType: SourceTypeSchema,
  trustLevel: TrustLevelSchema,
});

const BundleSourceEvidenceSchema = SourceEvidenceSchema.extend({
  evidenceType: z
    .enum(["direct_quote", "paraphrase", "derived_signal"])
    .default("direct_quote"),
});

const BundleEvidenceClaimSchema = EvidenceClaimSchema.extend({
  claimType: ClaimTypeSchema,
  confidence: ConfidenceSchema,
});

export const RedoLocalBundleSchema = z.object({
  bundleVersion: z.literal(REDO_LOCAL_BUNDLE_VERSION),
  sourceMode: z.literal(REDO_LOCAL_SOURCE_MODE).default(REDO_LOCAL_SOURCE_MODE),
  promptVersion: z.string().min(1),
  exportedAt: z.string().optional(),
  language: z.enum(["zh", "en"]),
  topic: BundleTopicSchema,
  designQuestions: z.array(DesignQuestionSchema).optional(),
  sources: z.array(BundleSourceSchema).min(1),
  sourceEvidence: z.array(BundleSourceEvidenceSchema).min(1),
  evidenceClaims: z.array(BundleEvidenceClaimSchema).min(1),
  orientation: OrientationSchema,
  stages: z.array(RedoStageSchema).min(1),
  throughline: ThroughlineSchema,
  transferablePattern: TransferablePatternSchema,
  boundaries: z.array(BoundarySchema),
  debtMap: DebtMapSchema,
  painRanking: z.array(PainPointSchema),
  causalChain: CausalChainSchema,
});

export type RedoLocalBundle = z.infer<typeof RedoLocalBundleSchema>;

export function parseRedoLocalBundle(input: unknown): RedoLocalBundle {
  const parsed = RedoLocalBundleSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "$"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid redo bundle: ${message}`);
  }

  const snapshot = buildValidationSnapshot(parsed.data);
  const validation = validateRedoCaseSnapshot(snapshot);
  if (!validation.ok) {
    throw new Error(
      `Invalid redo bundle contract: ${validation.blockers
        .map((blocker) => `${blocker.path}: ${blocker.message}`)
        .join("; ")}`
    );
  }

  return parsed.data;
}

export function buildValidationSnapshot(
  bundle: RedoLocalBundle
): RedoCaseSnapshot {
  const inferenceCount = bundle.evidenceClaims.filter(
    (claim) => claim.claimType === "inference"
  ).length;
  const controversialJudgmentCount = bundle.evidenceClaims.filter(
    (claim) => claim.claimType === "controversial_judgment"
  ).length;

  return {
    contractVersion: REDO_CONTRACT_VERSION,
    language: bundle.language,
    topic: {
      id: `topic-${bundle.topic.slug}`,
      slug: bundle.topic.slug,
      displayName: bundle.topic.displayName,
      aliases: bundle.topic.aliases,
      category: bundle.topic.category,
    },
    version: {
      id: "local-import-preflight",
      number: 1,
      publishedAt: bundle.exportedAt || new Date(0).toISOString(),
      revisionNote: "Local redo import preflight.",
    },
    trust: {
      reviewed: true,
      sourceCount: bundle.sources.length,
      paperOrDesignDocCount: bundle.sources.filter((source) =>
        ["paper", "design_doc", "proposal", "standard"].includes(
          source.sourceType
        )
      ).length,
      claimCount: bundle.evidenceClaims.length,
      inferenceCount,
      controversialJudgmentCount,
    },
    orientation: bundle.orientation,
    designQuestions:
      bundle.designQuestions || designQuestionsFromStages(bundle.stages),
    stages: bundle.stages,
    throughline: bundle.throughline,
    transferablePattern: bundle.transferablePattern,
    boundaries: bundle.boundaries,
    debtMap: bundle.debtMap,
    painRanking: bundle.painRanking,
    causalChain: bundle.causalChain,
    sources: bundle.sources,
    sourceEvidence: bundle.sourceEvidence.map((evidence) => ({
      id: evidence.id,
      sourceId: evidence.sourceId,
      excerpt: evidence.excerpt,
      locator: evidence.locator,
      retrievedAt: evidence.retrievedAt,
      contentHash: evidence.contentHash,
      supportsClaimIds: evidence.supportsClaimIds,
    })),
    evidenceClaims: bundle.evidenceClaims,
    inferenceNotes: bundle.evidenceClaims
      .filter((claim) => claim.claimType !== "fact")
      .map((claim) => ({
        id: `inference-note-${claim.id}`,
        moduleId: claim.moduleId,
        note: claim.statement,
        basisClaimIds: claim.inferenceBasisClaimIds,
        confidence: claim.confidence,
      })),
    socialCards: [],
  };
}

function designQuestionsFromStages(
  stages: RedoLocalBundle["stages"]
): RedoCaseSnapshot["designQuestions"] {
  return stages.map((stage) => ({
    slug: stage.slug,
    title: stage.title,
    summary: stage.constraint,
  }));
}
