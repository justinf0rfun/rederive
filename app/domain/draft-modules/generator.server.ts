import type { ClaimEvidenceMap } from "~/domain/claim-evidence/types";
import type { GenerationRun } from "~/domain/generation-runs/types";
import {
  BoundarySchema,
  CausalChainSchema,
  DebtMapSchema,
  OrientationSchema,
  PainPointSchema,
  RedoStageSchema,
  ThroughlineSchema,
  TransferablePatternSchema,
} from "~/domain/redo/contract";
import type {
  OrientationDraftContent,
  StageDraftContent,
  StageOutlineDraftContent,
} from "./types";

export function buildOrientationDraft(
  run: GenerationRun,
  claimEvidence: ClaimEvidenceMap
): {
  content: OrientationDraftContent;
  validation: Record<string, unknown>;
} {
  const claimIds = claimEvidence.claims.slice(0, 3).map((claim) => claim.id);
  const content: OrientationDraftContent = {
    whatItIs: `${run.topicDisplayName} is a mature technical system with decisions that can be reconstructed from source evidence.`,
    centralPressure: `${run.topicDisplayName} must balance simple user-facing abstractions against operational and architectural constraints that accumulate over time.`,
    tradeoffTheme:
      "The durable pattern is choosing a constrained design surface early, then paying for that choice as scale, compatibility, and maintainability demands rise.",
    oneSentenceVersion: `${run.topicDisplayName} is best understood as a sequence of rational trade-offs that produce useful capability and persistent design debt at the same time.`,
    claimIds,
  };

  const parsed = OrientationSchema.safeParse(content);
  return {
    content,
    validation: {
      ok: parsed.success,
      blockers: parsed.success ? [] : parsed.error.issues,
    },
  };
}

export function buildStageOutlineDraft(
  run: GenerationRun,
  claimEvidence: ClaimEvidenceMap
): {
  content: StageOutlineDraftContent;
  validation: Record<string, unknown>;
} {
  const claimIds = claimEvidence.claims.map((claim) => claim.id);
  const stages = [
    "Constrain the first usable abstraction",
    "Make the abstraction reliable under real workload",
    "Preserve compatibility while the surface expands",
    "Split internal boundaries without breaking user expectations",
    "Expose extension points while controlling complexity",
    "Operate the system at larger scale",
    "Pay down or isolate accumulated design debt",
  ].map((title, index) => ({
    number: index + 1,
    slug: `stage-${index + 1}`,
    title,
    pressure: `${run.topicDisplayName} faces a decision pressure around ${title.toLowerCase()}.`,
    candidateOptions: [
      "Keep the simplest current design",
      "Introduce a focused internal boundary",
      "Adopt a broader architecture with higher coordination cost",
    ],
    expectedDebtIds: [`D${index + 1}`],
    claimIds: claimIds.slice(0, Math.max(1, Math.min(2, claimIds.length))),
  }));
  const content: StageOutlineDraftContent = {
    maturity: "mature",
    stageCount: stages.length,
    deviationJustification: null,
    stages,
  };
  const stageResults = stages.map((stage) =>
    RedoStageSchema.safeParse({
      id: stage.slug,
      number: stage.number,
      slug: stage.slug,
      title: stage.title,
      period: "TBD from evidence",
      constraint: stage.pressure,
      options: stage.candidateOptions.map((option, optionIndex) => ({
        label: String.fromCharCode(65 + optionIndex),
        name: option,
        cost:
          optionIndex === 2
            ? "Higher coordination and migration cost."
            : "Lower immediate cost but less future flexibility.",
        outcome: optionIndex === 1 ? "chosen" : "rejected",
        why:
          optionIndex === 1
            ? "Balances near-term delivery against future change pressure."
            : "Leaves either too little room for change or too much upfront complexity.",
      })),
      keyTradeoff: "Short-term simplicity versus long-term adaptation cost.",
      debtsIntroduced: [
        {
          debtId: `D${stage.number}`,
          summary: `Unresolved pressure from ${stage.title.toLowerCase()}.`,
        },
      ],
      claimIds: stage.claimIds,
      inferenceNoteIds: [],
    })
  );

  return {
    content,
    validation: {
      ok:
        content.stageCount >= 7 &&
        content.stageCount <= 9 &&
        stageResults.every((result) => result.success),
      blockers: [
        ...(content.stageCount >= 7 && content.stageCount <= 9
          ? []
          : ["Mature topics should target 7-9 stages."]),
        ...stageResults.flatMap((result) =>
          result.success ? [] : result.error.issues
        ),
      ],
    },
  };
}

export function buildStageDraftsFromOutline(
  outline: StageOutlineDraftContent
): Array<{
  moduleKey: string;
  content: StageDraftContent;
  validation: Record<string, unknown>;
}> {
  return outline.stages.map((stage) => {
    const content: StageDraftContent = {
      id: stage.slug,
      number: stage.number,
      slug: stage.slug,
      title: stage.title,
      period: "TBD from evidence",
      constraint: stage.pressure,
      options: stage.candidateOptions.map((option, optionIndex) => ({
        label: String.fromCharCode(65 + optionIndex),
        name: option,
        cost:
          optionIndex === 2
            ? "Higher coordination, migration, and education cost."
            : "Lower immediate cost but a sharper future constraint.",
        outcome: optionIndex === 1 ? "chosen" : "rejected",
        why:
          optionIndex === 1
            ? "It is rational under the current constraint because it creates a focused boundary without forcing a full architectural rewrite."
            : "It is rejected because it either preserves too much accumulated pressure or overpays before the evidence justifies the migration.",
      })),
      keyTradeoff:
        "The stage trades immediate simplicity against the ability to adapt when the next constraint arrives.",
      debtsIntroduced: stage.expectedDebtIds.map((debtId) => ({
        debtId,
        summary: `Debt introduced by ${stage.title.toLowerCase()}.`,
      })),
      claimIds: stage.claimIds,
      inferenceNoteIds: [],
    };
    const parsed = RedoStageSchema.safeParse(content);

    return {
      moduleKey: `stage_${stage.number}`,
      content,
      validation: {
        ok: parsed.success,
        blockers: parsed.success ? [] : parsed.error.issues,
      },
    };
  });
}

export function buildAnalyticalDraftModulesFromStages(
  run: GenerationRun,
  stages: StageDraftContent[]
): Array<{
  moduleKey: string;
  moduleType:
    | "throughline"
    | "transferable_pattern"
    | "boundaries"
    | "debt_map"
    | "pain_ranking"
    | "causal_chain";
  content: Record<string, unknown>;
  validation: Record<string, unknown>;
}> {
  const debtIds = stages.flatMap((stage) =>
    stage.debtsIntroduced.map((debt) => debt.debtId)
  );
  const stageRefs = stages.map((stage) => stage.id);

  const throughline = {
    summary: `${run.topicDisplayName} repeatedly chooses bounded internal structure over either passive drift or premature full rewrites.`,
    cost: "The repeated cost is deferred migration pressure and a growing need to preserve compatibility with earlier decisions.",
    repeatedChoices: stages.slice(0, 3).map((stage) => ({
      repeatedChoice: stage.title,
      whatItAvoided: "Avoided broad, high-risk rewrites before the constraint was proven.",
      whatItMadeHarder: "Made later boundary changes and debt repayment more coordinated.",
      outcome: "Created a usable local optimum with visible follow-on debt.",
    })),
    designReviewSentence: `${run.topicDisplayName} should be reviewed as a chain of rational local choices with compounding coordination cost.`,
  };
  const transferablePattern = {
    name: "Focused boundary before broad rewrite",
    summary:
      "A mature system can absorb pressure by adding narrow internal boundaries before committing to a full architectural replacement.",
    siblings: [
      {
        system: "PostgreSQL",
        sameIdea: "Preserve stable external behavior while evolving internals.",
        sharedConstraint: "Compatibility limits the shape and pace of internal change.",
        differentPrice: "Database correctness makes migration risk more expensive.",
      },
      {
        system: "React",
        sameIdea: "Introduce new execution boundaries while keeping application code viable.",
        sharedConstraint: "Userland compatibility constrains architectural cleanup.",
        differentPrice: "Ecosystem churn becomes the dominant cost.",
      },
    ],
  };
  const boundaries = [
    {
      counterexample: "A greenfield system with no compatibility burden may benefit from a larger upfront architecture.",
      oppositeChoice: "Choose the broader architecture before user-facing constraints harden.",
      boundaryRule:
        "Use the focused-boundary pattern when compatibility and migration risk are already material constraints.",
    },
  ];
  const debtMap = {
    resolved: stages.slice(0, 2).map((stage) => ({
      debtId: stage.debtsIntroduced[0]?.debtId || "D1",
      debt: stage.debtsIntroduced[0]?.summary || "Early design pressure.",
      introducedInStage: stage.id,
      resolvedOrMitigatedInStage: stages[Math.min(stage.number, stages.length - 1)]?.id,
      resolution: "The pressure is resolved by introducing a more explicit boundary.",
      whatImproved: "The system becomes easier to reason about locally.",
    })),
    mitigated: stages.slice(2, 5).map((stage) => ({
      debtId: stage.debtsIntroduced[0]?.debtId || `D${stage.number}`,
      debt: stage.debtsIntroduced[0]?.summary || "Mid-stage design pressure.",
      introducedInStage: stage.id,
      resolvedOrMitigatedInStage: stages[Math.min(stage.number, stages.length - 1)]?.id,
      resolution: "The pressure is contained but not fully removed.",
      whatImproved: "Operational and implementation choices get clearer boundaries.",
      whatRemains: "Compatibility and migration cost still shape future work.",
    })),
    unresolved: stages.slice(5).map((stage) => ({
      debtId: stage.debtsIntroduced[0]?.debtId || `D${stage.number}`,
      debt: stage.debtsIntroduced[0]?.summary || "Late-stage design pressure.",
      introducedInStage: stage.id,
      whatRemains: "The debt remains visible in current extension and migration work.",
      whyItRemainsHard: "Resolving it requires coordination across established users and internals.",
      currentManifestation:
        "Present-day changes must preserve historical behavior while improving the internal model.",
    })),
  };
  const painRanking = debtIds.slice(0, 5).map((debtId, index) => ({
    rank: index + 1,
    painPoint: `${run.topicDisplayName} present-day pressure ${index + 1}`,
    oneLineExplanation:
      "The current symptom is coordination cost around a historical design choice.",
    competitiveAttackAngle:
      "A competitor can attack by narrowing the supported surface, but pays with lower compatibility and ecosystem trust.",
    relatedDebtIds: [debtId],
  }));
  const causalChain = {
    story: `${run.topicDisplayName} accumulates debt because each stage chooses a locally rational boundary that preserves momentum while leaving future coordination work.`,
    oneSentenceVersion:
      "Early simplicity creates adoption, adoption creates compatibility pressure, and compatibility makes later cleanup expensive.",
    stageRefs,
    debtRefs: debtIds,
  };

  return [
    module("throughline", "throughline", throughline, ThroughlineSchema.safeParse(throughline)),
    module(
      "transferable_pattern",
      "transferable_pattern",
      transferablePattern,
      TransferablePatternSchema.safeParse(transferablePattern)
    ),
    module("boundaries", "boundaries", { items: boundaries }, {
      success: boundaries.every((boundary) => BoundarySchema.safeParse(boundary).success),
      error: { issues: [] },
    }),
    module("debt_map", "debt_map", debtMap, DebtMapSchema.safeParse(debtMap)),
    module("pain_ranking", "pain_ranking", { items: painRanking }, {
      success: painRanking.every((painPoint) => PainPointSchema.safeParse(painPoint).success),
      error: { issues: [] },
    }),
    module("causal_chain", "causal_chain", causalChain, CausalChainSchema.safeParse(causalChain)),
  ];
}

function module(
  moduleKey: string,
  moduleType:
    | "throughline"
    | "transferable_pattern"
    | "boundaries"
    | "debt_map"
    | "pain_ranking"
    | "causal_chain",
  content: Record<string, unknown>,
  parsed: { success: boolean; error?: { issues: unknown[] } }
) {
  return {
    moduleKey,
    moduleType,
    content,
    validation: {
      ok: parsed.success,
      blockers: parsed.success ? [] : parsed.error?.issues || [],
    },
  };
}
