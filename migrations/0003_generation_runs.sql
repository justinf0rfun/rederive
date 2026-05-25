CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  latest_published_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generation_runs (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  topic_request_id TEXT,
  language TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  status TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  error_code TEXT,
  error_message TEXT,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (topic_request_id) REFERENCES topic_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_generation_runs_status_created_at
  ON generation_runs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_runs_topic_id
  ON generation_runs (topic_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON audit_log (actor_type, actor_id, created_at DESC);

UPDATE app_metadata
SET value = '0003_generation_runs', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
