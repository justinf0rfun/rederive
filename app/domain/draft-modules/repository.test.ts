import { describe, expect, it } from "vitest";

import {
  evaluateDraftModuleReviewState,
  rejectDraftModule,
} from "./repository.server";
import type { DraftModule } from "./types";

describe("draft module review gates", () => {
  it("requires a reason before rejecting a draft module", async () => {
    await expect(
      rejectDraftModule({} as D1Database, {
        moduleId: "module-1",
        reviewerEmail: "admin@example.com",
        reason: " ",
      })
    ).rejects.toThrow("requires a reason");
  });

  it("blocks publish readiness when modules are stale or rejected", () => {
    const evaluation = evaluateDraftModuleReviewState([
      draftModule({ moduleKey: "orientation", status: "approved" }),
      draftModule({
        moduleKey: "stage_2",
        status: "rejected",
        staleReason: "Stage framing is unsupported.",
      }),
      draftModule({
        moduleKey: "debt_map",
        status: "stale",
        staleReason: "Upstream stage module stage_2 was rejected.",
      }),
    ]);

    expect(evaluation).toMatchObject({
      moduleCount: 3,
      staleModuleCount: 1,
      rejectedModuleCount: 1,
      blockerCount: 2,
      sufficient: false,
    });
    expect(evaluation.blockers).toEqual([
      "debt_map is stale: Upstream stage module stage_2 was rejected.",
      "stage_2 is rejected: Stage framing is unsupported.",
    ]);
  });
});

function draftModule(
  override: Partial<DraftModule> & Pick<DraftModule, "moduleKey" | "status">
): DraftModule {
  const { moduleKey, status, ...rest } = override;
  return {
    id: `module-${moduleKey}`,
    runId: "run-1",
    moduleKey,
    moduleType: "stage",
    status,
    content: {},
    validation: { ok: true },
    staleReason: null,
    generatedFromStepId: null,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    ...rest,
  };
}
