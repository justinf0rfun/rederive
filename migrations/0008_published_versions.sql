CREATE TABLE IF NOT EXISTS published_versions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  language TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  content_json TEXT NOT NULL,
  render_manifest_json TEXT NOT NULL DEFAULT '{}',
  source_summary_json TEXT NOT NULL DEFAULT '{}',
  revision_note TEXT,
  supersedes_version_id TEXT,
  published_by TEXT NOT NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(topic_id, language, version_number),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE INDEX IF NOT EXISTS idx_published_versions_topic_language
  ON published_versions (topic_id, language, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_published_versions_published_at
  ON published_versions (published_at DESC);

UPDATE app_metadata
SET value = '0008_published_versions', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
