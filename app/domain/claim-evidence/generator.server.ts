import type { GenerationRun } from "~/domain/generation-runs/types";
import type { SourceDocument } from "~/domain/sources/types";
import type { CandidateEvidenceClaim, CandidateSourceEvidence } from "./types";

export function buildDeterministicClaimEvidenceMap(params: {
  run: GenerationRun;
  sources: SourceDocument[];
}): {
  evidence: CandidateSourceEvidence[];
  claims: CandidateEvidenceClaim[];
} {
  const usableSources = params.sources.filter(
    (source) => source.status !== "rejected"
  );
  const primarySource =
    usableSources.find((source) =>
      ["paper", "design_doc", "proposal", "standard"].includes(
        source.sourceType
      )
    ) || usableSources[0];
  const supportSource =
    usableSources.find((source) => source.id !== primarySource?.id) ||
    primarySource;

  if (!primarySource || !supportSource) {
    return { evidence: [], claims: [] };
  }

  const topic = params.run.topicDisplayName;
  const factEvidenceId = stableId("evidence", params.run.id, "fact");
  const supportEvidenceId = stableId("evidence", params.run.id, "support");
  const factClaimId = stableId("claim", params.run.id, "core-fact");
  const inferenceClaimId = stableId("claim", params.run.id, "inference");
  const judgmentClaimId = stableId("claim", params.run.id, "judgment");

  return {
    evidence: [
      {
        id: factEvidenceId,
        sourceId: primarySource.id,
        excerpt: `${topic} has primary source material suitable for reconstructing its design constraints.`,
        locator: primarySource.title || primarySource.url,
        evidenceType: "paraphrase",
      },
      {
        id: supportEvidenceId,
        sourceId: supportSource.id,
        excerpt: `${topic} also has implementation or documentation evidence that can anchor module-level claims.`,
        locator: supportSource.title || supportSource.url,
        evidenceType: "paraphrase",
      },
    ],
    claims: [
      {
        id: factClaimId,
        statement: `${topic} has source evidence available for its design history and implementation context.`,
        claimType: "fact",
        confidence: "high",
        moduleId: "orientation",
        publishable: true,
        sourceEvidenceIds: [factEvidenceId, supportEvidenceId],
      },
      {
        id: inferenceClaimId,
        statement: `${topic} should be explained through engineering pressure and trade-off accumulation rather than a simple release timeline.`,
        claimType: "inference",
        confidence: "medium",
        moduleId: "stage_outline",
        publishable: true,
        inferenceBasisClaimIds: [factClaimId],
      },
      {
        id: judgmentClaimId,
        statement: `${topic} likely contains unresolved design debt that should be tracked explicitly across stages.`,
        claimType: "controversial_judgment",
        confidence: "medium",
        moduleId: "debt_map",
        publishable: true,
        inferenceBasisClaimIds: [factClaimId, inferenceClaimId],
      },
    ],
  };
}

function stableId(prefix: string, runId: string, suffix: string): string {
  return `${prefix}-${runId.slice(0, 8)}-${suffix}`;
}
