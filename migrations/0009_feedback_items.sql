CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  topic_id TEXT,
  published_version_id TEXT,
  module_anchor TEXT,
  feedback_type TEXT NOT NULL,
  body TEXT NOT NULL,
  source_links_json TEXT NOT NULL DEFAULT '[]',
  submitter_email TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (published_version_id) REFERENCES published_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_items_status_created_at
  ON feedback_items (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_items_version_module
  ON feedback_items (published_version_id, module_anchor, created_at DESC);

UPDATE app_metadata
SET value = '0009_feedback_items', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
