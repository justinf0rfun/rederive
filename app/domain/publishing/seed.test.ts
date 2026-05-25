import { describe, expect, it } from "vitest";

import { createValidRedoCaseSnapshot } from "~/domain/redo/fixtures";
import { validateRedoCaseSnapshot } from "~/domain/redo/validators";

describe("seed benchmark case", () => {
  it("validates against the redo contract and exposes reader paths", () => {
    const snapshot = createValidRedoCaseSnapshot();
    const validation = validateRedoCaseSnapshot(snapshot);

    expect(validation.ok).toBe(true);
    expect(`/${snapshot.language}/cases/${snapshot.topic.slug}`).toBe(
      "/zh/cases/kafka"
    );
    expect(
      `/${snapshot.language}/cases/${snapshot.topic.slug}/v/${snapshot.version.id}`
    ).toBe("/zh/cases/kafka/v/version-kafka-1");
    expect(snapshot.designQuestions[0]?.slug).toBe(
      "why-logs-become-core-abstractions"
    );
    expect(snapshot.transferablePattern.name).toBe(
      "Log as shared durable history"
    );
  });
});
