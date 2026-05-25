import { createRequestHandler } from "react-router";
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { GENERATION_STEP_KEYS } from "../app/domain/generation-steps/types";
import { parseGenerationMessage } from "../app/domain/generation/messages";
import type { GenerationMessage } from "../app/domain/generation/messages";
import {
  finalizeGenerationRunQualityGates,
  handleGenerationMessage,
  initializeGenerationRun,
  retryGenerationRun,
  runGenerationWorkflowStep,
} from "../app/domain/generation/orchestrator.server";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export class GenerationWorkflow extends WorkflowEntrypoint<
  Env,
  GenerationMessage
> {
  async run(event: WorkflowEvent<GenerationMessage>, step: WorkflowStep) {
    const message = parseGenerationMessage(event.payload);

    if (message.type === "retry_run") {
      await step.do("reset failed generation steps", async () => {
        await retryGenerationRun(this.env.DB, message.runId);
        return { runId: message.runId, requestedBy: message.requestedBy };
      });
    }

    await step.do("initialize D1 generation steps", async () => {
      await initializeGenerationRun(this.env.DB, message.runId);
      return { runId: message.runId };
    });

    for (const stepKey of GENERATION_STEP_KEYS) {
      const result = await step.do(`run ${stepKey}`, async () =>
        runGenerationWorkflowStep(this.env.DB, message.runId, stepKey)
      );
      if (result.status === "blocked") {
        return result;
      }
    }

    return step.do("final quality and publish readiness gate", async () =>
      finalizeGenerationRunQualityGates(this.env.DB, message.runId)
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      await handleGenerationMessage(env.DB, parseGenerationMessage(message.body));
      message.ack();
    }
  },
} satisfies ExportedHandler<Env>;
