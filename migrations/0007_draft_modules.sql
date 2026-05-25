CREATE TABLE IF NOT EXISTS draft_modules (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  module_key TEXT NOT NULL,
  module_type TEXT NOT NULL,
  status TEXT NOT NULL,
  content_json TEXT NOT NULL,
  validation_json TEXT NOT NULL DEFAULT '{}',
  stale_reason TEXT,
  generated_from_step_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_id, module_key),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_draft_modules_run_id
  ON draft_modules (run_id, module_key);

CREATE INDEX IF NOT EXISTS idx_draft_modules_status
  ON draft_modules (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS module_dependencies (
  run_id TEXT NOT NULL,
  upstream_module_id TEXT NOT NULL,
  downstream_module_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id, upstream_module_id, downstream_module_id),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id),
  FOREIGN KEY (upstream_module_id) REFERENCES draft_modules(id),
  FOREIGN KEY (downstream_module_id) REFERENCES draft_modules(id)
);

CREATE TABLE IF NOT EXISTS module_reviews (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  reviewer_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES draft_modules(id),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_module_reviews_module_id
  ON module_reviews (module_id, created_at DESC);

UPDATE app_metadata
SET value = '0007_draft_modules', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
