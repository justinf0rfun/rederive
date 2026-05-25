CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  url TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT,
  authors_json TEXT NOT NULL DEFAULT '[]',
  publisher TEXT,
  published_at TEXT,
  retrieved_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  trust_level TEXT NOT NULL,
  content_hash TEXT,
  r2_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES generation_runs(id),
  UNIQUE (run_id, canonical_url)
);

CREATE INDEX IF NOT EXISTS idx_source_documents_run_id
  ON source_documents (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_source_documents_status
  ON source_documents (status, updated_at DESC);

UPDATE app_metadata
SET value = '0005_source_documents', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
