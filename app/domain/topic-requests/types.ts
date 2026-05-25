export type TopicRequestInput = {
  topicText: string;
  reason: string;
  submitterEmail: string;
  sourceLinksText: string;
  turnstileToken: string;
  locale: "zh" | "en";
};

export type ValidTopicRequestInput = {
  topicText: string;
  normalizedTopicSlug: string;
  reason: string | null;
  submitterEmail: string | null;
  sourceLinks: string[];
  locale: "zh" | "en";
  turnstileToken: string;
};

export type TopicRequest = {
  id: string;
  topicText: string;
  normalizedTopicSlug: string | null;
  reason: string | null;
  submitterEmail: string | null;
  sourceLinks: string[];
  locale: "zh" | "en";
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type TopicRequestValidationResult =
  | {
      ok: true;
      value: ValidTopicRequestInput;
      fieldErrors: Record<string, never>;
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
    };
