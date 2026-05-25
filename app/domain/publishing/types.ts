import type { RedoCaseSnapshot } from "~/domain/redo/contract";

export type PublishPreflight = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
};

export type PublishedVersion = {
  id: string;
  topicId: string;
  versionNumber: number;
  language: "zh" | "en";
  contractVersion: string;
  content: RedoCaseSnapshot;
  renderManifest: Record<string, unknown>;
  sourceSummary: Record<string, unknown>;
  revisionNote: string | null;
  supersedesVersionId: string | null;
  publishedBy: string;
  publishedAt: string;
  createdAt: string;
};
