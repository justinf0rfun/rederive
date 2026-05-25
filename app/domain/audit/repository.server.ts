export type AuditLogInput = {
  actorType: "admin" | "system";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog(
  db: D1Database,
  input: AuditLogInput
): Promise<void> {
  await db
    .prepare(
      [
        "INSERT INTO audit_log",
        "(id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)",
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
      ].join(" ")
    )
    .bind(
      crypto.randomUUID(),
      input.actorType,
      input.actorId,
      input.action,
      input.entityType,
      input.entityId,
      JSON.stringify(input.metadata || {})
    )
    .run();
}
