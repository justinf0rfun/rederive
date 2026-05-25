export type SourceType =
  | "official_docs"
  | "release_notes"
  | "design_doc"
  | "proposal"
  | "paper"
  | "standard"
  | "repository"
  | "maintainer_post"
  | "engineering_blog"
  | "interview"
  | "secondary_context";

export type TrustLevel = "primary" | "high" | "medium" | "low";

export type SourceDocumentStatus = "candidate" | "accepted" | "rejected";

export type SourceDocument = {
  id: string;
  runId: string;
  url: string;
  canonicalUrl: string | null;
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: SourceType;
  trustLevel: TrustLevel;
  contentHash: string | null;
  r2ObjectKey: string | null;
  status: SourceDocumentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CandidateSourceDocument = {
  id?: string;
  url: string;
  canonicalUrl?: string | null;
  title?: string | null;
  authors?: string[];
  publisher?: string | null;
  publishedAt?: string | null;
  retrievedAt?: string;
  sourceType: SourceType;
  trustLevel: TrustLevel;
  contentHash?: string | null;
  r2ObjectKey?: string | null;
};

export type SourceCorpusEvaluation = {
  sourceCount: number;
  usableSourceCount: number;
  trustedSourceCount: number;
  sufficient: boolean;
  reason: string | null;
};

export type PaperDesignDocCoverage = {
  sourceCount: number;
  usableSourceCount: number;
  paperCount: number;
  designDocCount: number;
  proposalOrStandardCount: number;
  sufficient: boolean;
  reason: string | null;
};
