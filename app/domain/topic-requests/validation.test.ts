import { describe, expect, it } from "vitest";

import { normalizeTopicSlug, validateTopicRequestInput } from "./validation";

describe("validateTopicRequestInput", () => {
  it("accepts a valid topic request", () => {
    const result = validateTopicRequestInput({
      topicText: "Kafka",
      reason: "I want the log abstraction explained.",
      submitterEmail: "reader@example.com",
      sourceLinksText: "https://example.com/paper",
      turnstileToken: "dev",
      locale: "zh",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.normalizedTopicSlug).toBe("kafka");
      expect(result.value.sourceLinks).toEqual(["https://example.com/paper"]);
    }
  });

  it("rejects invalid source links", () => {
    const result = validateTopicRequestInput({
      topicText: "Kafka",
      reason: "",
      submitterEmail: "",
      sourceLinksText: "not-a-url",
      turnstileToken: "dev",
      locale: "zh",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.sourceLinksText).toBeTruthy();
    }
  });

  it("rejects overlong topic text", () => {
    const result = validateTopicRequestInput({
      topicText: "x".repeat(121),
      reason: "",
      submitterEmail: "",
      sourceLinksText: "",
      turnstileToken: "dev",
      locale: "zh",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.topicText).toBeTruthy();
    }
  });
});

describe("normalizeTopicSlug", () => {
  it("normalizes mixed topic names", () => {
    expect(normalizeTopicSlug("React Server Components")).toBe(
      "react-server-components"
    );
  });
});
