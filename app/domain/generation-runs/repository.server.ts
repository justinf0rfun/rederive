import { REDO_CONTRACT_VERSION } from "~/domain/redo/contract";
import type { TopicRequest } from "~/domain/topic-requests/types";
import { normalizeTopicSlug } from "~/domain/topic-requests/validation";
import type { GenerationRun, Topic } from "./types";

type TopicRow = {
  id: string;
  slug: string;
  display_name: string;
  aliases_json: string;
  category: string | null;
  latest_published_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type GenerationRunRow = {
  id: string;
  topic_id: string;
  topic_request_id: string | null;
  topic_display_name: string;
  topic_slug: string;
  language: "zh" | "en";
  contract_version: string;
  status: string;
  scope_json: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function findOrCreateTopicFromRequest(
  db: D1Database,
  request: TopicRequest
): Promise<Topic> {
  const slug =
    request.normalizedTopicSlug || normalizeTopicSlug(request.topicText);
  const existing = await getTopicBySlug(db, slug);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      [
        "INSERT INTO topics",
        "(id, slug, display_name, aliases_json, category)",
        "VALUES (?, ?, ?, '[]', ?)",
      ].join(" ")
    )
    .bind(id, slug, request.topicText, "unknown")
    .run();

  const created = await getTopicBySlug(db, slug);
  if (!created) {
    throw new Error("Topic was inserted but could not be read.");
  }

  return created;
}

export async function createGenerationRunFromTopicRequest(
  db: D1Database,
  params: {
    topic: Topic;
    topicRequest: TopicRequest;
    createdBy: string;
  }
): Promise<GenerationRun> {
  const id = crypto.randomUUID();
  const language = params.topicRequest.locale;

  await db
    .prepare(
      [
        "INSERT INTO generation_runs",
        "(id, topic_id, topic_request_id, language, contract_version, status, scope_json, created_by)",
        "VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)",
      ].join(" ")
    )
    .bind(
      id,
      params.topic.id,
      params.topicRequest.id,
      language,
      REDO_CONTRACT_VERSION,
      JSON.stringify({
        source: "topic_request",
        submittedSourceLinks: params.topicRequest.sourceLinks,
      }),
      params.createdBy
    )
    .run();

  const created = await getGenerationRunById(db, id);
  if (!created) {
    throw new Error("Generation run was inserted but could not be read.");
  }

  return created;
}

export async function listRecentGenerationRuns(
  db: D1Database,
  limit = 10
): Promise<GenerationRun[]> {
  const result = await db
    .prepare(
      [
        "SELECT generation_runs.id, generation_runs.topic_id, generation_runs.topic_request_id,",
        "topics.display_name AS topic_display_name, topics.slug AS topic_slug,",
        "generation_runs.language, generation_runs.contract_version, generation_runs.status,",
        "generation_runs.scope_json, generation_runs.created_by, generation_runs.created_at, generation_runs.updated_at",
        "FROM generation_runs",
        "JOIN topics ON topics.id = generation_runs.topic_id",
        "ORDER BY generation_runs.created_at DESC",
        "LIMIT ?",
      ].join(" ")
    )
    .bind(limit)
    .all<GenerationRunRow>();

  return result.results.map(mapGenerationRunRow);
}

export async function updateGenerationRunStatus(
  db: D1Database,
  params: {
    runId: string;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    completed?: boolean;
  }
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE generation_runs",
        "SET status = ?, error_code = ?, error_message = ?,",
        "completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE completed_at END,",
        "updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(
      params.status,
      params.errorCode || null,
      params.errorMessage || null,
      params.completed ? 1 : 0,
      params.runId
    )
    .run();
}

async function getTopicBySlug(
  db: D1Database,
  slug: string
): Promise<Topic | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, slug, display_name, aliases_json, category,",
        "latest_published_version_id, created_at, updated_at",
        "FROM topics",
        "WHERE slug = ?",
      ].join(" ")
    )
    .bind(slug)
    .first<TopicRow>();

  return row ? mapTopicRow(row) : null;
}

export async function getGenerationRunById(
  db: D1Database,
  id: string
): Promise<GenerationRun | null> {
  const row = await db
    .prepare(
      [
        "SELECT generation_runs.id, generation_runs.topic_id, generation_runs.topic_request_id,",
        "topics.display_name AS topic_display_name, topics.slug AS topic_slug,",
        "generation_runs.language, generation_runs.contract_version, generation_runs.status,",
        "generation_runs.scope_json, generation_runs.created_by, generation_runs.created_at, generation_runs.updated_at",
        "FROM generation_runs",
        "JOIN topics ON topics.id = generation_runs.topic_id",
        "WHERE generation_runs.id = ?",
      ].join(" ")
    )
    .bind(id)
    .first<GenerationRunRow>();

  return row ? mapGenerationRunRow(row) : null;
}

function mapTopicRow(row: TopicRow): Topic {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    aliases: parseJsonArray(row.aliases_json),
    category: row.category,
    latestPublishedVersionId: row.latest_published_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGenerationRunRow(row: GenerationRunRow): GenerationRun {
  return {
    id: row.id,
    topicId: row.topic_id,
    topicRequestId: row.topic_request_id,
    topicDisplayName: row.topic_display_name,
    topicSlug: row.topic_slug,
    language: row.language,
    contractVersion: row.contract_version,
    status: row.status,
    scope: parseJsonObject(row.scope_json),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
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
