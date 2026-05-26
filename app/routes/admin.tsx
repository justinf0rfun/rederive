import { Form, redirect } from "react-router";

import { requireAdminIdentity } from "~/domain/admin/access.server";
import { createAuditLog } from "~/domain/audit/repository.server";
import {
  evaluateClaimEvidenceMap,
  listClaimEvidenceMap,
} from "~/domain/claim-evidence/repository.server";
import {
  approveDraftModule,
  listDraftModulesForRuns,
  regenerateDraftModule,
  requestMoreSourcesForDraftModule,
  rejectDraftModule,
} from "~/domain/draft-modules/repository.server";
import {
  createGenerationRunFromFeedback,
  getFeedbackItemById,
  listRecentFeedbackItems,
} from "~/domain/feedback/repository.server";
import {
  createGenerationDispatcher,
  type GenerationMessage,
} from "~/domain/generation/messages";
import {
  handleGenerationMessage,
  initializeGenerationRun,
} from "~/domain/generation/orchestrator.server";
import {
  importLocalRedoBundle,
  importLocalRedoMarkdown,
} from "~/domain/local-redo-bundles/import.server";
import {
  listGenerationStepsForRuns,
  requestMorePaperDesignDocSources,
} from "~/domain/generation-steps/repository.server";
import {
  createGenerationRunFromTopicRequest,
  findOrCreateTopicFromRequest,
  listRecentGenerationRuns,
  updateGenerationRunStatus,
} from "~/domain/generation-runs/repository.server";
import {
  evaluatePaperDesignDocCoverage,
  evaluatePaperDesignDocCoverageFromSources,
  evaluateSourceCorpus,
  listSourceDocumentsForRuns,
  rejectSourceDocument,
} from "~/domain/sources/repository.server";
import { generateSocialCardsForPublishedVersion } from "~/domain/social-cards/repository.server";
import {
  getTopicRequestById,
  listRecentTopicRequests,
  markTopicRequestQueued,
} from "~/domain/topic-requests/repository.server";
import { listRecentSubscribers } from "~/domain/subscribers/repository.server";
import {
  evaluatePublishPreflight,
  PublishBlockedError,
  publishGenerationRun,
} from "~/domain/publishing/repository.server";
import { seedBenchmarkPublishedVersion } from "~/domain/publishing/seed.server";
import type { Route } from "./+types/admin";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin - rederive" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const admin = requireAdminIdentity(request, env);
  const url = new URL(request.url);
  const [topicRequests, generationRuns, feedbackItems, subscribers] =
    await Promise.all([
    listRecentTopicRequests(env.DB, 10),
    listRecentGenerationRuns(env.DB, 10),
    listRecentFeedbackItems(env.DB, 20),
    listRecentSubscribers(env.DB, 50),
  ]);
  const runIds = generationRuns.map((run) => run.id);
  const [stepsByRunId, sourcesByRunId, draftModulesByRunId] = await Promise.all([
    listGenerationStepsForRuns(env.DB, runIds),
    listSourceDocumentsForRuns(env.DB, runIds),
    listDraftModulesForRuns(env.DB, runIds),
  ]);
  const claimEvidenceEntries = await Promise.all(
    runIds.map(async (runId) => [
      runId,
      {
        map: await listClaimEvidenceMap(env.DB, runId),
        evaluation: await evaluateClaimEvidenceMap(env.DB, runId),
      },
    ] as const)
  );
  const claimEvidenceByRunId = Object.fromEntries(claimEvidenceEntries);
  const publishPreflightEntries = await Promise.all(
    runIds.map(async (runId) => [
      runId,
      await evaluatePublishPreflight(env.DB, runId),
    ] as const)
  );
  const publishPreflightByRunId = Object.fromEntries(publishPreflightEntries);

  return {
    admin,
    appEnv: env.APP_ENV,
    accessMode:
      admin.source === "local-mock"
        ? "local mock"
        : "cloudflare access",
    importedRunId: url.searchParams.get("imported"),
    topicRequests,
    feedbackItems,
    subscribers,
    generationRuns: generationRuns.map((run) => ({
      ...run,
      steps: stepsByRunId[run.id] || [],
      sources: sourcesByRunId[run.id] || [],
      paperDesignDocCoverage: evaluatePaperDesignDocCoverageFromSources(
        sourcesByRunId[run.id] || []
      ),
      claimEvidence: claimEvidenceByRunId[run.id],
      draftModules: draftModulesByRunId[run.id] || [],
      publishPreflight: publishPreflightByRunId[run.id],
    })),
  };
}

export async function action({ context, request }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const admin = requireAdminIdentity(request, env);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "advance-generation-run" || intent === "retry-generation-run") {
    const runId = String(formData.get("runId") || "");
    const message: GenerationMessage =
      intent === "retry-generation-run"
        ? { type: "retry_run", runId, requestedBy: admin.email }
        : { type: "start_run", runId };

    await handleGenerationMessage(env.DB, message);
    await createAuditLog(env.DB, {
      actorType: "admin",
      actorId: admin.email,
      action:
        intent === "retry-generation-run"
          ? "generation_run.retry"
          : "generation_run.advance",
      entityType: "generation_run",
      entityId: runId,
      metadata: { execution: "inline_admin_action" },
    });

    return { ok: true, runId, topicDisplayName: "generation run" };
  }

  if (intent === "reject-source-document") {
    const sourceId = String(formData.get("sourceId") || "");
    const runId = String(formData.get("runId") || "");
    const source = await rejectSourceDocument(env.DB, sourceId);

    if (!source) {
      throw new Response("Source document not found", { status: 404 });
    }

    const sourceEvaluation = await evaluateSourceCorpus(env.DB, runId);
    const paperCoverage = await evaluatePaperDesignDocCoverage(env.DB, runId);
    const claimEvidenceEvaluation = await evaluateClaimEvidenceMap(
      env.DB,
      runId
    );
    if (!sourceEvaluation.sufficient) {
      await updateGenerationRunStatus(env.DB, {
        runId,
        status: "blocked_source_insufficient",
        errorCode: "source_corpus_insufficient",
        errorMessage: sourceEvaluation.reason,
      });
    } else if (!paperCoverage.sufficient) {
      await updateGenerationRunStatus(env.DB, {
        runId,
        status: "blocked_paper_coverage_insufficient",
        errorCode: "paper_design_doc_coverage_insufficient",
        errorMessage: paperCoverage.reason,
      });
    } else if (!claimEvidenceEvaluation.sufficient) {
      await updateGenerationRunStatus(env.DB, {
        runId,
        status: "blocked_claim_evidence_incomplete",
        errorCode: "claim_evidence_incomplete",
        errorMessage: claimEvidenceEvaluation.blockers.join(" "),
      });
    }

    await createAuditLog(env.DB, {
      actorType: "admin",
      actorId: admin.email,
      action: "source_document.reject",
      entityType: "source_document",
      entityId: sourceId,
      metadata: {
        runId,
        sourceUrl: source.url,
        sourceType: source.sourceType,
        trustLevel: source.trustLevel,
        sourceEvaluation,
        paperCoverage,
        claimEvidenceEvaluation,
      },
    });

    return { ok: true, runId, topicDisplayName: source.title || source.url };
  }

  if (intent === "request-more-paper-design-doc-sources") {
    const runId = String(formData.get("runId") || "");
    await requestMorePaperDesignDocSources(env.DB, runId);
    await updateGenerationRunStatus(env.DB, {
      runId,
      status: "queued",
      errorCode: null,
      errorMessage: null,
    });
    await createGenerationDispatcher(env).dispatch({
      type: "start_run",
      runId,
    });
    await createAuditLog(env.DB, {
      actorType: "admin",
      actorId: admin.email,
      action: "paper_design_doc_sources.request_more",
      entityType: "generation_run",
      entityId: runId,
      metadata: { execution: "workflow_dispatch" },
    });

    return { ok: true, runId, topicDisplayName: "paper/design-doc sources" };
  }

  if (
    intent === "approve-draft-module" ||
    intent === "reject-draft-module" ||
    intent === "regenerate-draft-module" ||
    intent === "request-more-sources-draft-module"
  ) {
    const moduleId = String(formData.get("moduleId") || "");
    const reason = String(formData.get("reason") || "").trim() || null;
    if (intent === "reject-draft-module" && !reason) {
      throw new Response("Rejecting a draft module requires a reason", {
        status: 400,
      });
    }

    const module =
      intent === "approve-draft-module"
        ? await approveDraftModule(env.DB, {
            moduleId,
            reviewerEmail: admin.email,
          })
        : intent === "reject-draft-module"
          ? await rejectDraftModule(env.DB, {
            moduleId,
            reviewerEmail: admin.email,
            reason,
          })
          : intent === "regenerate-draft-module"
            ? await regenerateDraftModule(env.DB, {
              moduleId,
              reviewerEmail: admin.email,
            })
            : await requestMoreSourcesForDraftModule(env.DB, {
                moduleId,
                reviewerEmail: admin.email,
                reason,
              });

    if (!module) {
      throw new Response("Draft module not found", { status: 404 });
    }

    if (
      intent === "regenerate-draft-module" ||
      intent === "request-more-sources-draft-module"
    ) {
      await updateGenerationRunStatus(env.DB, {
        runId: module.runId,
        status: "queued",
        errorCode: null,
        errorMessage: null,
      });
      await createGenerationDispatcher(env).dispatch({
        type: "start_run",
        runId: module.runId,
      });
    }

    await createAuditLog(env.DB, {
      actorType: "admin",
      actorId: admin.email,
      action:
        intent === "approve-draft-module"
          ? "draft_module.approve"
          : intent === "reject-draft-module"
            ? "draft_module.reject"
            : intent === "regenerate-draft-module"
              ? "draft_module.regenerate"
              : "draft_module.request_more_sources",
      entityType: "draft_module",
      entityId: module.id,
      metadata: {
        runId: module.runId,
        moduleKey: module.moduleKey,
        reason,
        execution:
          intent === "regenerate-draft-module" ||
          intent === "request-more-sources-draft-module"
            ? "workflow_dispatch"
            : "inline_admin_action",
      },
    });

    return { ok: true, runId: module.runId, topicDisplayName: module.moduleKey };
  }

  if (intent === "publish-generation-run") {
    const runId = String(formData.get("runId") || "");
    const revisionNote =
      String(formData.get("revisionNote") || "").trim() ||
      "Initial reviewed publication.";

    try {
      const publishedVersion = await publishGenerationRun(env.DB, {
        runId,
        publishedBy: admin.email,
        revisionNote,
      });
      const socialCards = await generateSocialCardsForPublishedVersion(
        env.DB,
        env.ARTIFACTS,
        publishedVersion
      );
      await createAuditLog(env.DB, {
        actorType: "admin",
        actorId: admin.email,
        action: "generation_run.publish",
        entityType: "published_version",
        entityId: publishedVersion.id,
        metadata: {
          runId,
          topicId: publishedVersion.topicId,
          versionNumber: publishedVersion.versionNumber,
          revisionNote,
          socialCardCount: socialCards.length,
        },
      });

      return {
        ok: true,
        runId,
        topicDisplayName: `published v${publishedVersion.versionNumber}`,
      };
    } catch (error) {
      if (!(error instanceof PublishBlockedError)) {
        throw error;
      }

      await updateGenerationRunStatus(env.DB, {
        runId,
        status: "blocked_contract_validation_failed",
        errorCode: "publish_preflight_failed",
        errorMessage: error.preflight.blockers.join(" "),
      });
      await createAuditLog(env.DB, {
        actorType: "admin",
        actorId: admin.email,
        action: "generation_run.publish_blocked",
        entityType: "generation_run",
        entityId: runId,
        metadata: { blockers: error.preflight.blockers },
      });

      return {
        ok: false,
        runId,
        topicDisplayName: "publish preflight",
        blockers: error.preflight.blockers,
      };
    }
  }

  if (intent === "seed-benchmark-case") {
    const publishedVersion = await seedBenchmarkPublishedVersion(env.DB);
    const socialCards = await generateSocialCardsForPublishedVersion(
      env.DB,
      env.ARTIFACTS,
      publishedVersion
    );
    await createAuditLog(env.DB, {
      actorType: "admin",
      actorId: admin.email,
      action: "published_version.seed_benchmark",
      entityType: "published_version",
      entityId: publishedVersion.id,
      metadata: {
        topicId: publishedVersion.topicId,
        versionNumber: publishedVersion.versionNumber,
        socialCardCount: socialCards.length,
      },
    });

    return {
      ok: true,
      runId: publishedVersion.id,
      topicDisplayName: "seed benchmark case",
    };
  }

  if (intent === "import-local-redo-bundle") {
    const bundleJson = String(formData.get("bundleJson") || "").trim();
    if (!bundleJson) {
      throw new Response("Bundle JSON is required", { status: 400 });
    }

    try {
      const result = await importLocalRedoBundle(env.DB, {
        bundleJson,
        importedBy: admin.email,
      });
      await createAuditLog(env.DB, {
        actorType: "admin",
        actorId: admin.email,
        action: "local_redo_bundle.import",
        entityType: "generation_run",
        entityId: result.runId,
        metadata: {
          topicId: result.topicId,
          sourceCount: result.sourceCount,
          claimCount: result.claimCount,
          moduleCount: result.moduleCount,
        },
      });

      return redirect(`/admin?imported=${result.runId}`);
    } catch (error) {
      throw new Response(
        error instanceof Error ? error.message : "Bundle import failed.",
        { status: 400 }
      );
    }
  }

  if (intent === "import-local-redo-markdown") {
    const markdownText = String(formData.get("markdownText") || "").trim();
    const markdownFile = formData.get("markdownFile");
    const markdown =
      markdownFile instanceof File && markdownFile.size > 0
        ? await markdownFile.text()
        : markdownText;

    if (!markdown.trim()) {
      throw new Response("Markdown content or file is required", {
        status: 400,
      });
    }

    try {
      const result = await importLocalRedoMarkdown(env.DB, {
        markdown,
        importedBy: admin.email,
      });
      await createAuditLog(env.DB, {
        actorType: "admin",
        actorId: admin.email,
        action: "local_redo_markdown.import",
        entityType: "generation_run",
        entityId: result.runId,
        metadata: {
          topicId: result.topicId,
          sourceCount: result.sourceCount,
          claimCount: result.claimCount,
          moduleCount: result.moduleCount,
          fileName:
            markdownFile instanceof File && markdownFile.size > 0
              ? markdownFile.name
              : null,
        },
      });

      return redirect(`/admin?imported=${result.runId}`);
    } catch (error) {
      throw new Response(
        error instanceof Error ? error.message : "Markdown import failed.",
        { status: 400 }
      );
    }
  }

  if (intent === "create-feedback-follow-up-run") {
    const feedbackId = String(formData.get("feedbackId") || "");
    const feedback = await getFeedbackItemById(env.DB, feedbackId);
    if (!feedback) {
      throw new Response("Feedback item not found", { status: 404 });
    }

    const run = await createGenerationRunFromFeedback(env.DB, {
      feedback,
      createdBy: admin.email,
    });
    await initializeGenerationRun(env.DB, run.id);
    await createGenerationDispatcher(env).dispatch({
      type: "start_run",
      runId: run.id,
    });
    await createAuditLog(env.DB, {
      actorType: "admin",
      actorId: admin.email,
      action: "feedback.follow_up_generation_run",
      entityType: "feedback_item",
      entityId: feedback.id,
      metadata: {
        runId: run.id,
        topicId: run.topicId,
        moduleAnchor: feedback.moduleAnchor,
        feedbackType: feedback.feedbackType,
      },
    });

    return { ok: true, runId: run.id, topicDisplayName: "feedback follow-up" };
  }

  if (intent !== "create-generation-run") {
    throw new Response("Unsupported admin action", { status: 400 });
  }

  const topicRequestId = String(formData.get("topicRequestId") || "");
  const topicRequest = await getTopicRequestById(env.DB, topicRequestId);

  if (!topicRequest) {
    throw new Response("Topic request not found", { status: 404 });
  }

  const topic = await findOrCreateTopicFromRequest(env.DB, topicRequest);
  const run = await createGenerationRunFromTopicRequest(env.DB, {
    topic,
    topicRequest,
    createdBy: admin.email,
  });
  await initializeGenerationRun(env.DB, run.id);
  await createGenerationDispatcher(env).dispatch({
    type: "start_run",
    runId: run.id,
  });
  await markTopicRequestQueued(env.DB, topicRequest.id);
  await createAuditLog(env.DB, {
    actorType: "admin",
    actorId: admin.email,
    action: "generation_run.create",
    entityType: "generation_run",
    entityId: run.id,
    metadata: {
      topicId: topic.id,
      topicRequestId: topicRequest.id,
      topicSlug: topic.slug,
    },
  });

  return { ok: true, runId: run.id, topicDisplayName: topic.displayName };
}

export default function Admin({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  return (
    <main className="min-h-[100dvh] px-5 py-8 md:px-10 lg:px-16">
      <section className="mx-auto max-w-5xl pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
          admin workbench
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950">
          Generation and review foundation
        </h1>

        {actionData?.ok && (
          <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Admin action completed for {actionData.topicDisplayName}:{" "}
            <span className="font-mono">{actionData.runId}</span>
          </p>
        )}
        {actionData?.ok === false && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <p>
              Admin action blocked for {actionData.topicDisplayName}:{" "}
              <span className="font-mono">{actionData.runId}</span>
            </p>
            {Array.isArray(actionData.blockers) && (
              <ul className="mt-2 list-disc pl-5">
                {actionData.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {loaderData.importedRunId && (
          <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Local redo import completed:{" "}
            <span className="font-mono">{loaderData.importedRunId}</span>
          </p>
        )}

        <div className="mt-8 grid gap-4 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
          <AdminFact label="Environment" value={loaderData.appEnv} />
          <AdminFact label="Auth mode" value={loaderData.accessMode} />
          <AdminFact label="Admin email" value={loaderData.admin.email} />
          <Form method="post">
            <input name="intent" type="hidden" value="seed-benchmark-case" />
            <button
              className="rounded-md border border-zinc-300 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-900 transition active:translate-y-px"
              type="submit"
            >
              Seed benchmark case
            </button>
          </Form>
        </div>

        <LocalRedoImportPanel />
        <FeedbackPanel feedbackItems={loaderData.feedbackItems} />
        <SubscribersPanel subscribers={loaderData.subscribers} />
        <TopicRequestsPanel topicRequests={loaderData.topicRequests} />
        <GenerationRunsPanel generationRuns={loaderData.generationRuns} />
      </section>
    </main>
  );
}

function AdminFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function LocalRedoImportPanel() {
  return (
    <section className="mt-8 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
      <div className="border-b border-zinc-200 pb-4">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
          local redo import
        </p>
        <h2 className="mt-2 text-xl font-medium text-zinc-950">
          Import reviewed local bundle
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Paste a redo_bundle_v1 JSON exported from the local redo workflow. The
          import creates a draft run and keeps module review and publish gates in
          place.
        </p>
      </div>
      <Form
        className="mt-5 grid gap-3"
        encType="multipart/form-data"
        method="post"
      >
        <input name="intent" type="hidden" value="import-local-redo-markdown" />
        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          redo Markdown file
          <input
            accept=".md,text/markdown,text/plain"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            name="markdownFile"
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          or paste Markdown
          <textarea
            className="min-h-40 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-5 text-zinc-900 outline-none transition focus:border-zinc-950"
            name="markdownText"
            placeholder="# Apache Kafka：逆向学习"
          />
        </label>
        <button
          className="w-fit rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition active:translate-y-px"
          type="submit"
        >
          Import Markdown
        </button>
      </Form>
      <Form className="mt-6 grid gap-3 border-t border-zinc-200 pt-5" method="post">
        <input name="intent" type="hidden" value="import-local-redo-bundle" />
        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          or paste structured bundle JSON
        <textarea
          className="min-h-56 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-5 text-zinc-900 outline-none transition focus:border-zinc-950"
          name="bundleJson"
          placeholder='{"bundleVersion":"redo_bundle_v1","sourceMode":"local_redo_skill",...}'
        />
        </label>
        <button
          className="w-fit rounded-md border border-zinc-300 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-900 transition active:translate-y-px"
          type="submit"
        >
          Import bundle
        </button>
      </Form>
    </section>
  );
}

function FeedbackPanel({
  feedbackItems,
}: {
  feedbackItems: Route.ComponentProps["loaderData"]["feedbackItems"];
}) {
  return (
    <section className="mt-8 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            reader feedback
          </p>
          <h2 className="mt-2 text-xl font-medium text-zinc-950">
            Corrections and source additions
          </h2>
        </div>
        <span className="font-mono text-sm text-zinc-500">
          {feedbackItems.length}
        </span>
      </div>

      {feedbackItems.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          No structured feedback yet. Public correction submissions will appear
          here.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-zinc-200">
          {feedbackItems.map((item) => (
            <article className="py-4 first:pt-0 last:pb-0" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-zinc-950">
                    {item.feedbackType}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {item.status} · {item.moduleAnchor || "case"} ·{" "}
                    {item.publishedVersionId || "unbound"}
                  </p>
                </div>
                <time className="font-mono text-xs text-zinc-500">
                  {item.createdAt}
                </time>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
                {item.body}
              </p>
              {item.sourceLinks.length > 0 && (
                <ul className="mt-3 grid gap-1">
                  {item.sourceLinks.map((link) => (
                    <li className="truncate font-mono text-xs" key={link}>
                      <a
                        className="text-emerald-800 underline decoration-emerald-800/30 underline-offset-4"
                        href={link}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <Form className="mt-4" method="post">
                <input
                  name="intent"
                  type="hidden"
                  value="create-feedback-follow-up-run"
                />
                <input name="feedbackId" type="hidden" value={item.id} />
                <button
                  className="rounded-md border border-zinc-300 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px"
                  disabled={item.status !== "new" || !item.topicId}
                  type="submit"
                >
                  Create follow-up run
                </button>
              </Form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SubscribersPanel({
  subscribers,
}: {
  subscribers: Route.ComponentProps["loaderData"]["subscribers"];
}) {
  return (
    <section className="mt-8 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            subscribers
          </p>
          <h2 className="mt-2 text-xl font-medium text-zinc-950">
            Email capture
          </h2>
        </div>
        <span className="font-mono text-sm text-zinc-500">
          {subscribers.length}
        </span>
      </div>

      {subscribers.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          No subscribers yet. Provider sync is intentionally deferred behind a
          future adapter.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-zinc-200">
          {subscribers.map((subscriber) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              key={subscriber.id}
            >
              <div>
                <p className="font-mono text-sm text-zinc-950">
                  {subscriber.email}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {subscriber.locale} · {subscriber.status} ·{" "}
                  {String(subscriber.provider.provider || "none")}
                </p>
              </div>
              <time className="font-mono text-xs text-zinc-500">
                {subscriber.createdAt}
              </time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TopicRequestsPanel({
  topicRequests,
}: {
  topicRequests: Route.ComponentProps["loaderData"]["topicRequests"];
}) {
  return (
    <section className="mt-8 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            topic requests
          </p>
          <h2 className="mt-2 text-xl font-medium text-zinc-950">
            Recent intake
          </h2>
        </div>
        <span className="font-mono text-sm text-zinc-500">
          {topicRequests.length}
        </span>
      </div>

      {topicRequests.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          No topic requests yet. Public submissions will appear here before they
          become generation candidates.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-zinc-200">
          {topicRequests.map((request) => (
            <article className="py-4 first:pt-0 last:pb-0" key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-zinc-950">
                    {request.topicText}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {request.normalizedTopicSlug || "un-normalized"} ·{" "}
                    {request.status}
                  </p>
                </div>
                <time className="font-mono text-xs text-zinc-500">
                  {request.createdAt}
                </time>
              </div>
              {request.reason && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                  {request.reason}
                </p>
              )}
              {request.sourceLinks.length > 0 && (
                <ul className="mt-3 grid gap-1">
                  {request.sourceLinks.map((link) => (
                    <li className="truncate font-mono text-xs" key={link}>
                      <a
                        className="text-emerald-800 underline decoration-emerald-800/30 underline-offset-4"
                        href={link}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <Form className="mt-4" method="post">
                <input
                  name="intent"
                  type="hidden"
                  value="create-generation-run"
                />
                <input name="topicRequestId" type="hidden" value={request.id} />
                <button
                  className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px"
                  disabled={request.status !== "new"}
                  type="submit"
                >
                  Create generation run
                </button>
              </Form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function GenerationRunsPanel({
  generationRuns,
}: {
  generationRuns: Route.ComponentProps["loaderData"]["generationRuns"];
}) {
  return (
    <section className="mt-8 rounded-xl border border-zinc-300/80 bg-white/70 p-5">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            generation runs
          </p>
          <h2 className="mt-2 text-xl font-medium text-zinc-950">
            Recent queued work
          </h2>
        </div>
        <span className="font-mono text-sm text-zinc-500">
          {generationRuns.length}
        </span>
      </div>

      {generationRuns.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          No generation runs yet. Create one from a topic request above.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-zinc-200">
          {generationRuns.map((run) => (
            <article className="py-4 first:pt-0 last:pb-0" key={run.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-zinc-950">
                    {run.topicDisplayName}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {run.topicSlug} · {run.language} · {run.contractVersion}
                  </p>
                </div>
                <span className="rounded-md border border-amber-700/20 bg-amber-50 px-2 py-1 font-mono text-xs text-amber-900">
                  {run.status}
                </span>
              </div>
              <p className="mt-3 font-mono text-xs text-zinc-500">
                {run.id} · created by {run.createdBy} · {run.createdAt}
              </p>
              <ol className="mt-4 grid gap-2">
                {run.steps.map((step) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
                    key={step.id}
                  >
                    <span className="font-mono text-xs text-zinc-700">
                      {step.stepKey}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {step.status}
                    </span>
                  </li>
                ))}
              </ol>
              <PaperDesignDocPanel
                coverage={run.paperDesignDocCoverage}
                runId={run.id}
                sources={run.sources}
              />
              <ClaimEvidencePanel claimEvidence={run.claimEvidence} />
              <DraftModulesPanel modules={run.draftModules} />
              <PublishPanel preflight={run.publishPreflight} runId={run.id} />
              <SourceCorpusPanel runId={run.id} sources={run.sources} />
              <div className="mt-4 flex flex-wrap gap-2">
                <Form method="post">
                  <input
                    name="intent"
                    type="hidden"
                    value="advance-generation-run"
                  />
                  <input name="runId" type="hidden" value={run.id} />
                  <button
                    className="rounded-md border border-zinc-300 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-900 transition active:translate-y-px"
                    type="submit"
                  >
                    Advance fake steps
                  </button>
                </Form>
                {run.status === "failed" && (
                  <Form method="post">
                    <input
                      name="intent"
                      type="hidden"
                      value="retry-generation-run"
                    />
                    <input name="runId" type="hidden" value={run.id} />
                    <button
                      className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition active:translate-y-px"
                      type="submit"
                    >
                      Retry failed run
                    </button>
                  </Form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PaperDesignDocPanel({
  coverage,
  runId,
  sources,
}: {
  coverage: Route.ComponentProps["loaderData"]["generationRuns"][number]["paperDesignDocCoverage"];
  runId: string;
  sources: Route.ComponentProps["loaderData"]["generationRuns"][number]["sources"];
}) {
  const coverageSources = sources.filter((source) =>
    ["paper", "design_doc", "proposal", "standard"].includes(source.sourceType)
  );

  return (
    <div className="mt-4 rounded-md border border-zinc-200 bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2">
        <div>
          <h4 className="text-sm font-medium text-zinc-950">
            Paper and design-doc coverage
          </h4>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {coverage.usableSourceCount} usable · {coverage.paperCount} papers ·{" "}
            {coverage.designDocCount} design docs ·{" "}
            {coverage.proposalOrStandardCount} proposals/standards
          </p>
        </div>
        <span
          className={
            coverage.sufficient
              ? "rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-800"
              : "rounded border border-red-200 bg-red-50 px-2 py-1 font-mono text-xs text-red-800"
          }
        >
          {coverage.sufficient ? "covered" : "blocked"}
        </span>
      </div>
      {coverageSources.length > 0 ? (
        <ul className="divide-y divide-zinc-200">
          {coverageSources.map((source) => (
            <li className="px-3 py-3" key={source.id}>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="truncate text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title || source.url}
                </a>
                <span className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                  {source.status}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                {source.sourceType} · {source.trustLevel} ·{" "}
                {source.publisher || "unknown publisher"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-3 text-sm text-zinc-600">
          No paper, design document, proposal, or standard has been discovered
          yet.
        </p>
      )}
      <div className="border-t border-zinc-200 px-3 py-3">
        <Form method="post">
          <input
            name="intent"
            type="hidden"
            value="request-more-paper-design-doc-sources"
          />
          <input name="runId" type="hidden" value={runId} />
          <button
            className="rounded-md border border-zinc-300 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-900 transition active:translate-y-px"
            type="submit"
          >
            Request more sources
          </button>
        </Form>
      </div>
    </div>
  );
}

function ClaimEvidencePanel({
  claimEvidence,
}: {
  claimEvidence: Route.ComponentProps["loaderData"]["generationRuns"][number]["claimEvidence"];
}) {
  const { evaluation, map } = claimEvidence;
  const claimsByModule = map.claims.reduce<Record<string, typeof map.claims>>(
    (acc, claim) => {
      const key = claim.moduleId || "unassigned";
      acc[key] ||= [];
      acc[key].push(claim);
      return acc;
    },
    {}
  );

  return (
    <div className="mt-4 rounded-md border border-zinc-200 bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2">
        <div>
          <h4 className="text-sm font-medium text-zinc-950">
            Claim-evidence map
          </h4>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {evaluation.claimCount} claims · {evaluation.evidenceCount} evidence ·{" "}
            {evaluation.unsupportedFactCount} unsupported facts ·{" "}
            {evaluation.unsupportedInferenceCount} unsupported inferences
          </p>
        </div>
        <span
          className={
            evaluation.sufficient
              ? "rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-800"
              : "rounded border border-red-200 bg-red-50 px-2 py-1 font-mono text-xs text-red-800"
          }
        >
          {evaluation.sufficient ? "supported" : "blocked"}
        </span>
      </div>
      {evaluation.blockers.length > 0 && (
        <ul className="border-b border-zinc-200 px-3 py-3">
          {evaluation.blockers.map((blocker) => (
            <li className="text-sm leading-6 text-red-800" key={blocker}>
              {blocker}
            </li>
          ))}
        </ul>
      )}
      {map.claims.length === 0 ? (
        <p className="px-3 py-3 text-sm text-zinc-600">
          Claim-evidence map is empty until the evidence map step runs.
        </p>
      ) : (
        <div className="divide-y divide-zinc-200">
          {Object.entries(claimsByModule).map(([moduleId, claims]) => (
            <section className="px-3 py-3" key={moduleId}>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
                {moduleId}
              </p>
              <ul className="mt-2 grid gap-2">
                {claims.map((claim) => (
                  <li
                    className="rounded border border-zinc-200 bg-white/70 px-3 py-2"
                    key={claim.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                        {claim.claimType}
                      </span>
                      <span className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                        {claim.confidence}
                      </span>
                      <span className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                        {claim.publishable ? "publishable" : "blocked"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-800">
                      {claim.statement}
                    </p>
                    <p className="mt-2 font-mono text-xs text-zinc-500">
                      evidence {claim.sourceEvidenceIds.length} · basis{" "}
                      {claim.inferenceBasisClaimIds.length}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DraftModulesPanel({
  modules,
}: {
  modules: Route.ComponentProps["loaderData"]["generationRuns"][number]["draftModules"];
}) {
  const focusModules = modules;

  if (focusModules.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-white/50 px-3 py-3 text-sm text-zinc-600">
        Orientation and stage outline modules are empty until the stage outline
        step runs.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-zinc-200 bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2">
        <h4 className="text-sm font-medium text-zinc-950">
          Draft modules
        </h4>
        <span className="font-mono text-xs text-zinc-500">
          {focusModules.length} reviewable
        </span>
      </div>
      <div className="divide-y divide-zinc-200">
        {focusModules.map((module) => (
          <section className="px-3 py-3" key={module.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h5 className="text-sm font-medium text-zinc-950">
                  {module.moduleKey}
                </h5>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {module.moduleType} · {module.status}
                  {module.staleReason ? ` · ${module.staleReason}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Form method="post">
                  <input
                    name="intent"
                    type="hidden"
                    value="approve-draft-module"
                  />
                  <input name="moduleId" type="hidden" value={module.id} />
                  <button
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition active:translate-y-px"
                    type="submit"
                  >
                    Approve
                  </button>
                </Form>
                <Form method="post">
                  <input
                    name="intent"
                    type="hidden"
                    value="reject-draft-module"
                  />
                  <input name="moduleId" type="hidden" value={module.id} />
                  <input
                    name="reason"
                    type="hidden"
                    value="Rejected from admin review."
                  />
                  <button
                    className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 transition active:translate-y-px"
                    type="submit"
                  >
                    Reject
                  </button>
                </Form>
                <Form method="post">
                  <input
                    name="intent"
                    type="hidden"
                    value="request-more-sources-draft-module"
                  />
                  <input name="moduleId" type="hidden" value={module.id} />
                  <input
                    name="reason"
                    type="hidden"
                    value="More sources requested from module review."
                  />
                  <button
                    className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 transition active:translate-y-px"
                    type="submit"
                  >
                    Request sources
                  </button>
                </Form>
                {module.moduleType === "stage" && (
                  <Form method="post">
                    <input
                      name="intent"
                      type="hidden"
                      value="regenerate-draft-module"
                    />
                    <input name="moduleId" type="hidden" value={module.id} />
                    <button
                      className="rounded-md border border-zinc-300 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-zinc-900 transition active:translate-y-px"
                      type="submit"
                    >
                      Regenerate
                    </button>
                  </Form>
                )}
              </div>
            </div>
            <ModuleContentPreview module={module} />
          </section>
        ))}
      </div>
    </div>
  );
}

function PublishPanel({
  preflight,
  runId,
}: {
  preflight: Route.ComponentProps["loaderData"]["generationRuns"][number]["publishPreflight"];
  runId: string;
}) {
  return (
    <div className="mt-4 rounded-md border border-zinc-200 bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2">
        <div>
          <h4 className="text-sm font-medium text-zinc-950">
            Publish preflight
          </h4>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {preflight.blockers.length} blockers · {preflight.warnings.length} warnings
          </p>
        </div>
        <span
          className={
            preflight.ok
              ? "rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-800"
              : "rounded border border-red-200 bg-red-50 px-2 py-1 font-mono text-xs text-red-800"
          }
        >
          {preflight.ok ? "ready" : "blocked"}
        </span>
      </div>
      {preflight.blockers.length > 0 && (
        <ul className="border-b border-zinc-200 px-3 py-3">
          {preflight.blockers.slice(0, 8).map((blocker) => (
            <li className="text-sm leading-6 text-red-800" key={blocker}>
              {blocker}
            </li>
          ))}
        </ul>
      )}
      {preflight.warnings.length > 0 && (
        <ul className="border-b border-zinc-200 px-3 py-3">
          {preflight.warnings.slice(0, 5).map((warning) => (
            <li className="text-sm leading-6 text-amber-800" key={warning}>
              {warning}
            </li>
          ))}
        </ul>
      )}
      <Form className="grid gap-3 px-3 py-3" method="post">
        <input name="intent" type="hidden" value="publish-generation-run" />
        <input name="runId" type="hidden" value={runId} />
        <label className="grid gap-1 text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">Revision note</span>
          <textarea
            className="min-h-20 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
            name="revisionNote"
            placeholder="What changed in this reviewed version?"
          />
        </label>
        <button
          className="w-fit rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px"
          disabled={!preflight.ok}
          type="submit"
        >
          Publish immutable version
        </button>
      </Form>
    </div>
  );
}

function ModuleContentPreview({
  module,
}: {
  module: Route.ComponentProps["loaderData"]["generationRuns"][number]["draftModules"][number];
}) {
  if (module.moduleKey === "orientation") {
    return (
      <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
        <p>{String(module.content.whatItIs || "")}</p>
        <p>{String(module.content.centralPressure || "")}</p>
        <p>{String(module.content.tradeoffTheme || "")}</p>
      </div>
    );
  }

  if (module.moduleType === "stage") {
    return (
      <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
        <p className="font-medium text-zinc-900">
          {String(module.content.number || "")}.{" "}
          {String(module.content.title || "")}
        </p>
        <p>{String(module.content.constraint || "")}</p>
        <p className="font-mono text-xs text-zinc-500">
          {arrayLength(module.content.options)} options · debts{" "}
          {arrayLength(module.content.debtsIntroduced)} · claims{" "}
          {arrayLength(module.content.claimIds)}
        </p>
      </div>
    );
  }

  if (module.moduleKey !== "stage_outline") {
    return (
      <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
        <p>{String(module.content.summary || module.content.story || module.content.name || module.moduleType)}</p>
        <p className="font-mono text-xs text-zinc-500">
          validation {String(module.validation.ok === true ? "ok" : "blocked")}
        </p>
      </div>
    );
  }

  const stages = Array.isArray(module.content.stages)
    ? module.content.stages
    : [];
  return (
    <div className="mt-3">
      <p className="font-mono text-xs text-zinc-500">
          {String(module.content.stageCount || stages.length)} stages · mature
      </p>
      <ol className="mt-2 grid gap-1">
        {stages.slice(0, 9).map((stage, index) => {
          const stageRecord =
            stage && typeof stage === "object"
              ? (stage as Record<string, unknown>)
              : {};
          return (
            <li className="text-sm leading-6 text-zinc-700" key={index}>
              {String(stageRecord.number || index + 1)}.{" "}
              {String(stageRecord.title || "Untitled stage")}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function SourceCorpusPanel({
  runId,
  sources,
}: {
  runId: string;
  sources: Route.ComponentProps["loaderData"]["generationRuns"][number]["sources"];
}) {
  if (sources.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-white/50 px-3 py-3 text-sm text-zinc-600">
        Source corpus is empty until the general source discovery step runs.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-zinc-200 bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2">
        <h4 className="text-sm font-medium text-zinc-950">Source corpus</h4>
        <span className="font-mono text-xs text-zinc-500">
          {sources.length} candidates
        </span>
      </div>
      <ul className="divide-y divide-zinc-200">
        {sources.map((source) => (
          <li className="grid gap-3 px-3 py-3 md:grid-cols-[1fr_auto]" key={source.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="truncate text-sm font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title || source.url}
                </a>
                <span className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                  {source.status}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                {source.sourceType} · {source.trustLevel} ·{" "}
                {source.publisher || "unknown publisher"}
              </p>
              {source.r2ObjectKey && (
                <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                  R2 {source.r2ObjectKey}
                </p>
              )}
            </div>
            {source.status !== "rejected" && (
              <Form className="self-start justify-self-start md:justify-self-end" method="post">
                <input
                  name="intent"
                  type="hidden"
                  value="reject-source-document"
                />
                <input name="sourceId" type="hidden" value={source.id} />
                <input name="runId" type="hidden" value={runId} />
                <button
                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 transition active:translate-y-px"
                  type="submit"
                >
                  Reject
                </button>
              </Form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
