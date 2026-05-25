import type {
  CandidateEvidenceClaim,
  CandidateSourceEvidence,
  ClaimEvidenceEvaluation,
  ClaimEvidenceMap,
  ClaimType,
  Confidence,
  EvidenceClaim,
  EvidenceType,
  SourceEvidence,
} from "./types";

type SourceEvidenceRow = {
  id: string;
  source_id: string;
  run_id: string;
  excerpt: string;
  locator: string | null;
  evidence_type: EvidenceType;
  content_hash: string | null;
  created_at: string;
};

type EvidenceClaimRow = {
  id: string;
  run_id: string;
  statement: string;
  claim_type: ClaimType;
  confidence: Confidence;
  module_id: string | null;
  publishable: number;
  created_at: string;
  updated_at: string;
};

type ClaimEvidenceLinkRow = {
  claim_id: string;
  evidence_id: string;
};

type ClaimBasisLinkRow = {
  claim_id: string;
  basis_claim_id: string;
};

export async function replaceClaimEvidenceMap(
  db: D1Database,
  runId: string,
  params: {
    evidence: CandidateSourceEvidence[];
    claims: CandidateEvidenceClaim[];
  }
): Promise<ClaimEvidenceMap> {
  await resetClaimEvidenceMap(db, runId);

  for (const evidence of params.evidence) {
    await db
      .prepare(
        [
          "INSERT INTO source_evidence",
          "(id, source_id, run_id, excerpt, locator, evidence_type, content_hash)",
          "VALUES (?, ?, ?, ?, ?, ?, ?)",
        ].join(" ")
      )
      .bind(
        evidence.id || crypto.randomUUID(),
        evidence.sourceId,
        runId,
        evidence.excerpt,
        evidence.locator || null,
        evidence.evidenceType,
        evidence.contentHash || deterministicContentHash(evidence.excerpt)
      )
      .run();
  }

  for (const claim of params.claims) {
    const claimId = claim.id || crypto.randomUUID();
    await db
      .prepare(
        [
          "INSERT INTO evidence_claims",
          "(id, run_id, statement, claim_type, confidence, module_id, publishable)",
          "VALUES (?, ?, ?, ?, ?, ?, ?)",
        ].join(" ")
      )
      .bind(
        claimId,
        runId,
        claim.statement,
        claim.claimType,
        claim.confidence,
        claim.moduleId || null,
        claim.publishable ? 1 : 0
      )
      .run();

    for (const evidenceId of claim.sourceEvidenceIds || []) {
      await db
        .prepare(
          [
            "INSERT OR IGNORE INTO claim_evidence_links",
            "(claim_id, evidence_id)",
            "VALUES (?, ?)",
          ].join(" ")
        )
        .bind(claimId, evidenceId)
        .run();
    }

    for (const basisClaimId of claim.inferenceBasisClaimIds || []) {
      await db
        .prepare(
          [
            "INSERT OR IGNORE INTO claim_basis_links",
            "(claim_id, basis_claim_id)",
            "VALUES (?, ?)",
          ].join(" ")
        )
        .bind(claimId, basisClaimId)
        .run();
    }
  }

  return listClaimEvidenceMap(db, runId);
}

export async function upsertClaimEvidenceMap(
  db: D1Database,
  runId: string,
  params: {
    evidence: CandidateSourceEvidence[];
    claims: CandidateEvidenceClaim[];
  }
): Promise<ClaimEvidenceMap> {
  return replaceClaimEvidenceMap(db, runId, params);
}

export async function listClaimEvidenceMap(
  db: D1Database,
  runId: string
): Promise<ClaimEvidenceMap> {
  const [evidenceResult, claimsResult, evidenceLinksResult, basisLinksResult] =
    await Promise.all([
      db
        .prepare(
          [
            "SELECT id, source_id, run_id, excerpt, locator, evidence_type, content_hash, created_at",
            "FROM source_evidence",
            "WHERE run_id = ?",
            "ORDER BY created_at ASC",
          ].join(" ")
        )
        .bind(runId)
        .all<SourceEvidenceRow>(),
      db
        .prepare(
          [
            "SELECT id, run_id, statement, claim_type, confidence, module_id, publishable, created_at, updated_at",
            "FROM evidence_claims",
            "WHERE run_id = ?",
            "ORDER BY created_at ASC",
          ].join(" ")
        )
        .bind(runId)
        .all<EvidenceClaimRow>(),
      db
        .prepare(
          [
            "SELECT claim_evidence_links.claim_id, claim_evidence_links.evidence_id",
            "FROM claim_evidence_links",
            "JOIN evidence_claims ON evidence_claims.id = claim_evidence_links.claim_id",
            "WHERE evidence_claims.run_id = ?",
          ].join(" ")
        )
        .bind(runId)
        .all<ClaimEvidenceLinkRow>(),
      db
        .prepare(
          [
            "SELECT claim_basis_links.claim_id, claim_basis_links.basis_claim_id",
            "FROM claim_basis_links",
            "JOIN evidence_claims ON evidence_claims.id = claim_basis_links.claim_id",
            "WHERE evidence_claims.run_id = ?",
          ].join(" ")
        )
        .bind(runId)
        .all<ClaimBasisLinkRow>(),
    ]);

  const evidenceLinks = groupEvidenceLinks(evidenceLinksResult.results);
  const basisLinks = groupBasisLinks(basisLinksResult.results);

  return {
    evidence: evidenceResult.results.map(mapSourceEvidenceRow),
    claims: claimsResult.results.map((row) =>
      mapEvidenceClaimRow(row, evidenceLinks[row.id] || [], basisLinks[row.id] || [])
    ),
  };
}

export async function listClaimEvidenceMapsForRuns(
  db: D1Database,
  runIds: string[]
): Promise<Record<string, ClaimEvidenceMap>> {
  const maps: Record<string, ClaimEvidenceMap> = {};

  for (const runId of runIds) {
    maps[runId] = await listClaimEvidenceMap(db, runId);
  }

  return maps;
}

export async function resetClaimEvidenceMap(
  db: D1Database,
  runId: string
): Promise<void> {
  await db
    .prepare(
      [
        "DELETE FROM claim_basis_links",
        "WHERE claim_id IN (SELECT id FROM evidence_claims WHERE run_id = ?)",
        "OR basis_claim_id IN (SELECT id FROM evidence_claims WHERE run_id = ?)",
      ].join(" ")
    )
    .bind(runId, runId)
    .run();
  await db
    .prepare(
      [
        "DELETE FROM claim_evidence_links",
        "WHERE claim_id IN (SELECT id FROM evidence_claims WHERE run_id = ?)",
        "OR evidence_id IN (SELECT id FROM source_evidence WHERE run_id = ?)",
      ].join(" ")
    )
    .bind(runId, runId)
    .run();
  await db
    .prepare("DELETE FROM evidence_claims WHERE run_id = ?")
    .bind(runId)
    .run();
  await db
    .prepare("DELETE FROM source_evidence WHERE run_id = ?")
    .bind(runId)
    .run();
}

export async function evaluateClaimEvidenceMap(
  db: D1Database,
  runId: string
): Promise<ClaimEvidenceEvaluation> {
  return evaluateClaimEvidenceMapData(await listClaimEvidenceMap(db, runId));
}

export function evaluateClaimEvidenceMapData(
  map: ClaimEvidenceMap
): ClaimEvidenceEvaluation {
  const evidenceIds = new Set(map.evidence.map((evidence) => evidence.id));
  const claimIds = new Set(map.claims.map((claim) => claim.id));
  const blockers: string[] = [];
  let unsupportedFactCount = 0;
  let unsupportedInferenceCount = 0;
  let nonPublishableClaimCount = 0;

  if (map.claims.length === 0) {
    blockers.push("At least one evidence claim is required.");
  }

  if (map.evidence.length === 0) {
    blockers.push("At least one source evidence snippet is required.");
  }

  for (const claim of map.claims) {
    if (!claim.publishable) {
      nonPublishableClaimCount += 1;
      blockers.push(`Claim ${claim.id} is not publishable.`);
    }

    if (claim.claimType === "fact" && claim.sourceEvidenceIds.length === 0) {
      unsupportedFactCount += 1;
      blockers.push(`Factual claim ${claim.id} has no evidence.`);
    }

    for (const evidenceId of claim.sourceEvidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        blockers.push(`Claim ${claim.id} references unknown evidence ${evidenceId}.`);
      }
    }

    if (claim.claimType !== "fact" && claim.inferenceBasisClaimIds.length === 0) {
      unsupportedInferenceCount += 1;
      blockers.push(`Claim ${claim.id} has no basis claim.`);
    }

    for (const basisClaimId of claim.inferenceBasisClaimIds) {
      if (!claimIds.has(basisClaimId)) {
        blockers.push(`Claim ${claim.id} references unknown basis ${basisClaimId}.`);
      }
    }
  }

  return {
    claimCount: map.claims.length,
    evidenceCount: map.evidence.length,
    unsupportedFactCount,
    unsupportedInferenceCount,
    nonPublishableClaimCount,
    sufficient: blockers.length === 0,
    blockers,
  };
}

function mapSourceEvidenceRow(row: SourceEvidenceRow): SourceEvidence {
  return {
    id: row.id,
    sourceId: row.source_id,
    runId: row.run_id,
    excerpt: row.excerpt,
    locator: row.locator,
    evidenceType: row.evidence_type,
    contentHash: row.content_hash,
    createdAt: row.created_at,
  };
}

function mapEvidenceClaimRow(
  row: EvidenceClaimRow,
  sourceEvidenceIds: string[],
  inferenceBasisClaimIds: string[]
): EvidenceClaim {
  return {
    id: row.id,
    runId: row.run_id,
    statement: row.statement,
    claimType: row.claim_type,
    confidence: row.confidence,
    moduleId: row.module_id,
    publishable: row.publishable === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceEvidenceIds,
    inferenceBasisClaimIds,
  };
}

function groupEvidenceLinks(
  rows: ClaimEvidenceLinkRow[]
): Record<string, string[]> {
  return rows.reduce<Record<string, string[]>>((acc, row) => {
    acc[row.claim_id] ||= [];
    acc[row.claim_id].push(row.evidence_id);
    return acc;
  }, {});
}

function groupBasisLinks(rows: ClaimBasisLinkRow[]): Record<string, string[]> {
  return rows.reduce<Record<string, string[]>>((acc, row) => {
    acc[row.claim_id] ||= [];
    acc[row.claim_id].push(row.basis_claim_id);
    return acc;
  }, {});
}

function deterministicContentHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `claim-evidence-${hash.toString(16).padStart(8, "0")}`;
}
