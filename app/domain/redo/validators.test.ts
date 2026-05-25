import { describe, expect, it } from "vitest";

import { createValidRedoCaseSnapshot } from "./fixtures";
import { validateRedoCaseSnapshot } from "./validators";

describe("validateRedoCaseSnapshot", () => {
  it("accepts a valid redo case snapshot", () => {
    const result = validateRedoCaseSnapshot(createValidRedoCaseSnapshot());

    expect(result.ok).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("blocks stages without two rejected options and one chosen option", () => {
    const snapshot = createValidRedoCaseSnapshot();
    snapshot.stages[0].options = snapshot.stages[0].options.filter(
      (option) => option.outcome === "chosen"
    );

    const result = validateRedoCaseSnapshot(snapshot);

    expect(result.ok).toBe(false);
    expect(result.blockers.map((issue) => issue.code)).toContain(
      "schema.invalid"
    );
  });

  it("blocks debt IDs that are introduced but missing from the debt map", () => {
    const snapshot = createValidRedoCaseSnapshot();
    snapshot.debtMap.unresolved = [];

    const result = validateRedoCaseSnapshot(snapshot);

    expect(result.ok).toBe(false);
    expect(result.blockers.map((issue) => issue.code)).toContain(
      "debt.missing_from_map"
    );
  });

  it("blocks debt IDs that appear in the debt map without stage origin", () => {
    const snapshot = createValidRedoCaseSnapshot();
    snapshot.debtMap.unresolved[0].debtId = "D2";

    const result = validateRedoCaseSnapshot(snapshot);

    expect(result.ok).toBe(false);
    expect(result.blockers.map((issue) => issue.code)).toContain(
      "debt.unknown_in_map"
    );
  });

  it("blocks factual claims without source evidence", () => {
    const snapshot = createValidRedoCaseSnapshot();
    snapshot.evidenceClaims[0].sourceEvidenceIds = [];

    const result = validateRedoCaseSnapshot(snapshot);

    expect(result.ok).toBe(false);
    expect(result.blockers.map((issue) => issue.code)).toContain(
      "claim.fact_without_evidence"
    );
  });
});
