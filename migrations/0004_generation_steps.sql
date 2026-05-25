CREATE TABLE IF NOT EXISTS generation_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_id, step_key),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_generation_steps_run_id
  ON generation_steps (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_generation_steps_status
  ON generation_steps (status, updated_at DESC);

UPDATE app_metadata
SET value = '0004_generation_steps', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
