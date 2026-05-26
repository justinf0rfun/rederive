import { replaceClaimEvidenceMap } from "~/domain/claim-evidence/repository.server";
import { upsertDraftModule } from "~/domain/draft-modules/repository.server";
import type { DraftModuleType } from "~/domain/draft-modules/types";
import { initializeGenerationRun } from "~/domain/generation/orchestrator.server";
import { updateGenerationRunStatus } from "~/domain/generation-runs/repository.server";
import {
  BoundarySchema,
  CausalChainSchema,
  DebtMapSchema,
  OrientationSchema,
  PainPointSchema,
  REDO_CONTRACT_VERSION,
  RedoStageSchema,
  ThroughlineSchema,
  TransferablePatternSchema,
} from "~/domain/redo/contract";
import { upsertCandidateSourceDocuments } from "~/domain/sources/repository.server";
import type { CandidateSourceDocument } from "~/domain/sources/types";
import { parseRedoLocalBundle, type RedoLocalBundle } from "./schema";
import { parseRedoMarkdownToLocalBundle } from "./markdown";

type LocalRedoImportResult = {
  runId: string;
  topicId: string;
  topicDisplayName: string;
  sourceCount: number;
  claimCount: number;
  moduleCount: number;
};

type TopicRow = {
  id: string;
  slug: string;
};

export async function importLocalRedoBundle(
  db: D1Database,
  params: {
    bundleJson: string;
    importedBy: string;
  }
): Promise<LocalRedoImportResult> {
  const parsedJson = parseJson(params.bundleJson);
  const bundle = parseRedoLocalBundle(parsedJson);
  return importParsedLocalRedoBundle(db, {
    bundle,
    importedBy: params.importedBy,
  });
}

export async function importLocalRedoMarkdown(
  db: D1Database,
  params: {
    markdown: string;
    importedBy: string;
  }
): Promise<LocalRedoImportResult> {
  const bundle = parseRedoMarkdownToLocalBundle(params.markdown);
  return importParsedLocalRedoBundle(db, {
    bundle,
    importedBy: params.importedBy,
  });
}

async function importParsedLocalRedoBundle(
  db: D1Database,
  params: {
    bundle: RedoLocalBundle;
    importedBy: string;
  }
): Promise<LocalRedoImportResult> {
  const bundle = params.bundle;
  const topicId = await findOrCreateBundleTopic(db, bundle);
  const runId = crypto.randomUUID();

  await db
    .prepare(
      [
        "INSERT INTO generation_runs",
        "(id, topic_id, topic_request_id, language, contract_version, status, scope_json, created_by)",
        "VALUES (?, ?, NULL, ?, ?, 'imported_local_redo', ?, ?)",
      ].join(" ")
    )
    .bind(
      runId,
      topicId,
      bundle.language,
      REDO_CONTRACT_VERSION,
      JSON.stringify({
        source: "local_redo_bundle",
        bundleVersion: bundle.bundleVersion,
        sourceMode: bundle.sourceMode,
        promptVersion: bundle.promptVersion,
        exportedAt: bundle.exportedAt || null,
      }),
      params.importedBy
    )
    .run();

  await initializeGenerationRun(db, runId);
  await importSources(db, runId, bundle);
  await importClaimEvidence(db, runId, bundle);
  const moduleCount = await importDraftModules(db, runId, bundle);

  await updateGenerationRunStatus(db, {
    runId,
    status: "ready_for_review",
    errorCode: null,
    errorMessage: null,
    completed: true,
  });

  return {
    runId,
    topicId,
    topicDisplayName: bundle.topic.displayName,
    sourceCount: bundle.sources.length,
    claimCount: bundle.evidenceClaims.length,
    moduleCount,
  };
}

export function buildDraftModulesFromLocalBundle(bundle: RedoLocalBundle) {
  return [
    module("orientation", "orientation", bundle.orientation, OrientationSchema),
    module("stage_outline", "stage_outline", buildStageOutline(bundle), null),
    ...bundle.stages.map((stage) =>
      module(`stage_${stage.number}`, "stage", stage, RedoStageSchema)
    ),
    module("throughline", "throughline", bundle.throughline, ThroughlineSchema),
    module(
      "transferable_pattern",
      "transferable_pattern",
      bundle.transferablePattern,
      TransferablePatternSchema
    ),
    module("boundaries", "boundaries", { items: bundle.boundaries }, null, {
      ok: bundle.boundaries.every(
        (boundary) => BoundarySchema.safeParse(boundary).success
      ),
      blockers: bundle.boundaries.flatMap((boundary) => {
        const parsed = BoundarySchema.safeParse(boundary);
        return parsed.success ? [] : parsed.error.issues;
      }),
    }),
    module("debt_map", "debt_map", bundle.debtMap, DebtMapSchema),
    module("pain_ranking", "pain_ranking", { items: bundle.painRanking }, null, {
      ok: bundle.painRanking.every(
        (painPoint) => PainPointSchema.safeParse(painPoint).success
      ),
      blockers: bundle.painRanking.flatMap((painPoint) => {
        const parsed = PainPointSchema.safeParse(painPoint);
        return parsed.success ? [] : parsed.error.issues;
      }),
    }),
    module("causal_chain", "causal_chain", bundle.causalChain, CausalChainSchema),
    module("source_notes", "source_notes", buildSourceNotes(bundle), null),
  ];
}

async function findOrCreateBundleTopic(
  db: D1Database,
  bundle: RedoLocalBundle
): Promise<string> {
  const existing = await db
    .prepare("SELECT id, slug FROM topics WHERE slug = ?")
    .bind(bundle.topic.slug)
    .first<TopicRow>();
  if (existing) {
    return existing.id;
  }

  const topicId = crypto.randomUUID();
  await db
    .prepare(
      [
        "INSERT INTO topics",
        "(id, slug, display_name, aliases_json, category)",
        "VALUES (?, ?, ?, ?, ?)",
      ].join(" ")
    )
    .bind(
      topicId,
      bundle.topic.slug,
      bundle.topic.displayName,
      JSON.stringify(bundle.topic.aliases),
      bundle.topic.category
    )
    .run();

  return topicId;
}

async function importSources(
  db: D1Database,
  runId: string,
  bundle: RedoLocalBundle
) {
  const candidates: CandidateSourceDocument[] = bundle.sources.map((source) => ({
    id: source.id,
    url: source.url,
    canonicalUrl: source.url,
    title: source.title,
    retrievedAt: source.retrievedAt,
    sourceType: source.sourceType,
    trustLevel: source.trustLevel,
  }));

  await upsertCandidateSourceDocuments(db, runId, candidates);
}

async function importClaimEvidence(
  db: D1Database,
  runId: string,
  bundle: RedoLocalBundle
) {
  await replaceClaimEvidenceMap(db, runId, {
    evidence: bundle.sourceEvidence.map((evidence) => ({
      id: evidence.id,
      sourceId: evidence.sourceId,
      excerpt: evidence.excerpt,
      locator: evidence.locator,
      evidenceType: evidence.evidenceType,
      contentHash: evidence.contentHash,
    })),
    claims: bundle.evidenceClaims.map((claim) => ({
      id: claim.id,
      statement: claim.statement,
      claimType: claim.claimType,
      confidence: claim.confidence,
      moduleId: claim.moduleId,
      publishable: claim.publishable,
      sourceEvidenceIds: claim.sourceEvidenceIds,
      inferenceBasisClaimIds: claim.inferenceBasisClaimIds,
    })),
  });
}

async function importDraftModules(
  db: D1Database,
  runId: string,
  bundle: RedoLocalBundle
): Promise<number> {
  const modules = buildDraftModulesFromLocalBundle(bundle);

  for (const draft of modules) {
    await upsertDraftModule(db, {
      runId,
      moduleKey: draft.moduleKey,
      moduleType: draft.moduleType,
      content: draft.content,
      validation: draft.validation,
      generatedFromStepId: null,
    });
  }

  return modules.length;
}

function module(
  moduleKey: string,
  moduleType: DraftModuleType,
  content: Record<string, unknown>,
  schema: { safeParse: (input: unknown) => { success: boolean; error?: { issues: unknown[] } } } | null,
  validation?: Record<string, unknown>
) {
  const parsed = schema?.safeParse(content);
  return {
    moduleKey,
    moduleType,
    content,
    validation:
      validation ||
      (parsed
        ? {
            ok: parsed.success,
            blockers: parsed.success ? [] : parsed.error?.issues || [],
          }
        : { ok: true, blockers: [] }),
  };
}

function buildStageOutline(bundle: RedoLocalBundle): Record<string, unknown> {
  return {
    maturity: "mature",
    stageCount: bundle.stages.length,
    deviationJustification:
      bundle.stages.length >= 7 && bundle.stages.length <= 9
        ? null
        : `Imported local redo bundle has ${bundle.stages.length} stage(s).`,
    stages: bundle.stages.map((stage) => ({
      number: stage.number,
      slug: stage.slug,
      title: stage.title,
      pressure: stage.constraint,
      candidateOptions: stage.options.map((option) => option.name),
      expectedDebtIds: stage.debtsIntroduced.map((debt) => debt.debtId),
      claimIds: stage.claimIds,
    })),
  };
}

function buildSourceNotes(bundle: RedoLocalBundle): Record<string, unknown> {
  return {
    bundleVersion: bundle.bundleVersion,
    sourceMode: bundle.sourceMode,
    promptVersion: bundle.promptVersion,
    exportedAt: bundle.exportedAt || null,
    sourceCount: bundle.sources.length,
    paperOrDesignDocCount: bundle.sources.filter((source) =>
      ["paper", "design_doc", "proposal", "standard"].includes(
        source.sourceType
      )
    ).length,
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Invalid JSON: ${error.message}`
        : "Invalid JSON."
    );
  }
}
