import {
  GENERATION_STEP_KEYS,
  type GenerationStep,
  type GenerationStepKey,
} from "./types";

type GenerationStepRow = {
  id: string;
  run_id: string;
  step_key: GenerationStepKey;
  status: "queued" | "running" | "completed" | "failed";
  input_json: string;
  output_json: string;
  error_json: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensureInitialGenerationSteps(
  db: D1Database,
  runId: string
): Promise<void> {
  for (const stepKey of GENERATION_STEP_KEYS) {
    await db
      .prepare(
        [
          "INSERT INTO generation_steps",
          "(id, run_id, step_key, status, input_json, output_json)",
          "VALUES (?, ?, ?, 'queued', '{}', '{}')",
          "ON CONFLICT(run_id, step_key) DO NOTHING",
        ].join(" ")
      )
      .bind(crypto.randomUUID(), runId, stepKey)
      .run();
  }
}

export async function listGenerationStepsForRuns(
  db: D1Database,
  runIds: string[]
): Promise<Record<string, GenerationStep[]>> {
  if (runIds.length === 0) {
    return {};
  }

  const placeholders = runIds.map(() => "?").join(", ");
  const result = await db
    .prepare(
      [
        "SELECT id, run_id, step_key, status, input_json, output_json, error_json,",
        "started_at, completed_at, created_at, updated_at",
        "FROM generation_steps",
        `WHERE run_id IN (${placeholders})`,
        "ORDER BY created_at ASC",
      ].join(" ")
    )
    .bind(...runIds)
    .all<GenerationStepRow>();

  const grouped = result.results.reduce<Record<string, GenerationStep[]>>(
    (acc, row) => {
      const step = mapGenerationStepRow(row);
      acc[step.runId] ||= [];
      acc[step.runId].push(step);
      return acc;
    },
    {}
  );

  for (const steps of Object.values(grouped)) {
    steps.sort(compareGenerationSteps);
  }

  return grouped;
}

export async function listGenerationSteps(
  db: D1Database,
  runId: string
): Promise<GenerationStep[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, run_id, step_key, status, input_json, output_json, error_json,",
        "started_at, completed_at, created_at, updated_at",
        "FROM generation_steps",
        "WHERE run_id = ?",
        "ORDER BY created_at ASC",
      ].join(" ")
    )
    .bind(runId)
    .all<GenerationStepRow>();

  return result.results.map(mapGenerationStepRow).sort(compareGenerationSteps);
}

export async function markStepRunning(
  db: D1Database,
  runId: string,
  stepKey: GenerationStepKey
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE generation_steps",
        "SET status = 'running', started_at = COALESCE(started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND step_key = ?",
      ].join(" ")
    )
    .bind(runId, stepKey)
    .run();
}

export async function markStepCompleted(
  db: D1Database,
  runId: string,
  stepKey: GenerationStepKey,
  output: Record<string, unknown>
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE generation_steps",
        "SET status = 'completed', output_json = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND step_key = ?",
      ].join(" ")
    )
    .bind(JSON.stringify(output), runId, stepKey)
    .run();
}

export async function markStepFailed(
  db: D1Database,
  runId: string,
  stepKey: GenerationStepKey,
  error: Record<string, unknown>
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE generation_steps",
        "SET status = 'failed', error_json = ?, updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND step_key = ?",
      ].join(" ")
    )
    .bind(JSON.stringify(error), runId, stepKey)
    .run();
}

export async function resetFailedGenerationSteps(
  db: D1Database,
  runId: string
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE generation_steps",
        "SET status = 'queued', error_json = NULL, started_at = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND status = 'failed'",
      ].join(" ")
    )
    .bind(runId)
    .run();
}

export async function requestMorePaperDesignDocSources(
  db: D1Database,
  runId: string
): Promise<void> {
  const steps = await listGenerationSteps(db, runId);
  const step = steps.find(
    (candidate) => candidate.stepKey === "paper_design_doc_discovery"
  );
  const requestedMoreSourcesCount =
    typeof step?.input.requestedMoreSourcesCount === "number"
      ? step.input.requestedMoreSourcesCount + 1
      : 1;

  await db
    .prepare(
      [
        "UPDATE generation_steps",
        "SET status = 'queued', input_json = ?, output_json = '{}', error_json = NULL,",
        "started_at = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND step_key = 'paper_design_doc_discovery'",
      ].join(" ")
    )
    .bind(JSON.stringify({ requestedMoreSourcesCount }), runId)
    .run();

  await db
    .prepare(
      [
        "UPDATE generation_steps",
        "SET status = 'queued', output_json = '{}', error_json = NULL,",
        "started_at = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP",
        "WHERE run_id = ? AND step_key = 'qa'",
      ].join(" ")
    )
    .bind(runId)
    .run();
}

function mapGenerationStepRow(row: GenerationStepRow): GenerationStep {
  return {
    id: row.id,
    runId: row.run_id,
    stepKey: row.step_key,
    status: row.status,
    input: parseJsonObject(row.input_json),
    output: parseJsonObject(row.output_json),
    error: row.error_json ? parseJsonObject(row.error_json) : null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function compareGenerationSteps(a: GenerationStep, b: GenerationStep): number {
  return (
    GENERATION_STEP_KEYS.indexOf(a.stepKey) -
    GENERATION_STEP_KEYS.indexOf(b.stepKey)
  );
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
