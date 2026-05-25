import { REDO_CONTRACT_VERSION } from "~/domain/redo/contract";
import type { FeedbackItem, FeedbackItemStatus, FeedbackType } from "./types";

type FeedbackRow = {
  id: string;
  topic_id: string | null;
  published_version_id: string | null;
  module_anchor: string | null;
  feedback_type: FeedbackType;
  body: string;
  source_links_json: string;
  submitter_email: string | null;
  status: FeedbackItemStatus;
  created_at: string;
  updated_at: string;
};

export async function createFeedbackItem(
  db: D1Database,
  params: {
    topicId: string | null;
    publishedVersionId: string | null;
    moduleAnchor: string | null;
    feedbackType: FeedbackType;
    body: string;
    sourceLinks: string[];
    submitterEmail: string | null;
  }
): Promise<FeedbackItem> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      [
        "INSERT INTO feedback_items",
        "(id, topic_id, published_version_id, module_anchor, feedback_type, body, source_links_json, submitter_email)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ].join(" ")
    )
    .bind(
      id,
      params.topicId,
      params.publishedVersionId,
      params.moduleAnchor,
      params.feedbackType,
      params.body,
      JSON.stringify(params.sourceLinks),
      params.submitterEmail
    )
    .run();

  const item = await getFeedbackItemById(db, id);
  if (!item) {
    throw new Error("Feedback item was inserted but could not be read.");
  }
  return item;
}

export async function listRecentFeedbackItems(
  db: D1Database,
  limit = 20
): Promise<FeedbackItem[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, topic_id, published_version_id, module_anchor, feedback_type, body,",
        "source_links_json, submitter_email, status, created_at, updated_at",
        "FROM feedback_items",
        "ORDER BY created_at DESC",
        "LIMIT ?",
      ].join(" ")
    )
    .bind(limit)
    .all<FeedbackRow>();

  return result.results.map(mapFeedbackRow);
}

export async function getFeedbackItemById(
  db: D1Database,
  id: string
): Promise<FeedbackItem | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, topic_id, published_version_id, module_anchor, feedback_type, body,",
        "source_links_json, submitter_email, status, created_at, updated_at",
        "FROM feedback_items",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(id)
    .first<FeedbackRow>();

  return row ? mapFeedbackRow(row) : null;
}

export async function markFeedbackQueuedFollowUp(
  db: D1Database,
  feedbackId: string
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE feedback_items",
        "SET status = 'queued_follow_up', updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(feedbackId)
    .run();
}

export async function createGenerationRunFromFeedback(
  db: D1Database,
  params: { feedback: FeedbackItem; createdBy: string }
): Promise<{ id: string; topicId: string }> {
  if (!params.feedback.topicId) {
    throw new Error("Feedback is not tied to a topic.");
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      [
        "INSERT INTO generation_runs",
        "(id, topic_id, topic_request_id, language, contract_version, status, scope_json, created_by)",
        "VALUES (?, ?, NULL, 'zh', ?, 'queued', ?, ?)",
      ].join(" ")
    )
    .bind(
      id,
      params.feedback.topicId,
      REDO_CONTRACT_VERSION,
      JSON.stringify({
        source: "feedback",
        feedbackId: params.feedback.id,
        moduleAnchor: params.feedback.moduleAnchor,
        feedbackType: params.feedback.feedbackType,
        submittedSourceLinks: params.feedback.sourceLinks,
      }),
      params.createdBy
    )
    .run();

  await markFeedbackQueuedFollowUp(db, params.feedback.id);
  return { id, topicId: params.feedback.topicId };
}

function mapFeedbackRow(row: FeedbackRow): FeedbackItem {
  return {
    id: row.id,
    topicId: row.topic_id,
    publishedVersionId: row.published_version_id,
    moduleAnchor: row.module_anchor,
    feedbackType: row.feedback_type,
    body: row.body,
    sourceLinks: parseJsonArray(row.source_links_json),
    submitterEmail: row.submitter_email,
    status: row.status,
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
