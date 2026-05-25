export type FeedbackType =
  | "factual_correction"
  | "missing_source"
  | "weak_inference"
  | "module_confusing"
  | "other";

export type FeedbackItemStatus = "new" | "queued_follow_up" | "reviewed";

export type FeedbackItem = {
  id: string;
  topicId: string | null;
  publishedVersionId: string | null;
  moduleAnchor: string | null;
  feedbackType: FeedbackType;
  body: string;
  sourceLinks: string[];
  submitterEmail: string | null;
  status: FeedbackItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackInput = {
  topicId?: string | null;
  publishedVersionId?: string | null;
  moduleAnchor?: string | null;
  feedbackType: string;
  body: string;
  sourceLinksText: string;
  submitterEmail: string;
  turnstileToken: string;
};

export type FeedbackValidationResult =
  | {
      ok: true;
      value: {
        topicId: string | null;
        publishedVersionId: string | null;
        moduleAnchor: string | null;
        feedbackType: FeedbackType;
        body: string;
        sourceLinks: string[];
        submitterEmail: string | null;
        turnstileToken: string;
      };
      fieldErrors: {};
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
    };
