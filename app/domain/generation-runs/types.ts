export type Topic = {
  id: string;
  slug: string;
  displayName: string;
  aliases: string[];
  category: string | null;
  latestPublishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GenerationRun = {
  id: string;
  topicId: string;
  topicRequestId: string | null;
  topicDisplayName: string;
  topicSlug: string;
  language: "zh" | "en";
  contractVersion: string;
  status: string;
  scope: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
