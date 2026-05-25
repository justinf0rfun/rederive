import {
  evaluateClaimEvidenceMapData,
  listClaimEvidenceMap,
} from "~/domain/claim-evidence/repository.server";
import type { ClaimEvidenceMap } from "~/domain/claim-evidence/types";
import {
  evaluateDraftModuleReviewState,
  listDraftModules,
} from "~/domain/draft-modules/repository.server";
import type { DraftModule } from "~/domain/draft-modules/types";
import { getGenerationRunById } from "~/domain/generation-runs/repository.server";
import type { GenerationRun, Topic } from "~/domain/generation-runs/types";
import type {
  RedoCaseSnapshot,
  RedoStage,
} from "~/domain/redo/contract";
import {
  REDO_CONTRACT_VERSION,
} from "~/domain/redo/contract";
import { validateRedoCaseSnapshot } from "~/domain/redo/validators";
import {
  evaluatePaperDesignDocCoverageFromSources,
  evaluateSourceCorpus,
  listSourceDocuments,
} from "~/domain/sources/repository.server";
import type { SourceDocument } from "~/domain/sources/types";
import type { PublishedVersion, PublishPreflight } from "./types";

const REQUIRED_SINGLE_MODULE_KEYS = [
  "orientation",
  "stage_outline",
  "throughline",
  "transferable_pattern",
  "boundaries",
  "debt_map",
  "pain_ranking",
  "causal_chain",
];

type TopicRow = {
  id: string;
  slug: string;
  display_name: string;
  aliases_json: string;
  category: string | null;
  latest_published_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type PublishedVersionRow = {
  id: string;
  topic_id: string;
  version_number: number;
  language: "zh" | "en";
  contract_version: string;
  content_json: string;
  render_manifest_json: string;
  source_summary_json: string;
  revision_note: string | null;
  supersedes_version_id: string | null;
  published_by: string;
  published_at: string;
  created_at: string;
};

export class PublishBlockedError extends Error {
  constructor(public readonly preflight: PublishPreflight) {
    super(preflight.blockers.join(" "));
    this.name = "PublishBlockedError";
  }
}

export async function evaluatePublishPreflight(
  db: D1Database,
  runId: string
): Promise<PublishPreflight> {
  const parts = await loadPublishParts(db, runId);
  if (!parts) {
    return {
      ok: false,
      blockers: [`Generation run ${runId} was not found.`],
      warnings: [],
    };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];
  const sourceEvaluation = await evaluateSourceCorpus(db, runId);
  if (!sourceEvaluation.sufficient) {
    blockers.push(sourceEvaluation.reason || "Source corpus is insufficient.");
  }

  const paperCoverage = evaluatePaperDesignDocCoverageFromSources(parts.sources);
  if (!paperCoverage.sufficient) {
    blockers.push(
      paperCoverage.reason || "Paper/design-doc coverage is insufficient."
    );
  }

  const claimEvidenceEvaluation = evaluateClaimEvidenceMapData(
    parts.claimEvidence
  );
  if (!claimEvidenceEvaluation.sufficient) {
    blockers.push(...claimEvidenceEvaluation.blockers);
  }

  const moduleEvaluation = evaluateDraftModuleReviewState(parts.modules);
  if (!moduleEvaluation.sufficient) {
    blockers.push(...moduleEvaluation.blockers);
  }

  const modulesByKey = indexModulesByKey(parts.modules);
  const requiredKeys = requiredModuleKeys(parts.modules);
  for (const moduleKey of requiredKeys) {
    const module = modulesByKey.get(moduleKey);
    if (!module) {
      blockers.push(`Required module ${moduleKey} is missing.`);
      continue;
    }

    if (module.status !== "approved") {
      blockers.push(`Required module ${moduleKey} is ${module.status}.`);
    }

    if (module.validation.ok !== true) {
      blockers.push(`Required module ${moduleKey} failed module validation.`);
    }
  }

  if (blockers.length === 0) {
    const snapshot = buildPublishedSnapshot({
      ...parts,
      version: {
        id: "preflight",
        number: 1,
        publishedAt: new Date().toISOString(),
        revisionNote: "preflight",
        supersedesVersionId: undefined,
      },
    });
    const validation = validateRedoCaseSnapshot(snapshot);
    blockers.push(...validation.blockers.map((blocker) => blocker.message));
    warnings.push(...validation.warnings.map((warning) => warning.message));
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  };
}

export async function publishGenerationRun(
  db: D1Database,
  params: { runId: string; publishedBy: string; revisionNote: string }
): Promise<PublishedVersion> {
  const revisionNote = params.revisionNote.trim();
  if (!revisionNote) {
    throw new PublishBlockedError({
      ok: false,
      blockers: ["Revision note is required."],
      warnings: [],
    });
  }

  const preflight = await evaluatePublishPreflight(db, params.runId);
  if (!preflight.ok) {
    throw new PublishBlockedError(preflight);
  }

  const parts = await loadPublishParts(db, params.runId);
  if (!parts) {
    throw new Error(`Generation run ${params.runId} was not found.`);
  }

  const latestVersion = await getLatestPublishedVersionByTopic(
    db,
    parts.run.topicId,
    parts.run.language
  );
  const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
  const versionId = crypto.randomUUID();
  const publishedAt = new Date().toISOString();
  const snapshot = buildPublishedSnapshot({
    ...parts,
    version: {
      id: versionId,
      number: versionNumber,
      publishedAt,
      revisionNote,
      supersedesVersionId: latestVersion?.id,
    },
  });
  const validation = validateRedoCaseSnapshot(snapshot);
  if (!validation.ok) {
    throw new PublishBlockedError({
      ok: false,
      blockers: validation.blockers.map((blocker) => blocker.message),
      warnings: validation.warnings.map((warning) => warning.message),
    });
  }

  const renderManifest = {
    latestPath: `/${parts.run.language}/cases/${parts.topic.slug}`,
    versionPath: `/${parts.run.language}/cases/${parts.topic.slug}/v/${versionId}`,
  };
  const sourceSummary = {
    sourceCount: snapshot.trust.sourceCount,
    paperOrDesignDocCount: snapshot.trust.paperOrDesignDocCount,
    claimCount: snapshot.trust.claimCount,
  };

  await db
    .prepare(
      [
        "INSERT INTO published_versions",
        "(id, topic_id, version_number, language, contract_version, content_json, render_manifest_json, source_summary_json, revision_note, supersedes_version_id, published_by, published_at)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ].join(" ")
    )
    .bind(
      versionId,
      parts.run.topicId,
      versionNumber,
      parts.run.language,
      parts.run.contractVersion,
      JSON.stringify(snapshot),
      JSON.stringify(renderManifest),
      JSON.stringify(sourceSummary),
      revisionNote,
      latestVersion?.id || null,
      params.publishedBy,
      publishedAt
    )
    .run();

  await db
    .prepare(
      [
        "UPDATE topics",
        "SET latest_published_version_id = ?, updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(versionId, parts.run.topicId)
    .run();

  await db
    .prepare(
      [
        "UPDATE generation_runs",
        "SET status = 'published', completed_at = CURRENT_TIMESTAMP, error_code = NULL, error_message = NULL, updated_at = CURRENT_TIMESTAMP",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(params.runId)
    .run();

  const published = await getPublishedVersionById(db, versionId);
  if (!published) {
    throw new Error("Published version was inserted but could not be read.");
  }
  return published;
}

export async function getLatestPublishedVersionBySlug(
  db: D1Database,
  slug: string,
  language: "zh" | "en"
): Promise<PublishedVersion | null> {
  const row = await db
    .prepare(
      [
        "SELECT published_versions.id, published_versions.topic_id, published_versions.version_number,",
        "published_versions.language, published_versions.contract_version, published_versions.content_json,",
        "published_versions.render_manifest_json, published_versions.source_summary_json, published_versions.revision_note,",
        "published_versions.supersedes_version_id, published_versions.published_by, published_versions.published_at, published_versions.created_at",
        "FROM topics",
        "JOIN published_versions ON published_versions.id = topics.latest_published_version_id",
        "WHERE topics.slug = ? AND published_versions.language = ?",
      ].join(" ")
    )
    .bind(slug, language)
    .first<PublishedVersionRow>();

  return row ? mapPublishedVersionRow(row) : null;
}

export async function listLatestPublishedVersions(
  db: D1Database,
  language: "zh" | "en",
  limit = 12
): Promise<PublishedVersion[]> {
  const result = await db
    .prepare(
      [
        "SELECT published_versions.id, published_versions.topic_id, published_versions.version_number,",
        "published_versions.language, published_versions.contract_version, published_versions.content_json,",
        "published_versions.render_manifest_json, published_versions.source_summary_json, published_versions.revision_note,",
        "published_versions.supersedes_version_id, published_versions.published_by, published_versions.published_at, published_versions.created_at",
        "FROM topics",
        "JOIN published_versions ON published_versions.id = topics.latest_published_version_id",
        "WHERE published_versions.language = ?",
        "ORDER BY published_versions.published_at DESC",
        "LIMIT ?",
      ].join(" ")
    )
    .bind(language, limit)
    .all<PublishedVersionRow>();

  return result.results.map(mapPublishedVersionRow);
}

export async function getPublishedVersionById(
  db: D1Database,
  id: string
): Promise<PublishedVersion | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, topic_id, version_number, language, contract_version, content_json, render_manifest_json,",
        "source_summary_json, revision_note, supersedes_version_id, published_by, published_at, created_at",
        "FROM published_versions",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(id)
    .first<PublishedVersionRow>();

  return row ? mapPublishedVersionRow(row) : null;
}

async function getLatestPublishedVersionByTopic(
  db: D1Database,
  topicId: string,
  language: "zh" | "en"
): Promise<PublishedVersion | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, topic_id, version_number, language, contract_version, content_json, render_manifest_json,",
        "source_summary_json, revision_note, supersedes_version_id, published_by, published_at, created_at",
        "FROM published_versions",
        "WHERE topic_id = ? AND language = ?",
        "ORDER BY version_number DESC",
        "LIMIT 1",
      ].join(" ")
    )
    .bind(topicId, language)
    .first<PublishedVersionRow>();

  return row ? mapPublishedVersionRow(row) : null;
}

async function loadPublishParts(
  db: D1Database,
  runId: string
): Promise<{
  run: GenerationRun;
  topic: Topic;
  sources: SourceDocument[];
  claimEvidence: ClaimEvidenceMap;
  modules: DraftModule[];
} | null> {
  const run = await getGenerationRunById(db, runId);
  if (!run) {
    return null;
  }

  const [topic, sources, claimEvidence, modules] = await Promise.all([
    getTopicById(db, run.topicId),
    listSourceDocuments(db, runId),
    listClaimEvidenceMap(db, runId),
    listDraftModules(db, runId),
  ]);

  if (!topic) {
    return null;
  }

  return { run, topic, sources, claimEvidence, modules };
}

function buildPublishedSnapshot(params: {
  run: GenerationRun;
  topic: Topic;
  sources: SourceDocument[];
  claimEvidence: ClaimEvidenceMap;
  modules: DraftModule[];
  version: {
    id: string;
    number: number;
    publishedAt: string;
    revisionNote: string;
    supersedesVersionId?: string;
  };
}): RedoCaseSnapshot {
  const modulesByKey = indexModulesByKey(params.modules);
  const orientation = requiredModule(modulesByKey, "orientation").content;
  const stageOutline = requiredModule(modulesByKey, "stage_outline").content;
  const stageModules = params.modules
    .filter((module) => module.moduleType === "stage")
    .sort((left, right) => stageNumber(left) - stageNumber(right));
  const throughline = requiredModule(modulesByKey, "throughline").content;
  const transferablePattern = requiredModule(
    modulesByKey,
    "transferable_pattern"
  ).content;
  const boundaries = requiredModule(modulesByKey, "boundaries").content;
  const debtMap = requiredModule(modulesByKey, "debt_map").content;
  const painRanking = requiredModule(modulesByKey, "pain_ranking").content;
  const causalChain = requiredModule(modulesByKey, "causal_chain").content;
  const usableSources = params.sources.filter(
    (source) => source.status !== "rejected"
  );
  const claimsByEvidence = claimsByEvidenceId(params.claimEvidence);

  return {
    contractVersion: REDO_CONTRACT_VERSION,
    language: params.run.language,
    topic: {
      id: params.topic.id,
      slug: params.topic.slug,
      displayName: params.topic.displayName,
      aliases: params.topic.aliases,
      category: params.topic.category || "unknown",
    },
    version: params.version,
    trust: {
      reviewed: true,
      sourceCount: usableSources.length,
      paperOrDesignDocCount: usableSources.filter((source) =>
        ["paper", "design_doc", "proposal", "standard"].includes(
          source.sourceType
        )
      ).length,
      claimCount: params.claimEvidence.claims.length,
      inferenceCount: params.claimEvidence.claims.filter(
        (claim) => claim.claimType === "inference"
      ).length,
      controversialJudgmentCount: params.claimEvidence.claims.filter(
        (claim) => claim.claimType === "controversial_judgment"
      ).length,
    },
    orientation: {
      whatItIs: String(orientation.whatItIs || ""),
      centralPressure: String(orientation.centralPressure || ""),
      tradeoffTheme: String(orientation.tradeoffTheme || ""),
      oneSentenceVersion: String(orientation.oneSentenceVersion || ""),
    },
    designQuestions: designQuestionsFromStageOutline(stageOutline),
    stages: stageModules.map((module) => module.content as RedoStage),
    throughline: throughline as RedoCaseSnapshot["throughline"],
    transferablePattern:
      transferablePattern as RedoCaseSnapshot["transferablePattern"],
    boundaries: listItems(boundaries) as RedoCaseSnapshot["boundaries"],
    debtMap: debtMap as RedoCaseSnapshot["debtMap"],
    painRanking: listItems(painRanking) as RedoCaseSnapshot["painRanking"],
    causalChain: causalChain as RedoCaseSnapshot["causalChain"],
    sources: usableSources.map((source) => ({
      id: source.id,
      title: source.title || source.url,
      url: source.url,
      sourceType: source.sourceType,
      trustLevel: source.trustLevel,
      retrievedAt: source.retrievedAt,
      supportsClaimIds: params.claimEvidence.evidence
        .filter((evidence) => evidence.sourceId === source.id)
        .flatMap((evidence) => claimsByEvidence[evidence.id] || []),
    })),
    sourceEvidence: params.claimEvidence.evidence.map((evidence) => {
      const source = params.sources.find((item) => item.id === evidence.sourceId);
      return {
        id: evidence.id,
        sourceId: evidence.sourceId,
        excerpt: evidence.excerpt,
        locator: evidence.locator || "source",
        retrievedAt: source?.retrievedAt || evidence.createdAt,
        contentHash: evidence.contentHash || evidence.id,
        supportsClaimIds: claimsByEvidence[evidence.id] || [],
      };
    }),
    evidenceClaims: params.claimEvidence.claims.map((claim) => ({
      id: claim.id,
      statement: claim.statement,
      claimType: claim.claimType,
      confidence: claim.confidence,
      moduleId: claim.moduleId || "unassigned",
      sourceEvidenceIds: claim.sourceEvidenceIds,
      inferenceBasisClaimIds: claim.inferenceBasisClaimIds,
      publishable: claim.publishable,
    })),
    inferenceNotes: params.claimEvidence.claims
      .filter((claim) => claim.claimType !== "fact")
      .map((claim) => ({
        id: `inference-note-${claim.id}`,
        moduleId: claim.moduleId || "unassigned",
        note: claim.statement,
        basisClaimIds: claim.inferenceBasisClaimIds,
        confidence: claim.confidence,
      })),
    socialCards: [],
  };
}

function requiredModule(
  modulesByKey: Map<string, DraftModule>,
  moduleKey: string
): DraftModule {
  const module = modulesByKey.get(moduleKey);
  if (!module) {
    throw new Error(`Required module ${moduleKey} is missing.`);
  }
  return module;
}

function requiredModuleKeys(modules: DraftModule[]): string[] {
  const stageOutline = modules.find(
    (module) => module.moduleKey === "stage_outline"
  );
  const stageCount = Number(stageOutline?.content.stageCount);
  const stageKeys =
    Number.isInteger(stageCount) && stageCount > 0
      ? Array.from({ length: stageCount }, (_, index) => `stage_${index + 1}`)
      : modules
          .filter((module) => module.moduleType === "stage")
          .map((module) => module.moduleKey)
          .sort();

  return [...REQUIRED_SINGLE_MODULE_KEYS, ...stageKeys];
}

function indexModulesByKey(modules: DraftModule[]): Map<string, DraftModule> {
  return new Map(modules.map((module) => [module.moduleKey, module]));
}

function stageNumber(module: DraftModule): number {
  const fromContent = Number(module.content.number);
  if (Number.isFinite(fromContent)) {
    return fromContent;
  }
  const match = module.moduleKey.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function designQuestionsFromStageOutline(
  content: Record<string, unknown>
): RedoCaseSnapshot["designQuestions"] {
  const stages = Array.isArray(content.stages) ? content.stages : [];
  return stages.map((stage, index) => {
    const value =
      stage && typeof stage === "object" ? (stage as Record<string, unknown>) : {};
    return {
      slug: String(value.slug || `stage-${index + 1}`),
      title: String(value.title || `Stage ${index + 1}`),
      summary: String(value.pressure || value.title || `Stage ${index + 1}`),
    };
  });
}

function listItems(value: Record<string, unknown>): unknown[] {
  return Array.isArray(value.items) ? value.items : [];
}

function claimsByEvidenceId(claimEvidence: ClaimEvidenceMap): Record<string, string[]> {
  return claimEvidence.claims.reduce<Record<string, string[]>>((acc, claim) => {
    for (const evidenceId of claim.sourceEvidenceIds) {
      acc[evidenceId] ||= [];
      acc[evidenceId].push(claim.id);
    }
    return acc;
  }, {});
}

async function getTopicById(
  db: D1Database,
  topicId: string
): Promise<Topic | null> {
  const row = await db
    .prepare(
      [
        "SELECT id, slug, display_name, aliases_json, category, latest_published_version_id, created_at, updated_at",
        "FROM topics",
        "WHERE id = ?",
      ].join(" ")
    )
    .bind(topicId)
    .first<TopicRow>();

  return row
    ? {
        id: row.id,
        slug: row.slug,
        displayName: row.display_name,
        aliases: parseJsonArray(row.aliases_json),
        category: row.category,
        latestPublishedVersionId: row.latest_published_version_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

function mapPublishedVersionRow(row: PublishedVersionRow): PublishedVersion {
  return {
    id: row.id,
    topicId: row.topic_id,
    versionNumber: row.version_number,
    language: row.language,
    contractVersion: row.contract_version,
    content: parseJsonObject(row.content_json) as RedoCaseSnapshot,
    renderManifest: parseJsonObject(row.render_manifest_json),
    sourceSummary: parseJsonObject(row.source_summary_json),
    revisionNote: row.revision_note,
    supersedesVersionId: row.supersedes_version_id,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
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
