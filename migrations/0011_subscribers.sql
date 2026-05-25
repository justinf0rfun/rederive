CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh',
  status TEXT NOT NULL DEFAULT 'active',
  provider_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, locale)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status_created_at
  ON subscribers (status, created_at DESC);

UPDATE app_metadata
SET value = '0011_subscribers', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
