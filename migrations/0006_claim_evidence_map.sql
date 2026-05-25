CREATE TABLE IF NOT EXISTS source_evidence (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  locator TEXT,
  evidence_type TEXT NOT NULL,
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES source_documents(id),
  FOREIGN KEY (run_id) REFERENCES generation_runs(id),
  UNIQUE (run_id, source_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_source_evidence_run_id
  ON source_evidence (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_source_evidence_source_id
  ON source_evidence (source_id, created_at);

CREATE TABLE IF NOT EXISTS evidence_claims (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  confidence TEXT NOT NULL,
  module_id TEXT,
  publishable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES generation_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_claims_run_id
  ON evidence_claims (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_evidence_claims_module_id
  ON evidence_claims (run_id, module_id);

CREATE TABLE IF NOT EXISTS claim_evidence_links (
  claim_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (claim_id, evidence_id),
  FOREIGN KEY (claim_id) REFERENCES evidence_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES source_evidence(id)
);

CREATE TABLE IF NOT EXISTS claim_basis_links (
  claim_id TEXT NOT NULL,
  basis_claim_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (claim_id, basis_claim_id),
  FOREIGN KEY (claim_id) REFERENCES evidence_claims(id),
  FOREIGN KEY (basis_claim_id) REFERENCES evidence_claims(id)
);

UPDATE app_metadata
SET value = '0006_claim_evidence_map', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
