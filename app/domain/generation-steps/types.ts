export type GenerationStepStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type GenerationStepKey =
  | "topic_intake"
  | "general_source_discovery"
  | "paper_design_doc_discovery"
  | "source_triage"
  | "evidence_map"
  | "stage_outline"
  | "module_generation"
  | "qa";

export type GenerationStep = {
  id: string;
  runId: string;
  stepKey: GenerationStepKey;
  status: GenerationStepStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const GENERATION_STEP_KEYS: GenerationStepKey[] = [
  "topic_intake",
  "general_source_discovery",
  "paper_design_doc_discovery",
  "source_triage",
  "evidence_map",
  "stage_outline",
  "module_generation",
  "qa",
];
