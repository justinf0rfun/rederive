import { buildDeterministicClaimEvidenceMap } from "~/domain/claim-evidence/generator.server";
import {
  evaluateClaimEvidenceMap,
  listClaimEvidenceMap,
  upsertClaimEvidenceMap,
} from "~/domain/claim-evidence/repository.server";
import {
  buildAnalyticalDraftModulesFromStages,
  buildOrientationDraft,
  buildStageDraftsFromOutline,
  buildStageOutlineDraft,
} from "~/domain/draft-modules/generator.server";
import {
  evaluateDraftModulesForRun,
  getDraftModuleByRunAndKey,
  upsertDraftModule,
} from "~/domain/draft-modules/repository.server";
import type { StageOutlineDraftContent } from "~/domain/draft-modules/types";
import type { StageDraftContent } from "~/domain/draft-modules/types";
import {
  ensureInitialGenerationSteps,
  listGenerationSteps,
  markStepCompleted,
  markStepFailed,
  markStepRunning,
  resetFailedGenerationSteps,
} from "~/domain/generation-steps/repository.server";
import type {
  GenerationStep,
  GenerationStepKey,
} from "~/domain/generation-steps/types";
import {
  getGenerationRunById,
  updateGenerationRunStatus,
} from "~/domain/generation-runs/repository.server";
import {
  discoverCandidateSourcesForRun,
  discoverPaperDesignDocSourcesForRun,
} from "~/domain/sources/discovery.server";
import {
  evaluatePaperDesignDocCoverage,
  evaluateSourceCorpus,
  listSourceDocuments,
  upsertCandidateSourceDocuments,
} from "~/domain/sources/repository.server";
import type { GenerationMessage } from "./messages";

export type GenerationWorkflowStepResult =
  | {
      status: "completed" | "already_completed";
      runId: string;
      stepKey: GenerationStepKey;
    }
  | {
      status: "blocked";
      runId: string;
      stepKey: GenerationStepKey;
      message: string;
    };

export type GenerationWorkflowFinalResult =
  | {
      status: "ready_for_review";
      runId: string;
    }
  | {
      status: "blocked";
      runId: string;
      code: string;
      message: string;
    };

class SourceCorpusBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceCorpusBlockedError";
  }
}

class PaperCoverageBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaperCoverageBlockedError";
  }
}

class ClaimEvidenceBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimEvidenceBlockedError";
  }
}

class DraftModuleBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftModuleBlockedError";
  }
}

export async function initializeGenerationRun(
  db: D1Database,
  runId: string
): Promise<void> {
  await ensureInitialGenerationSteps(db, runId);
}

export async function retryGenerationRun(
  db: D1Database,
  runId: string
): Promise<void> {
  await resetFailedGenerationSteps(db, runId);
  await updateGenerationRunStatus(db, {
    runId,
    status: "queued",
    errorCode: null,
    errorMessage: null,
  });
}

export async function handleGenerationMessage(
  db: D1Database,
  message: GenerationMessage
): Promise<void> {
  if (message.type === "retry_run") {
    await retryGenerationRun(db, message.runId);
  }

  await runDeterministicGenerationSkeleton(db, message.runId);
}

export async function runDeterministicGenerationSkeleton(
  db: D1Database,
  runId: string
): Promise<void> {
  await ensureInitialGenerationSteps(db, runId);
  await updateGenerationRunStatus(db, { runId, status: "running" });

  const steps = await listGenerationSteps(db, runId);

  try {
    for (const step of steps) {
      if (step.status === "completed") {
        continue;
      }

      await runFakeStep(db, step);
    }

    await finalizeGenerationRunQualityGates(db, runId);
  } catch (error) {
    if (error instanceof SourceCorpusBlockedError) {
      return;
    }

    if (error instanceof PaperCoverageBlockedError) {
      return;
    }

    if (error instanceof ClaimEvidenceBlockedError) {
      return;
    }

    if (error instanceof DraftModuleBlockedError) {
      return;
    }

    await updateGenerationRunStatus(db, {
      runId,
      status: "failed",
      errorCode: "generation_step_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function runGenerationWorkflowStep(
  db: D1Database,
  runId: string,
  stepKey: GenerationStepKey
): Promise<GenerationWorkflowStepResult> {
  await ensureInitialGenerationSteps(db, runId);
  await updateGenerationRunStatus(db, { runId, status: "running" });

  const steps = await listGenerationSteps(db, runId);
  const step = steps.find((candidate) => candidate.stepKey === stepKey);

  if (!step) {
    throw new Error(`Generation step ${stepKey} was not initialized.`);
  }

  if (step.status === "completed") {
    return { status: "already_completed", runId, stepKey };
  }

  try {
    await runFakeStep(db, step);
    return { status: "completed", runId, stepKey };
  } catch (error) {
    if (isExpectedGenerationBlocker(error)) {
      return {
        status: "blocked",
        runId,
        stepKey,
        message: error instanceof Error ? error.message : "Generation blocked.",
      };
    }

    await updateGenerationRunStatus(db, {
      runId,
      status: "failed",
      errorCode: "generation_step_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function finalizeGenerationRunQualityGates(
  db: D1Database,
  runId: string
): Promise<GenerationWorkflowFinalResult> {
  const sourceEvaluation = await evaluateSourceCorpus(db, runId);
  if (sourceEvaluation.sourceCount > 0 && !sourceEvaluation.sufficient) {
    const message = sourceEvaluation.reason || "Source corpus is insufficient.";
    await updateGenerationRunStatus(db, {
      runId,
      status: "blocked_source_insufficient",
      errorCode: "source_corpus_insufficient",
      errorMessage: message,
    });
    return {
      status: "blocked",
      runId,
      code: "source_corpus_insufficient",
      message,
    };
  }

  const paperCoverage = await evaluatePaperDesignDocCoverage(db, runId);
  if (!paperCoverage.sufficient) {
    const message =
      paperCoverage.reason || "Paper/design-doc coverage is insufficient.";
    await updateGenerationRunStatus(db, {
      runId,
      status: "blocked_paper_coverage_insufficient",
      errorCode: "paper_design_doc_coverage_insufficient",
      errorMessage: message,
    });
    return {
      status: "blocked",
      runId,
      code: "paper_design_doc_coverage_insufficient",
      message,
    };
  }

  const claimEvidenceEvaluation = await evaluateClaimEvidenceMap(db, runId);
  if (!claimEvidenceEvaluation.sufficient) {
    const message = claimEvidenceEvaluation.blockers.join(" ");
    await updateGenerationRunStatus(db, {
      runId,
      status: "blocked_claim_evidence_incomplete",
      errorCode: "claim_evidence_incomplete",
      errorMessage: message,
    });
    return {
      status: "blocked",
      runId,
      code: "claim_evidence_incomplete",
      message,
    };
  }

  const draftModuleEvaluation = await evaluateDraftModulesForRun(db, runId);
  if (!draftModuleEvaluation.sufficient) {
    const message = draftModuleEvaluation.blockers.join(" ");
    await updateGenerationRunStatus(db, {
      runId,
      status: "blocked_contract_validation_failed",
      errorCode: "draft_modules_blocked",
      errorMessage: message,
    });
    return {
      status: "blocked",
      runId,
      code: "draft_modules_blocked",
      message,
    };
  }

  await updateGenerationRunStatus(db, {
    runId,
    status: "ready_for_review",
    completed: true,
  });
  return { status: "ready_for_review", runId };
}

function isExpectedGenerationBlocker(error: unknown): boolean {
  return (
    error instanceof SourceCorpusBlockedError ||
    error instanceof PaperCoverageBlockedError ||
    error instanceof ClaimEvidenceBlockedError ||
    error instanceof DraftModuleBlockedError
  );
}

async function runFakeStep(db: D1Database, step: GenerationStep): Promise<void> {
  await markStepRunning(db, step.runId, step.stepKey);

  if (step.input.forceFailure === true) {
    const error = {
      code: "forced_failure",
      message: `Forced failure for ${step.stepKey}.`,
    };
    await markStepFailed(db, step.runId, step.stepKey, error);
    throw new Error(error.message);
  }

  if (step.stepKey === "general_source_discovery") {
    const run = await loadGenerationRunForStep(db, step);

    const candidates = discoverCandidateSourcesForRun(run);
    const sources = await upsertCandidateSourceDocuments(
      db,
      step.runId,
      candidates
    );
    const evaluation = await evaluateSourceCorpus(db, step.runId);

    if (!evaluation.sufficient) {
      const error = {
        code: "source_corpus_insufficient",
        message: evaluation.reason || "Source corpus is insufficient.",
        evaluation,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_source_insufficient",
        errorCode: "source_corpus_insufficient",
        errorMessage: error.message,
      });
      throw new SourceCorpusBlockedError(error.message);
    }

    await markStepCompleted(db, step.runId, step.stepKey, {
      mode: "deterministic_source_discovery_stub",
      stepKey: step.stepKey,
      discoveredSourceCount: sources.length,
      evaluation,
      sourceIds: sources.map((source) => source.id),
      completedAt: new Date().toISOString(),
    });
    return;
  }

  if (step.stepKey === "paper_design_doc_discovery") {
    const run = await loadGenerationRunForStep(db, step);
    const requestOrdinal =
      typeof step.input.requestedMoreSourcesCount === "number"
        ? step.input.requestedMoreSourcesCount
        : 0;
    const candidates = discoverPaperDesignDocSourcesForRun(run, requestOrdinal);
    const sources = await upsertCandidateSourceDocuments(
      db,
      step.runId,
      candidates
    );
    const coverage = await evaluatePaperDesignDocCoverage(db, step.runId);

    if (!coverage.sufficient) {
      const error = {
        code: "paper_design_doc_coverage_insufficient",
        message:
          coverage.reason || "Paper/design-doc coverage is insufficient.",
        coverage,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_paper_coverage_insufficient",
        errorCode: "paper_design_doc_coverage_insufficient",
        errorMessage: error.message,
      });
      throw new PaperCoverageBlockedError(error.message);
    }

    await markStepCompleted(db, step.runId, step.stepKey, {
      mode: "deterministic_paper_design_doc_discovery_stub",
      stepKey: step.stepKey,
      discoveredSourceCount: sources.length,
      coverage,
      sourceIds: sources.map((source) => source.id),
      requestedMoreSourcesCount: requestOrdinal,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  if (step.stepKey === "qa") {
    const steps = await listGenerationSteps(db, step.runId);
    const paperDesignDocStep = steps.find(
      (candidate) => candidate.stepKey === "paper_design_doc_discovery"
    );

    if (paperDesignDocStep?.status !== "completed") {
      const error = {
        code: "paper_design_doc_step_incomplete",
        message: "QA requires completed paper/design-doc discovery.",
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_paper_coverage_insufficient",
        errorCode: "paper_design_doc_step_incomplete",
        errorMessage: error.message,
      });
      throw new PaperCoverageBlockedError(error.message);
    }

    const coverage = await evaluatePaperDesignDocCoverage(db, step.runId);
    if (!coverage.sufficient) {
      const error = {
        code: "paper_design_doc_coverage_insufficient",
        message:
          coverage.reason || "Paper/design-doc coverage is insufficient.",
        coverage,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_paper_coverage_insufficient",
        errorCode: "paper_design_doc_coverage_insufficient",
        errorMessage: error.message,
      });
      throw new PaperCoverageBlockedError(error.message);
    }

    const claimEvidenceEvaluation = await evaluateClaimEvidenceMap(db, step.runId);
    if (!claimEvidenceEvaluation.sufficient) {
      const error = {
        code: "claim_evidence_incomplete",
        message: claimEvidenceEvaluation.blockers.join(" "),
        evaluation: claimEvidenceEvaluation,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_claim_evidence_incomplete",
        errorCode: "claim_evidence_incomplete",
        errorMessage: error.message,
      });
      throw new ClaimEvidenceBlockedError(error.message);
    }

    const draftModuleEvaluation = await evaluateDraftModulesForRun(db, step.runId);
    if (!draftModuleEvaluation.sufficient) {
      const error = {
        code: "draft_modules_blocked",
        message: draftModuleEvaluation.blockers.join(" "),
        evaluation: draftModuleEvaluation,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_contract_validation_failed",
        errorCode: "draft_modules_blocked",
        errorMessage: error.message,
      });
      throw new DraftModuleBlockedError(error.message);
    }

    await markStepCompleted(db, step.runId, step.stepKey, {
      mode: "deterministic_qa_stub",
      stepKey: step.stepKey,
      paperDesignDocCoverage: coverage,
      claimEvidenceEvaluation,
      summary: "Completed QA with paper/design-doc coverage gate.",
      completedAt: new Date().toISOString(),
    });
    return;
  }

  if (step.stepKey === "evidence_map") {
    const run = await loadGenerationRunForStep(db, step);
    const sources = await listSourceDocuments(db, step.runId);
    const generated = buildDeterministicClaimEvidenceMap({ run, sources });
    const claimEvidenceMap = await upsertClaimEvidenceMap(
      db,
      step.runId,
      generated
    );
    const evaluation = await evaluateClaimEvidenceMap(db, step.runId);

    if (!evaluation.sufficient) {
      const error = {
        code: "claim_evidence_incomplete",
        message: evaluation.blockers.join(" "),
        evaluation,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_claim_evidence_incomplete",
        errorCode: "claim_evidence_incomplete",
        errorMessage: error.message,
      });
      throw new ClaimEvidenceBlockedError(error.message);
    }

    await markStepCompleted(db, step.runId, step.stepKey, {
      mode: "deterministic_claim_evidence_map_stub",
      stepKey: step.stepKey,
      evidenceCount: claimEvidenceMap.evidence.length,
      claimCount: claimEvidenceMap.claims.length,
      evaluation,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  if (step.stepKey === "stage_outline") {
    const run = await loadGenerationRunForStep(db, step);
    const claimEvidence = await listClaimEvidenceMap(db, step.runId);
    const orientation = buildOrientationDraft(run, claimEvidence);
    const stageOutline = buildStageOutlineDraft(run, claimEvidence);

    const orientationModule = await upsertDraftModule(db, {
      runId: step.runId,
      moduleKey: "orientation",
      moduleType: "orientation",
      content: orientation.content,
      validation: orientation.validation,
      generatedFromStepId: step.id,
    });
    const stageOutlineModule = await upsertDraftModule(db, {
      runId: step.runId,
      moduleKey: "stage_outline",
      moduleType: "stage_outline",
      content: stageOutline.content,
      validation: stageOutline.validation,
      generatedFromStepId: step.id,
    });

    const blockers = [
      ...extractValidationBlockers(orientation.validation),
      ...extractValidationBlockers(stageOutline.validation),
    ];
    if (blockers.length > 0) {
      const error = {
        code: "stage_outline_validation_failed",
        message: blockers.join(" "),
        blockers,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_contract_validation_failed",
        errorCode: "stage_outline_validation_failed",
        errorMessage: error.message,
      });
      throw new Error(error.message);
    }

    await markStepCompleted(db, step.runId, step.stepKey, {
      mode: "deterministic_stage_outline_stub",
      stepKey: step.stepKey,
      moduleIds: [orientationModule.id, stageOutlineModule.id],
      stageCount: stageOutline.content.stageCount,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  if (step.stepKey === "module_generation") {
    const outlineModule = await getDraftModuleByRunAndKey(
      db,
      step.runId,
      "stage_outline"
    );
    if (!outlineModule) {
      const error = {
        code: "stage_outline_missing",
        message: "Stage modules require a generated stage outline.",
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      throw new Error(error.message);
    }

    const stageDrafts = buildStageDraftsFromOutline(
      outlineModule.content as StageOutlineDraftContent
    );
    const modules = [];
    for (const stageDraft of stageDrafts) {
      modules.push(
        await upsertDraftModule(db, {
          runId: step.runId,
          moduleKey: stageDraft.moduleKey,
          moduleType: "stage",
          content: stageDraft.content,
          validation: stageDraft.validation,
          generatedFromStepId: step.id,
        })
      );
    }
    const stageContents = stageDrafts.map((stageDraft) => stageDraft.content);
    const run = await loadGenerationRunForStep(db, step);
    const analyticalDrafts = buildAnalyticalDraftModulesFromStages(
      run,
      stageContents as StageDraftContent[]
    );
    for (const analyticalDraft of analyticalDrafts) {
      modules.push(
        await upsertDraftModule(db, {
          runId: step.runId,
          moduleKey: analyticalDraft.moduleKey,
          moduleType: analyticalDraft.moduleType,
          content: analyticalDraft.content,
          validation: analyticalDraft.validation,
          generatedFromStepId: step.id,
        })
      );
    }

    const blockers = [...stageDrafts, ...analyticalDrafts].flatMap((draft) =>
      extractValidationBlockers(draft.validation)
    );
    if (blockers.length > 0) {
      const error = {
        code: "stage_module_validation_failed",
        message: blockers.join(" "),
        blockers,
      };
      await markStepFailed(db, step.runId, step.stepKey, error);
      await updateGenerationRunStatus(db, {
        runId: step.runId,
        status: "blocked_contract_validation_failed",
        errorCode: "stage_module_validation_failed",
        errorMessage: error.message,
      });
      throw new Error(error.message);
    }

    await markStepCompleted(db, step.runId, step.stepKey, {
      mode: "deterministic_stage_module_stub",
      stepKey: step.stepKey,
      moduleIds: modules.map((module) => module.id),
      stageCount: stageDrafts.length,
      analyticalModuleCount: analyticalDrafts.length,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  await markStepCompleted(db, step.runId, step.stepKey, {
    mode: "deterministic_stub",
    stepKey: step.stepKey,
    summary: `Completed ${step.stepKey} with fake output.`,
    completedAt: new Date().toISOString(),
  });
}

function extractValidationBlockers(validation: Record<string, unknown>): string[] {
  if (validation.ok === true) {
    return [];
  }

  const blockers = validation.blockers;
  if (!Array.isArray(blockers)) {
    return ["Module validation failed."];
  }

  return blockers.map((blocker) =>
    typeof blocker === "string" ? blocker : JSON.stringify(blocker)
  );
}

async function loadGenerationRunForStep(
  db: D1Database,
  step: GenerationStep
) {
  const run = await getGenerationRunById(db, step.runId);
  if (!run) {
    const error = {
      code: "generation_run_not_found",
      message: `Generation run ${step.runId} could not be loaded.`,
    };
    await markStepFailed(db, step.runId, step.stepKey, error);
    throw new Error(error.message);
  }

  return run;
}
