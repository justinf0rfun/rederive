CREATE TABLE IF NOT EXISTS topic_requests (
  id TEXT PRIMARY KEY,
  topic_text TEXT NOT NULL,
  normalized_topic_slug TEXT,
  reason TEXT,
  submitter_email TEXT,
  source_links_json TEXT NOT NULL DEFAULT '[]',
  locale TEXT NOT NULL DEFAULT 'zh',
  status TEXT NOT NULL DEFAULT 'new',
  anti_abuse_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_requests_status_created_at
  ON topic_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_requests_normalized_topic_slug
  ON topic_requests (normalized_topic_slug);

UPDATE app_metadata
SET value = '0002_topic_requests', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
