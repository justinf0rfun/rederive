import { describe, expect, it } from "vitest";

import {
  REDO_CONTRACT_VERSION,
  REDO_PROMPT_SOURCE,
  REDO_PROMPT_VERSION,
  REDO_SKILL_PROMPT,
  buildRedoPromptForStep,
  getRedoPromptManifestForStep,
} from "./redo-skill";

describe("redo skill prompt", () => {
  it("preserves the core redo prompt rules", () => {
    expect(REDO_SKILL_PROMPT).toContain(
      "Every mature system is a fossil record of the constraints it survived."
    );
    expect(REDO_SKILL_PROMPT).toContain(
      "Research relevant papers separately"
    );
    expect(REDO_SKILL_PROMPT).toContain(
      "Choose stages by engineering decision pressure, not by release chronology."
    );
    expect(REDO_SKILL_PROMPT).toContain(
      "Every table must contain at least two rejected options and one chosen path."
    );
    expect(REDO_SKILL_PROMPT).toContain(
      "Does every resolved or unresolved debt connect back to a stage or debt ID?"
    );
  });

  it("maps generation steps to versioned prompt metadata", () => {
    expect(getRedoPromptManifestForStep("paper_design_doc_discovery")).toEqual({
      promptVersion: REDO_PROMPT_VERSION,
      contractVersion: REDO_CONTRACT_VERSION,
      source: REDO_PROMPT_SOURCE,
      phase: "paper_design_doc_discovery",
    });

    expect(getRedoPromptManifestForStep("module_generation").phase).toBe(
      "module_generation"
    );
  });

  it("builds a localized task prompt for provider adapters", () => {
    const prompt = buildRedoPromptForStep({
      stepKey: "stage_outline",
      topicDisplayName: "Kafka",
      language: "zh",
    });

    expect(prompt.promptVersion).toBe(REDO_PROMPT_VERSION);
    expect(prompt.system).toBe(REDO_SKILL_PROMPT);
    expect(prompt.task).toContain("Topic: Kafka");
    expect(prompt.task).toContain("Generation phase: orientation_and_stage_outline");
    expect(prompt.task).toContain("Use Chinese for all user-facing content");
    expect(prompt.task).toContain("7-9 stage outline");
  });
});
