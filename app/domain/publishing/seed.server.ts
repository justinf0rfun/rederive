import { createValidRedoCaseSnapshot } from "~/domain/redo/fixtures";
import { validateRedoCaseSnapshot } from "~/domain/redo/validators";
import { getPublishedVersionById } from "./repository.server";
import type { PublishedVersion } from "./types";

export async function seedBenchmarkPublishedVersion(
  db: D1Database
): Promise<PublishedVersion> {
  const snapshot = createValidRedoCaseSnapshot();
  const validation = validateRedoCaseSnapshot(snapshot);
  if (!validation.ok) {
    throw new Error(
      `Seed benchmark case is invalid: ${validation.blockers
        .map((blocker) => blocker.message)
        .join(" ")}`
    );
  }

  await db
    .prepare(
      [
        "INSERT INTO topics",
        "(id, slug, display_name, aliases_json, category)",
        "VALUES (?, ?, ?, ?, ?)",
        "ON CONFLICT(slug) DO UPDATE SET",
        "display_name = excluded.display_name,",
        "aliases_json = excluded.aliases_json,",
        "category = excluded.category,",
        "updated_at = CURRENT_TIMESTAMP",
      ].join(" ")
    )
    .bind(
      snapshot.topic.id,
      snapshot.topic.slug,
      snapshot.topic.displayName,
      JSON.stringify(snapshot.topic.aliases),
      snapshot.topic.category
    )
    .run();
  const topicRow = await db
    .prepare("SELECT id FROM topics WHERE slug = ?")
    .bind(snapshot.topic.slug)
    .first<{ id: string }>();
  const topicId = topicRow?.id || snapshot.topic.id;

  const renderManifest = {
    latestPath: `/${snapshot.language}/cases/${snapshot.topic.slug}`,
    versionPath: `/${snapshot.language}/cases/${snapshot.topic.slug}/v/${snapshot.version.id}`,
  };
  const sourceSummary = {
    sourceCount: snapshot.trust.sourceCount,
    paperOrDesignDocCount: snapshot.trust.paperOrDesignDocCount,
    claimCount: snapshot.trust.claimCount,
  };

  await db
    .prepare(
      [
        "INSERT INTO published_versions",
        "(id, topic_id, version_number, language, contract_version, content_json, render_manifest_json, source_summary_json, revision_note, supersedes_version_id, published_by, published_at)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        "ON CONFLICT(id) DO UPDATE SET",
        "content_json = excluded.content_json,",
        "render_manifest_json = excluded.render_manifest_json,",
        "source_summary_json = excluded.source_summary_json,",
        "revision_note = excluded.revision_note,",
        "published_by = excluded.published_by,",
        "published_at = excluded.published_at",
      ].join(" ")
    )
    .bind(
      snapshot.version.id,
      topicId,
      snapshot.version.number,
      snapshot.language,
      snapshot.contractVersion,
      JSON.stringify(snapshot),
      JSON.stringify(renderManifest),
      JSON.stringify(sourceSummary),
      snapshot.version.revisionNote,
      "seed",
      snapshot.version.publishedAt
    )
    .run();

  await db
    .prepare(
      [
        "UPDATE topics",
        "SET latest_published_version_id = ?, updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(snapshot.version.id, topicId)
    .run();

  const publishedVersion = await getPublishedVersionById(db, snapshot.version.id);
  if (!publishedVersion) {
    throw new Error("Seed benchmark version was inserted but could not be read.");
  }
  return publishedVersion;
}
