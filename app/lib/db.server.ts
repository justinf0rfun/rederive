export type MigrationStatus =
  | {
      ok: true;
      schemaVersion: string;
      checkedAt: string;
    }
  | {
      ok: false;
      schemaVersion: null;
      checkedAt: string;
      error: string;
    };

type MetadataRow = {
  value: string;
};

export async function readMigrationStatus(db: D1Database): Promise<MigrationStatus> {
  const checkedAt = new Date().toISOString();

  try {
    const row = await db
      .prepare("SELECT value FROM app_metadata WHERE key = ?")
      .bind("schema_version")
      .first<MetadataRow>();

    if (!row) {
      return {
        ok: false,
        schemaVersion: null,
        checkedAt,
        error: "schema_version metadata is missing",
      };
    }

    return {
      ok: true,
      schemaVersion: row.value,
      checkedAt,
    };
  } catch (error) {
    return {
      ok: false,
      schemaVersion: null,
      checkedAt,
      error: error instanceof Error ? error.message : "Unknown D1 error",
    };
  }
}

export async function writeHealthCheck(db: D1Database): Promise<void> {
  await db
    .prepare(
      [
        "INSERT INTO app_metadata (key, value, updated_at)",
        "VALUES (?, ?, CURRENT_TIMESTAMP)",
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
      ].join(" ")
    )
    .bind("last_health_write_at", new Date().toISOString())
    .run();
}
