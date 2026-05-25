import type { GenerationRun } from "~/domain/generation-runs/types";
import type { CandidateSourceDocument, SourceType, TrustLevel } from "./types";

type ClassifiedSource = {
  sourceType: SourceType;
  trustLevel: TrustLevel;
  publisher: string | null;
};

export function discoverCandidateSourcesForRun(
  run: GenerationRun
): CandidateSourceDocument[] {
  const submittedSourceLinks = Array.isArray(run.scope.submittedSourceLinks)
    ? run.scope.submittedSourceLinks.filter(
        (link): link is string => typeof link === "string" && link.length > 0
      )
    : [];

  const generatedSources = buildDeterministicProviderSources(run);
  const submittedSources = submittedSourceLinks.map((url, index) => {
    const classified = classifyUrl(url);
    return buildCandidateSource({
      run,
      url,
      index: generatedSources.length + index,
      title: `${run.topicDisplayName} submitted source ${index + 1}`,
      classified,
    });
  });

  return dedupeByCanonicalUrl([...generatedSources, ...submittedSources]);
}

export function discoverPaperDesignDocSourcesForRun(
  run: GenerationRun,
  requestOrdinal = 0
): CandidateSourceDocument[] {
  const submittedSourceLinks = Array.isArray(run.scope.submittedSourceLinks)
    ? run.scope.submittedSourceLinks.filter(
        (link): link is string => typeof link === "string" && link.length > 0
      )
    : [];

  const submittedCoverageSources = submittedSourceLinks
    .map((url, index) => ({ url, classified: classifyUrl(url), index }))
    .filter(({ classified }) =>
      ["paper", "design_doc", "proposal", "standard"].includes(
        classified.sourceType
      )
    )
    .map(({ url, classified, index }) =>
      buildCandidateSource({
        run,
        url,
        index: 20 + requestOrdinal * 10 + index,
        title: `${run.topicDisplayName} submitted paper/design source ${
          index + 1
        }`,
        classified,
        snapshotPrefix: "paper-design-doc-snapshots",
      })
    );

  const generatedCoverageSources = buildDeterministicPaperDesignDocSources(
    run,
    requestOrdinal
  );

  return dedupeByCanonicalUrl([
    ...generatedCoverageSources,
    ...submittedCoverageSources,
  ]);
}

function buildDeterministicProviderSources(
  run: GenerationRun
): CandidateSourceDocument[] {
  const baseSlug = encodeURIComponent(run.topicSlug);
  const urls = [
    `https://example.com/rederive/source-stubs/${baseSlug}/official-docs`,
    `https://example.com/rederive/source-stubs/${baseSlug}/repository`,
  ];

  return urls.map((url, index) => {
    const classified = index === 0
      ? {
          sourceType: "official_docs" as const,
          trustLevel: "high" as const,
          publisher: `${run.topicDisplayName} maintainers`,
        }
      : {
          sourceType: "repository" as const,
          trustLevel: "high" as const,
          publisher: `${run.topicDisplayName} project`,
        };

    return buildCandidateSource({
      run,
      url,
      index,
      title:
        index === 0
          ? `${run.topicDisplayName} official documentation placeholder`
          : `${run.topicDisplayName} repository placeholder`,
      classified,
    });
  });
}

function buildDeterministicPaperDesignDocSources(
  run: GenerationRun,
  requestOrdinal: number
): CandidateSourceDocument[] {
  const baseSlug = encodeURIComponent(run.topicSlug);
  const url =
    requestOrdinal === 0
      ? `https://example.com/rederive/source-stubs/${baseSlug}/architecture-paper`
      : `https://example.com/rederive/source-stubs/${baseSlug}/design-doc-followup-${requestOrdinal}`;
  const classified =
    requestOrdinal === 0
      ? {
          sourceType: "paper" as const,
          trustLevel: "high" as const,
          publisher: `${run.topicDisplayName} research archive`,
        }
      : {
          sourceType: "design_doc" as const,
          trustLevel: "high" as const,
          publisher: `${run.topicDisplayName} architecture archive`,
        };

  return [
    buildCandidateSource({
      run,
      url,
      index: 10 + requestOrdinal,
      title:
        requestOrdinal === 0
          ? `${run.topicDisplayName} architecture paper placeholder`
          : `${run.topicDisplayName} follow-up design document placeholder ${requestOrdinal}`,
      classified,
      snapshotPrefix: "paper-design-doc-snapshots",
    }),
  ];
}

function buildCandidateSource(params: {
  run: GenerationRun;
  url: string;
  index: number;
  title: string;
  classified: ClassifiedSource;
  snapshotPrefix?: string;
}): CandidateSourceDocument {
  const snapshotIndex = String(params.index + 1).padStart(2, "0");
  const snapshotPrefix = params.snapshotPrefix || "source-snapshots";

  return {
    url: params.url,
    canonicalUrl: canonicalizeUrl(params.url),
    title: params.title,
    publisher: params.classified.publisher,
    retrievedAt: new Date().toISOString(),
    sourceType: params.classified.sourceType,
    trustLevel: params.classified.trustLevel,
    r2ObjectKey: `${snapshotPrefix}/${params.run.id}/${snapshotIndex}.html`,
  };
}

function classifyUrl(url: string): ClassifiedSource {
  const lowerUrl = url.toLowerCase();
  let host = "";

  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return {
      sourceType: "secondary_context",
      trustLevel: "low",
      publisher: null,
    };
  }

  if (
    lowerUrl.includes("arxiv.org") ||
    lowerUrl.includes("doi.org") ||
    lowerUrl.includes("paper") ||
    lowerUrl.includes("research")
  ) {
    return {
      sourceType: "paper",
      trustLevel: "high",
      publisher: host,
    };
  }

  if (host.includes("github.com") || host.includes("gitlab.com")) {
    return {
      sourceType: "repository",
      trustLevel: "high",
      publisher: host,
    };
  }

  if (lowerUrl.includes("docs") || lowerUrl.includes("developer")) {
    return {
      sourceType: "official_docs",
      trustLevel: "high",
      publisher: host,
    };
  }

  if (lowerUrl.includes("rfc") || lowerUrl.includes("standard")) {
    return {
      sourceType: "standard",
      trustLevel: "primary",
      publisher: host,
    };
  }

  if (lowerUrl.includes("proposal") || lowerUrl.includes("design")) {
    return {
      sourceType: "design_doc",
      trustLevel: "high",
      publisher: host,
    };
  }

  if (lowerUrl.includes("blog") || lowerUrl.includes("engineering")) {
    return {
      sourceType: "engineering_blog",
      trustLevel: "medium",
      publisher: host,
    };
  }

  return {
    sourceType: "secondary_context",
    trustLevel: "medium",
    publisher: host,
  };
}

function dedupeByCanonicalUrl(
  sources: CandidateSourceDocument[]
): CandidateSourceDocument[] {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = source.canonicalUrl || source.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return url.trim();
  }
}
