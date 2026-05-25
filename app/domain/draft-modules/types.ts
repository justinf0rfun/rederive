export type DraftModuleType =
  | "source_corpus"
  | "evidence_map"
  | "orientation"
  | "stage_outline"
  | "stage"
  | "throughline"
  | "transferable_pattern"
  | "boundaries"
  | "debt_map"
  | "pain_ranking"
  | "causal_chain"
  | "source_notes"
  | "social_card_manifest";

export type DraftModuleStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "stale";

export type DraftModule = {
  id: string;
  runId: string;
  moduleKey: string;
  moduleType: DraftModuleType;
  status: DraftModuleStatus;
  content: Record<string, unknown>;
  validation: Record<string, unknown>;
  staleReason: string | null;
  generatedFromStepId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftModuleReviewAction =
  | "approve"
  | "reject"
  | "request_more_sources"
  | "regenerate"
  | "mark_inference_too_speculative"
  | "block_publish";

export type DraftModuleReview = {
  id: string;
  moduleId: string;
  runId: string;
  action: DraftModuleReviewAction;
  reason: string | null;
  reviewerEmail: string;
  createdAt: string;
};

export type OrientationDraftContent = {
  whatItIs: string;
  centralPressure: string;
  tradeoffTheme: string;
  oneSentenceVersion: string;
  claimIds: string[];
};

export type StageOutlineDraftContent = {
  maturity: "mature";
  stageCount: number;
  deviationJustification: string | null;
  stages: Array<{
    number: number;
    slug: string;
    title: string;
    pressure: string;
    candidateOptions: string[];
    expectedDebtIds: string[];
    claimIds: string[];
  }>;
};

export type StageDraftContent = {
  id: string;
  number: number;
  slug: string;
  title: string;
  period: string;
  constraint: string;
  options: Array<{
    label: string;
    name: string;
    cost: string;
    outcome: "rejected" | "chosen";
    why: string;
  }>;
  keyTradeoff: string;
  debtsIntroduced: Array<{
    debtId: string;
    summary: string;
  }>;
  debtsRepaid?: Array<{
    debtId: string;
    repaymentType: "resolved" | "mitigated";
    summary: string;
  }>;
  claimIds: string[];
  inferenceNoteIds: string[];
};
