import type {
  CandidateSourceDocument,
  PaperDesignDocCoverage,
  SourceCorpusEvaluation,
  SourceDocument,
  SourceDocumentStatus,
  SourceType,
  TrustLevel,
} from "./types";

type SourceDocumentRow = {
  id: string;
  run_id: string;
  url: string;
  canonical_url: string | null;
  title: string | null;
  authors_json: string;
  publisher: string | null;
  published_at: string | null;
  retrieved_at: string;
  source_type: SourceType;
  trust_level: TrustLevel;
  content_hash: string | null;
  r2_object_key: string | null;
  status: SourceDocumentStatus;
  created_at: string;
  updated_at: string;
};

export async function upsertCandidateSourceDocuments(
  db: D1Database,
  runId: string,
  candidates: CandidateSourceDocument[]
): Promise<SourceDocument[]> {
  const inserted: SourceDocument[] = [];

  for (const candidate of candidates) {
    const id = candidate.id || crypto.randomUUID();
    const canonicalUrl = candidate.canonicalUrl || normalizeCanonicalUrl(candidate.url);
    const retrievedAt = candidate.retrievedAt || new Date().toISOString();

    await db
      .prepare(
        [
          "INSERT INTO source_documents",
          "(id, run_id, url, canonical_url, title, authors_json, publisher, published_at, retrieved_at, source_type, trust_level, content_hash, r2_object_key, status)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate')",
          "ON CONFLICT(run_id, canonical_url) DO UPDATE SET",
          "url = excluded.url,",
          "title = COALESCE(excluded.title, source_documents.title),",
          "authors_json = excluded.authors_json,",
          "publisher = COALESCE(excluded.publisher, source_documents.publisher),",
          "published_at = COALESCE(excluded.published_at, source_documents.published_at),",
          "retrieved_at = excluded.retrieved_at,",
          "source_type = excluded.source_type,",
          "trust_level = excluded.trust_level,",
          "content_hash = COALESCE(excluded.content_hash, source_documents.content_hash),",
          "r2_object_key = COALESCE(excluded.r2_object_key, source_documents.r2_object_key),",
          "updated_at = CURRENT_TIMESTAMP",
        ].join(" ")
      )
      .bind(
        id,
        runId,
        candidate.url,
        canonicalUrl,
        candidate.title || null,
        JSON.stringify(candidate.authors || []),
        candidate.publisher || null,
        candidate.publishedAt || null,
        retrievedAt,
        candidate.sourceType,
        candidate.trustLevel,
        candidate.contentHash || deterministicContentHash(candidate.url),
        candidate.r2ObjectKey || null
      )
      .run();

    const source = await getSourceDocumentByCanonicalUrl(db, runId, canonicalUrl);
    if (source) {
      inserted.push(source);
    }
  }

  return inserted;
}

export async function listSourceDocuments(
  db: D1Database,
  runId: string
): Promise<SourceDocument[]> {
  const result = await db
    .prepare(
      [
        "SELECT id, run_id, url, canonical_url, title, authors_json, publisher, published_at,",
        "retrieved_at, source_type, trust_level, content_hash, r2_object_key, status, created_at, updated_at",
        "FROM source_documents",
        "WHERE run_id = ?",
        "ORDER BY created_at ASC",
      ].join(" ")
    )
    .bind(runId)
    .all<SourceDocumentRow>();

  return result.results.map(mapSourceDocumentRow);
}

export async function listSourceDocumentsForRuns(
  db: D1Database,
  runIds: string[]
): Promise<Record<string, SourceDocument[]>> {
  if (runIds.length === 0) {
    return {};
  }

  const placeholders = runIds.map(() => "?").join(", ");
  const result = await db
    .prepare(
      [
        "SELECT id, run_id, url, canonical_url, title, authors_json, publisher, published_at,",
        "retrieved_at, source_type, trust_level, content_hash, r2_object_key, status, created_at, updated_at",
        "FROM source_documents",
        `WHERE run_id IN (${placeholders})`,
        "ORDER BY created_at ASC",
      ].join(" ")
    )
    .bind(...runIds)
    .all<SourceDocumentRow>();

  return result.results.reduce<Record<string, SourceDocument[]>>((acc, row) => {
    const source = mapSourceDocumentRow(row);
    acc[source.runId] ||= [];
    acc[source.runId].push(source);
    return acc;
  }, {});
}

export async function rejectSourceDocument(
  db: D1Database,
  sourceId: string
): Promise<SourceDocument | null> {
  await db
    .prepare(
      [
        "UPDATE source_documents",
        "SET status = 'rejected', updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(sourceId)
    .run();

  return getSourceDocumentById(db, sourceId);
}

export async function evaluateSourceCorpus(
  db: D1Database,
  runId: string
): Promise<SourceCorpusEvaluation> {
  const sources = await listSourceDocuments(db, runId);
  const usableSources = sources.filter((source) => source.status !== "rejected");
  const trustedSources = usableSources.filter((source) =>
    ["primary", "high"].includes(source.trustLevel)
  );

  if (usableSources.length < 2) {
    return {
      sourceCount: sources.length,
      usableSourceCount: usableSources.length,
      trustedSourceCount: trustedSources.length,
      sufficient: false,
      reason: "At least two non-rejected sources are required.",
    };
  }

  if (trustedSources.length < 1) {
    return {
      sourceCount: sources.length,
      usableSourceCount: usableSources.length,
      trustedSourceCount: trustedSources.length,
      sufficient: false,
      reason: "At least one primary or high-trust source is required.",
    };
  }

  return {
    sourceCount: sources.length,
    usableSourceCount: usableSources.length,
    trustedSourceCount: trustedSources.length,
    sufficient: true,
    reason: null,
  };
}

export async function evaluatePaperDesignDocCoverage(
  db: D1Database,
  runId: string
): Promise<PaperDesignDocCoverage> {
  const sources = await listSourceDocuments(db, runId);
  return evaluatePaperDesignDocCoverageFromSources(sources);
}

export function evaluatePaperDesignDocCoverageFromSources(
  sources: SourceDocument[]
): PaperDesignDocCoverage {
  const coverageSources = sources.filter((source) =>
    isPaperDesignDocSourceType(source.sourceType)
  );
  const usableSources = coverageSources.filter(
    (source) => source.status !== "rejected"
  );
  const paperCount = usableSources.filter(
    (source) => source.sourceType === "paper"
  ).length;
  const designDocCount = usableSources.filter(
    (source) => source.sourceType === "design_doc"
  ).length;
  const proposalOrStandardCount = usableSources.filter((source) =>
    ["proposal", "standard"].includes(source.sourceType)
  ).length;

  if (usableSources.length < 1) {
    return {
      sourceCount: coverageSources.length,
      usableSourceCount: usableSources.length,
      paperCount,
      designDocCount,
      proposalOrStandardCount,
      sufficient: false,
      reason:
        "At least one non-rejected paper, design doc, proposal, or standard is required.",
    };
  }

  return {
    sourceCount: coverageSources.length,
    usableSourceCount: usableSources.length,
    paperCount,
    designDocCount,
    proposalOrStandardCount,
    sufficient: true,
    reason: null,
  };
}

async function getSourceDocumentByCanonicalUrl(
  db: D1Database,
  runId: string,
  canonicalUrl: string
): Promise<SourceDocument | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, run_id, url, canonical_url, title, authors_json, publisher, published_at,",
        "retrieved_at, source_type, trust_level, content_hash, r2_object_key, status, created_at, updated_at",
        "FROM source_documents",
        "WHERE run_id = ? AND canonical_url = ?",
      ].join(" ")
    )
    .bind(runId, canonicalUrl)
    .first<SourceDocumentRow>();

  return row ? mapSourceDocumentRow(row) : null;
}

async function getSourceDocumentById(
  db: D1Database,
  sourceId: string
): Promise<SourceDocument | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, run_id, url, canonical_url, title, authors_json, publisher, published_at,",
        "retrieved_at, source_type, trust_level, content_hash, r2_object_key, status, created_at, updated_at",
        "FROM source_documents",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(sourceId)
    .first<SourceDocumentRow>();

  return row ? mapSourceDocumentRow(row) : null;
}

function mapSourceDocumentRow(row: SourceDocumentRow): SourceDocument {
  return {
    id: row.id,
    runId: row.run_id,
    url: row.url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    authors: parseJsonArray(row.authors_json),
    publisher: row.publisher,
    publishedAt: row.published_at,
    retrievedAt: row.retrieved_at,
    sourceType: row.source_type,
    trustLevel: row.trust_level,
    contentHash: row.content_hash,
    r2ObjectKey: row.r2_object_key,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCanonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function deterministicContentHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `stub-${hash.toString(16).padStart(8, "0")}`;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function isPaperDesignDocSourceType(sourceType: SourceType): boolean {
  return ["paper", "design_doc", "proposal", "standard"].includes(sourceType);
}
