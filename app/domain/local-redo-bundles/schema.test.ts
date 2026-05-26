import { describe, expect, it } from "vitest";

import { createValidRedoCaseSnapshot } from "~/domain/redo/fixtures";
import {
  REDO_LOCAL_BUNDLE_VERSION,
  REDO_LOCAL_SOURCE_MODE,
  buildValidationSnapshot,
  parseRedoLocalBundle,
} from "./schema";
import { buildDraftModulesFromLocalBundle } from "./import.server";

describe("local redo bundle", () => {
  it("parses a local redo bundle and prepares publishable draft modules", () => {
    const snapshot = createValidRedoCaseSnapshot();
    const bundle = parseRedoLocalBundle({
      bundleVersion: REDO_LOCAL_BUNDLE_VERSION,
      sourceMode: REDO_LOCAL_SOURCE_MODE,
      promptVersion: "redo-skill-local-test",
      exportedAt: "2026-05-26T00:00:00.000Z",
      language: snapshot.language,
      topic: {
        slug: snapshot.topic.slug,
        displayName: snapshot.topic.displayName,
        aliases: snapshot.topic.aliases,
        category: snapshot.topic.category,
      },
      designQuestions: snapshot.designQuestions,
      sources: snapshot.sources,
      sourceEvidence: snapshot.sourceEvidence.map((evidence) => ({
        ...evidence,
        evidenceType: "direct_quote",
      })),
      evidenceClaims: snapshot.evidenceClaims,
      orientation: snapshot.orientation,
      stages: snapshot.stages,
      throughline: snapshot.throughline,
      transferablePattern: snapshot.transferablePattern,
      boundaries: snapshot.boundaries,
      debtMap: snapshot.debtMap,
      painRanking: snapshot.painRanking,
      causalChain: snapshot.causalChain,
    });

    expect(bundle.promptVersion).toBe("redo-skill-local-test");
    expect(buildValidationSnapshot(bundle).topic.slug).toBe("kafka");

    const modules = buildDraftModulesFromLocalBundle(bundle);
    expect(modules.map((module) => module.moduleKey)).toContain("orientation");
    expect(modules.map((module) => module.moduleKey)).toContain("stage_1");
    expect(modules.map((module) => module.moduleKey)).toContain("source_notes");
    expect(modules.every((module) => module.validation.ok === true)).toBe(true);
  });

  it("rejects bundles that weaken redo evidence gates", () => {
    const snapshot = createValidRedoCaseSnapshot();

    expect(() =>
      parseRedoLocalBundle({
        bundleVersion: REDO_LOCAL_BUNDLE_VERSION,
        sourceMode: REDO_LOCAL_SOURCE_MODE,
        promptVersion: "redo-skill-local-test",
        language: snapshot.language,
        topic: {
          slug: snapshot.topic.slug,
          displayName: snapshot.topic.displayName,
          aliases: snapshot.topic.aliases,
          category: snapshot.topic.category,
        },
        sources: snapshot.sources.filter(
          (source) => source.sourceType !== "paper"
        ),
        sourceEvidence: snapshot.sourceEvidence.map((evidence) => ({
          ...evidence,
          evidenceType: "direct_quote",
        })),
        evidenceClaims: snapshot.evidenceClaims,
        orientation: snapshot.orientation,
        stages: snapshot.stages,
        throughline: snapshot.throughline,
        transferablePattern: snapshot.transferablePattern,
        boundaries: snapshot.boundaries,
        debtMap: snapshot.debtMap,
        painRanking: snapshot.painRanking,
        causalChain: snapshot.causalChain,
      })
    ).toThrow("Published redo cases require paper");
  });
});
