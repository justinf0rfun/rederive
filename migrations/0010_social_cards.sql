CREATE TABLE IF NOT EXISTS social_cards (
  id TEXT PRIMARY KEY,
  published_version_id TEXT NOT NULL,
  card_type TEXT NOT NULL,
  module_key TEXT,
  r2_object_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (published_version_id) REFERENCES published_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_social_cards_published_version
  ON social_cards (published_version_id, card_type);

UPDATE app_metadata
SET value = '0010_social_cards', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
