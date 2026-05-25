import {
  REDO_CONTRACT_VERSION,
  RedoCaseSnapshotSchema,
  type RedoCaseSnapshot,
} from "./contract";

export type ValidationSeverity = "blocker" | "warning";

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  path: string;
  message: string;
};

export type RedoValidationResult =
  | {
      ok: true;
      snapshot: RedoCaseSnapshot;
      blockers: [];
      warnings: ValidationIssue[];
    }
  | {
      ok: false;
      snapshot?: RedoCaseSnapshot;
      blockers: ValidationIssue[];
      warnings: ValidationIssue[];
    };

function blocker(code: string, path: string, message: string): ValidationIssue {
  return { severity: "blocker", code, path, message };
}

function warning(code: string, path: string, message: string): ValidationIssue {
  return { severity: "warning", code, path, message };
}

export function validateRedoCaseSnapshot(input: unknown): RedoValidationResult {
  const parsed = RedoCaseSnapshotSchema.safeParse(input);
  const blockers: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!parsed.success) {
    return {
      ok: false,
      blockers: parsed.error.issues.map((issue) =>
        blocker(
          "schema.invalid",
          issue.path.length > 0 ? issue.path.join(".") : "$",
          issue.message
        )
      ),
      warnings,
    };
  }

  const snapshot = parsed.data;

  if (snapshot.contractVersion !== REDO_CONTRACT_VERSION) {
    blockers.push(
      blocker(
        "contract.version_mismatch",
        "contractVersion",
        `Expected ${REDO_CONTRACT_VERSION}.`
      )
    );
  }

  validateStages(snapshot, blockers);
  validateDebtTrace(snapshot, blockers);
  validateClaimEvidence(snapshot, blockers, warnings);
  validateSourceCoverage(snapshot, blockers, warnings);

  if (blockers.length > 0) {
    return { ok: false, snapshot, blockers, warnings };
  }

  return { ok: true, snapshot, blockers: [], warnings };
}

function validateStages(
  snapshot: RedoCaseSnapshot,
  blockers: ValidationIssue[]
) {
  for (const stage of snapshot.stages) {
    const rejectedCount = stage.options.filter(
      (option) => option.outcome === "rejected"
    ).length;
    const chosenCount = stage.options.filter(
      (option) => option.outcome === "chosen"
    ).length;

    if (rejectedCount < 2) {
      blockers.push(
        blocker(
          "stage.options.rejected_missing",
          `stages.${stage.number}.options`,
          "Each stage must include at least two rejected options."
        )
      );
    }

    if (chosenCount !== 1) {
      blockers.push(
        blocker(
          "stage.options.chosen_invalid",
          `stages.${stage.number}.options`,
          "Each stage must include exactly one chosen option."
        )
      );
    }
  }
}

function validateDebtTrace(
  snapshot: RedoCaseSnapshot,
  blockers: ValidationIssue[]
) {
  const introducedDebtIds = new Set(
    snapshot.stages.flatMap((stage) =>
      stage.debtsIntroduced.map((debt) => debt.debtId)
    )
  );
  const debtMapIds = new Set([
    ...snapshot.debtMap.resolved.map((row) => row.debtId),
    ...snapshot.debtMap.mitigated.map((row) => row.debtId),
    ...snapshot.debtMap.unresolved.map((row) => row.debtId),
  ]);

  for (const debtId of introducedDebtIds) {
    if (!debtMapIds.has(debtId)) {
      blockers.push(
        blocker(
          "debt.missing_from_map",
          "debtMap",
          `${debtId} is introduced by a stage but missing from the debt map.`
        )
      );
    }
  }

  for (const debtId of debtMapIds) {
    if (!introducedDebtIds.has(debtId)) {
      blockers.push(
        blocker(
          "debt.unknown_in_map",
          "debtMap",
          `${debtId} appears in the debt map but was not introduced by a stage.`
        )
      );
    }
  }

  for (const debtId of snapshot.causalChain.debtRefs) {
    if (!introducedDebtIds.has(debtId)) {
      blockers.push(
        blocker(
          "debt.unknown_in_causal_chain",
          "causalChain.debtRefs",
          `${debtId} appears in the causal chain but was not introduced by a stage.`
        )
      );
    }
  }

  for (const painPoint of snapshot.painRanking) {
    for (const debtId of painPoint.relatedDebtIds) {
      if (!introducedDebtIds.has(debtId)) {
        blockers.push(
          blocker(
            "debt.unknown_in_pain_ranking",
            `painRanking.${painPoint.rank}.relatedDebtIds`,
            `${debtId} appears in the pain ranking but was not introduced by a stage.`
          )
        );
      }
    }
  }
}

function validateClaimEvidence(
  snapshot: RedoCaseSnapshot,
  blockers: ValidationIssue[],
  warnings: ValidationIssue[]
) {
  const evidenceIds = new Set(snapshot.sourceEvidence.map((item) => item.id));
  const claimIds = new Set(snapshot.evidenceClaims.map((claim) => claim.id));

  for (const claim of snapshot.evidenceClaims) {
    if (!claim.publishable) {
      blockers.push(
        blocker(
          "claim.not_publishable",
          `evidenceClaims.${claim.id}`,
          "Non-publishable claims cannot appear in a published snapshot."
        )
      );
    }

    if (claim.claimType === "fact" && claim.sourceEvidenceIds.length === 0) {
      blockers.push(
        blocker(
          "claim.fact_without_evidence",
          `evidenceClaims.${claim.id}.sourceEvidenceIds`,
          "Factual claims require at least one source evidence link."
        )
      );
    }

    for (const evidenceId of claim.sourceEvidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        blockers.push(
          blocker(
            "claim.unknown_evidence",
            `evidenceClaims.${claim.id}.sourceEvidenceIds`,
            `${evidenceId} does not exist in sourceEvidence.`
          )
        );
      }
    }

    if (claim.claimType !== "fact" && claim.inferenceBasisClaimIds.length === 0) {
      blockers.push(
        blocker(
          "claim.inference_without_basis",
          `evidenceClaims.${claim.id}.inferenceBasisClaimIds`,
          "Inference and controversial judgment claims require basis claims."
        )
      );
    }

    for (const basisClaimId of claim.inferenceBasisClaimIds) {
      if (!claimIds.has(basisClaimId)) {
        blockers.push(
          blocker(
            "claim.unknown_basis",
            `evidenceClaims.${claim.id}.inferenceBasisClaimIds`,
            `${basisClaimId} does not exist in evidenceClaims.`
          )
        );
      }
    }
  }
}

function validateSourceCoverage(
  snapshot: RedoCaseSnapshot,
  blockers: ValidationIssue[],
  warnings: ValidationIssue[]
) {
  const sourceIds = new Set(snapshot.sources.map((source) => source.id));
  const hasPaperOrDesignDoc = snapshot.sources.some((source) =>
    ["paper", "design_doc", "proposal", "standard"].includes(source.sourceType)
  );

  if (!hasPaperOrDesignDoc) {
    blockers.push(
      blocker(
        "source.paper_or_design_doc_missing",
        "sources",
        "Published redo cases require paper, design-doc, proposal, or standard coverage."
      )
    );
  }

  for (const evidence of snapshot.sourceEvidence) {
    if (!sourceIds.has(evidence.sourceId)) {
      blockers.push(
        blocker(
          "source_evidence.unknown_source",
          `sourceEvidence.${evidence.id}.sourceId`,
          `${evidence.sourceId} does not exist in sources.`
        )
      );
    }
  }

  if (snapshot.sources.length < 3) {
    warnings.push(
      warning(
        "source.low_count",
        "sources",
        "Source diversity is low for a published case."
      )
    );
  }
}
