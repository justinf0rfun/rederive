export type EvidenceType = "direct_quote" | "paraphrase" | "derived_signal";

export type ClaimType = "fact" | "inference" | "controversial_judgment";

export type Confidence = "high" | "medium" | "low";

export type SourceEvidence = {
  id: string;
  sourceId: string;
  runId: string;
  excerpt: string;
  locator: string | null;
  evidenceType: EvidenceType;
  contentHash: string | null;
  createdAt: string;
};

export type EvidenceClaim = {
  id: string;
  runId: string;
  statement: string;
  claimType: ClaimType;
  confidence: Confidence;
  moduleId: string | null;
  publishable: boolean;
  createdAt: string;
  updatedAt: string;
  sourceEvidenceIds: string[];
  inferenceBasisClaimIds: string[];
};

export type ClaimEvidenceMap = {
  evidence: SourceEvidence[];
  claims: EvidenceClaim[];
};

export type ClaimEvidenceEvaluation = {
  claimCount: number;
  evidenceCount: number;
  unsupportedFactCount: number;
  unsupportedInferenceCount: number;
  nonPublishableClaimCount: number;
  sufficient: boolean;
  blockers: string[];
};

export type CandidateSourceEvidence = {
  id?: string;
  sourceId: string;
  excerpt: string;
  locator?: string | null;
  evidenceType: EvidenceType;
  contentHash?: string | null;
};

export type CandidateEvidenceClaim = {
  id?: string;
  statement: string;
  claimType: ClaimType;
  confidence: Confidence;
  moduleId?: string | null;
  publishable: boolean;
  sourceEvidenceIds?: string[];
  inferenceBasisClaimIds?: string[];
};
