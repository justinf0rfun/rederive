import type { Subscriber, SubscribeResult } from "./types";

type SubscriberRow = {
  id: string;
  email: string;
  locale: "zh" | "en";
  status: "active" | "unsubscribed";
  provider_json: string;
  created_at: string;
  updated_at: string;
};

export async function subscribeEmail(
  db: D1Database,
  params: { email: string; locale: "zh" | "en" }
): Promise<SubscribeResult> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const existing = await getSubscriberByEmail(db, normalizedEmail, params.locale);
  if (existing) {
    return { status: "duplicate", subscriber: existing };
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      [
        "INSERT INTO subscribers",
        "(id, email, locale, status, provider_json)",
        "VALUES (?, ?, ?, 'active', ?)",
      ].join(" ")
    )
    .bind(
      id,
      normalizedEmail,
      params.locale,
      JSON.stringify({
        provider: "none",
        note: "Provider adapter intentionally deferred.",
      })
    )
    .run();

  const subscriber = await getSubscriberByEmail(db, normalizedEmail, params.locale);
  if (!subscriber) {
    throw new Error("Subscriber was inserted but could not be read.");
  }
  return { status: "created", subscriber };
}

export async function listRecentSubscribers(
  db: D1Database,
  limit = 50
): Promise<Subscriber[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, email, locale, status, provider_json, created_at, updated_at",
        "FROM subscribers",
        "ORDER BY created_at DESC",
        "LIMIT ?",
      ].join(" ")
    )
    .bind(limit)
    .all<SubscriberRow>();

  return result.results.map(mapSubscriberRow);
}

async function getSubscriberByEmail(
  db: D1Database,
  email: string,
  locale: "zh" | "en"
): Promise<Subscriber | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, email, locale, status, provider_json, created_at, updated_at",
        "FROM subscribers",
        "WHERE email = ? AND locale = ?",
      ].join(" ")
    )
    .bind(email, locale)
    .first<SubscriberRow>();

  return row ? mapSubscriberRow(row) : null;
}

function mapSubscriberRow(row: SubscriberRow): Subscriber {
  return {
    id: row.id,
    email: row.email,
    locale: row.locale,
    status: row.status,
    provider: parseJsonObject(row.provider_json),
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
