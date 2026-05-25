import type {
  DraftModule,
  DraftModuleReviewAction,
  DraftModuleStatus,
  DraftModuleType,
} from "./types";

const STAGE_DOWNSTREAM_MODULE_TYPES: DraftModuleType[] = [
  "throughline",
  "transferable_pattern",
  "boundaries",
  "debt_map",
  "pain_ranking",
  "causal_chain",
  "source_notes",
  "social_card_manifest",
];

const STAGE_OUTLINE_DOWNSTREAM_MODULE_TYPES: DraftModuleType[] = [
  "stage",
  ...STAGE_DOWNSTREAM_MODULE_TYPES,
];

type DraftModuleRow = {
  id: string;
  run_id: string;
  module_key: string;
  module_type: DraftModuleType;
  status: DraftModuleStatus;
  content_json: string;
  validation_json: string;
  stale_reason: string | null;
  generated_from_step_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function upsertDraftModule(
  db: D1Database,
  params: {
    runId: string;
    moduleKey: string;
    moduleType: DraftModuleType;
    content: Record<string, unknown>;
    validation: Record<string, unknown>;
    generatedFromStepId?: string | null;
  }
): Promise<DraftModule> {
  const id = stableModuleId(params.runId, params.moduleKey);

  await db
    .prepare(
      [
        "INSERT INTO draft_modules",
        "(id, run_id, module_key, module_type, status, content_json, validation_json, stale_reason, generated_from_step_id)",
        "VALUES (?, ?, ?, ?, 'draft', ?, ?, NULL, ?)",
        "ON CONFLICT(run_id, module_key) DO UPDATE SET",
        "module_type = excluded.module_type,",
        "status = 'draft',",
        "content_json = excluded.content_json,",
        "validation_json = excluded.validation_json,",
        "stale_reason = NULL,",
        "generated_from_step_id = excluded.generated_from_step_id,",
        "updated_at = CURRENT_TIMESTAMP",
      ].join(" ")
    )
    .bind(
      id,
      params.runId,
      params.moduleKey,
      params.moduleType,
      JSON.stringify(params.content),
      JSON.stringify(params.validation),
      params.generatedFromStepId || null
    )
    .run();

  const module = await getDraftModuleByRunAndKey(
    db,
    params.runId,
    params.moduleKey
  );
  if (!module) {
    throw new Error(`Draft module ${params.moduleKey} could not be read.`);
  }
  return module;
}

export async function listDraftModulesForRuns(
  db: D1Database,
  runIds: string[]
): Promise<Record<string, DraftModule[]>> {
  if (runIds.length === 0) {
    return {};
  }

  const placeholders = runIds.map(() => "?").join(", ");
  const result = await db
    .prepare(
      [
        "SELECT id, run_id, module_key, module_type, status, content_json, validation_json,",
        "stale_reason, generated_from_step_id, created_at, updated_at",
        "FROM draft_modules",
        `WHERE run_id IN (${placeholders})`,
        "ORDER BY created_at ASC",
      ].join(" ")
    )
    .bind(...runIds)
    .all<DraftModuleRow>();

  return result.results.reduce<Record<string, DraftModule[]>>((acc, row) => {
    const module = mapDraftModuleRow(row);
    acc[module.runId] ||= [];
    acc[module.runId].push(module);
    return acc;
  }, {});
}

export async function listDraftModules(
  db: D1Database,
  runId: string
): Promise<DraftModule[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, run_id, module_key, module_type, status, content_json, validation_json,",
        "stale_reason, generated_from_step_id, created_at, updated_at",
        "FROM draft_modules",
        "WHERE run_id = ?",
        "ORDER BY created_at ASC",
      ].join(" ")
    )
    .bind(runId)
    .all<DraftModuleRow>();

  return result.results.map(mapDraftModuleRow);
}

export async function getDraftModuleById(
  db: D1Database,
  moduleId: string
): Promise<DraftModule | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, run_id, module_key, module_type, status, content_json, validation_json,",
        "stale_reason, generated_from_step_id, created_at, updated_at",
        "FROM draft_modules",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(moduleId)
    .first<DraftModuleRow>();

  return row ? mapDraftModuleRow(row) : null;
}

export async function getDraftModuleByRunAndKey(
  db: D1Database,
  runId: string,
  moduleKey: string
): Promise<DraftModule | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, run_id, module_key, module_type, status, content_json, validation_json,",
        "stale_reason, generated_from_step_id, created_at, updated_at",
        "FROM draft_modules",
        "WHERE run_id = ? AND module_key = ?",
      ].join(" ")
    )
    .bind(runId, moduleKey)
    .first<DraftModuleRow>();

  return row ? mapDraftModuleRow(row) : null;
}

export async function regenerateDraftModule(
  db: D1Database,
  params: { moduleId: string; reviewerEmail: string }
): Promise<DraftModule | null> {
  const module = await updateModuleStatus(db, params.moduleId, "draft", null);
  if (module) {
    await createModuleReview(db, {
      module,
      action: "regenerate",
      reason: "Targeted regeneration requested.",
      reviewerEmail: params.reviewerEmail,
    });
  }
  return module;
}

export async function requestMoreSourcesForDraftModule(
  db: D1Database,
  params: { moduleId: string; reviewerEmail: string; reason: string | null }
): Promise<DraftModule | null> {
  const module = await updateModuleStatus(
    db,
    params.moduleId,
    "stale",
    params.reason || "More sources requested for this module."
  );
  if (module) {
    await createModuleReview(db, {
      module,
      action: "request_more_sources",
      reason: params.reason || "More sources requested for this module.",
      reviewerEmail: params.reviewerEmail,
    });
  }
  return module;
}

export async function approveDraftModule(
  db: D1Database,
  params: { moduleId: string; reviewerEmail: string }
): Promise<DraftModule | null> {
  const module = await updateModuleStatus(db, params.moduleId, "approved", null);
  if (module) {
    await createModuleReview(db, {
      module,
      action: "approve",
      reviewerEmail: params.reviewerEmail,
    });
  }
  return module;
}

export async function rejectDraftModule(
  db: D1Database,
  params: { moduleId: string; reviewerEmail: string; reason: string | null }
): Promise<DraftModule | null> {
  const reason = params.reason?.trim();
  if (!reason) {
    throw new Error("Rejecting a draft module requires a reason.");
  }

  const module = await updateModuleStatus(
    db,
    params.moduleId,
    "rejected",
    reason
  );
  if (!module) {
    return null;
  }

  await createModuleReview(db, {
    module,
    action: "reject",
    reason,
    reviewerEmail: params.reviewerEmail,
  });

  if (module.moduleKey === "stage_outline") {
    await markDownstreamModulesStale(
      db,
      module.runId,
      STAGE_OUTLINE_DOWNSTREAM_MODULE_TYPES,
      "Upstream stage outline was rejected."
    );
  }

  if (module.moduleType === "stage") {
    await markDownstreamModulesStale(
      db,
      module.runId,
      STAGE_DOWNSTREAM_MODULE_TYPES,
      `Upstream stage module ${module.moduleKey} was rejected.`
    );
  }

  return module;
}

export async function markDownstreamModulesStale(
  db: D1Database,
  runId: string,
  moduleTypes: DraftModuleType[],
  staleReason: string
): Promise<void> {
  if (moduleTypes.length === 0) {
    return;
  }

  const placeholders = moduleTypes.map(() => "?").join(", ");
  await db
    .prepare(
      [
        "UPDATE draft_modules",
        "SET status = 'stale', stale_reason = ?, updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND module_type IN",
        `(${placeholders})`,
      ].join(" ")
    )
    .bind(staleReason, runId, ...moduleTypes)
    .run();
}

export type DraftModuleReviewEvaluation = {
  moduleCount: number;
  staleModuleCount: number;
  rejectedModuleCount: number;
  blockerCount: number;
  sufficient: boolean;
  blockers: string[];
};

export function evaluateDraftModuleReviewState(
  modules: DraftModule[]
): DraftModuleReviewEvaluation {
  const staleModules = modules.filter((module) => module.status === "stale");
  const rejectedModules = modules.filter(
    (module) => module.status === "rejected"
  );
  const blockers = [
    ...staleModules.map(
      (module) =>
        `${module.moduleKey} is stale${
          module.staleReason ? `: ${module.staleReason}` : "."
        }`
    ),
    ...rejectedModules.map(
      (module) =>
        `${module.moduleKey} is rejected${
          module.staleReason ? `: ${module.staleReason}` : "."
        }`
    ),
  ];

  return {
    moduleCount: modules.length,
    staleModuleCount: staleModules.length,
    rejectedModuleCount: rejectedModules.length,
    blockerCount: blockers.length,
    sufficient: blockers.length === 0,
    blockers,
  };
}

export async function evaluateDraftModulesForRun(
  db: D1Database,
  runId: string
): Promise<DraftModuleReviewEvaluation> {
  return evaluateDraftModuleReviewState(await listDraftModules(db, runId));
}

async function updateModuleStatus(
  db: D1Database,
  moduleId: string,
  status: DraftModuleStatus,
  staleReason: string | null
): Promise<DraftModule | null> {
  await db
    .prepare(
      [
        "UPDATE draft_modules",
        "SET status = ?, stale_reason = ?, updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(status, staleReason, moduleId)
    .run();

  return getDraftModuleById(db, moduleId);
}

async function createModuleReview(
  db: D1Database,
  params: {
    module: DraftModule;
    action: DraftModuleReviewAction;
    reason?: string | null;
    reviewerEmail: string;
  }
): Promise<void> {
  await db
    .prepare(
      [
        "INSERT INTO module_reviews",
        "(id, module_id, run_id, action, reason, reviewer_email)",
        "VALUES (?, ?, ?, ?, ?, ?)",
      ].join(" ")
    )
    .bind(
      crypto.randomUUID(),
      params.module.id,
      params.module.runId,
      params.action,
      params.reason || null,
      params.reviewerEmail
    )
    .run();
}

function mapDraftModuleRow(row: DraftModuleRow): DraftModule {
  return {
    id: row.id,
    runId: row.run_id,
    moduleKey: row.module_key,
    moduleType: row.module_type,
    status: row.status,
    content: parseJsonObject(row.content_json),
    validation: parseJsonObject(row.validation_json),
    staleReason: row.stale_reason,
    generatedFromStepId: row.generated_from_step_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function stableModuleId(runId: string, moduleKey: string): string {
  return `module-${runId.slice(0, 8)}-${moduleKey.replace(/[^a-z0-9-]/gi, "-")}`;
}
