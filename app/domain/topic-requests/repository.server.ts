import type { TopicRequest, ValidTopicRequestInput } from "./types";

type TopicRequestRow = {
  id: string;
  topic_text: string;
  normalized_topic_slug: string | null;
  reason: string | null;
  submitter_email: string | null;
  source_links_json: string;
  locale: "zh" | "en";
  status: string;
  created_at: string;
  updated_at: string;
};

export async function createTopicRequest(
  db: D1Database,
  input: ValidTopicRequestInput,
  antiAbuse: Record<string, unknown>
): Promise<TopicRequest> {
  const id = crypto.randomUUID();
  const sourceLinksJson = JSON.stringify(input.sourceLinks);
  const antiAbuseJson = JSON.stringify(antiAbuse);

  await db
    .prepare(
      [
        "INSERT INTO topic_requests",
        "(id, topic_text, normalized_topic_slug, reason, submitter_email, source_links_json, locale, status, anti_abuse_json)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)",
      ].join(" ")
    )
    .bind(
      id,
      input.topicText,
      input.normalizedTopicSlug,
      input.reason,
      input.submitterEmail,
      sourceLinksJson,
      input.locale,
      antiAbuseJson
    )
    .run();

  const created = await getTopicRequestById(db, id);
  if (!created) {
    throw new Error("Topic request was inserted but could not be read.");
  }

  return created;
}

export async function listRecentTopicRequests(
  db: D1Database,
  limit = 20
): Promise<TopicRequest[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, topic_text, normalized_topic_slug, reason, submitter_email,",
        "source_links_json, locale, status, created_at, updated_at",
        "FROM topic_requests",
        "ORDER BY created_at DESC",
        "LIMIT ?",
      ].join(" ")
    )
    .bind(limit)
    .all<TopicRequestRow>();

  return result.results.map(mapTopicRequestRow);
}

export async function getTopicRequestById(
  db: D1Database,
  id: string
): Promise<TopicRequest | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, topic_text, normalized_topic_slug, reason, submitter_email,",
        "source_links_json, locale, status, created_at, updated_at",
        "FROM topic_requests",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(id)
    .first<TopicRequestRow>();

  return row ? mapTopicRequestRow(row) : null;
}

export async function markTopicRequestQueued(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare(
      [
        "UPDATE topic_requests",
        "SET status = 'queued', updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(id)
    .run();
}

function mapTopicRequestRow(row: TopicRequestRow): TopicRequest {
  return {
    id: row.id,
    topicText: row.topic_text,
    normalizedTopicSlug: row.normalized_topic_slug,
    reason: row.reason,
    submitterEmail: row.submitter_email,
    sourceLinks: parseSourceLinks(row.source_links_json),
    locale: row.locale,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSourceLinks(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
