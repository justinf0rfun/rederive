export type GenerationMessage =
  | {
      type: "start_run";
      runId: string;
    }
  | {
      type: "retry_run";
      runId: string;
      requestedBy: string;
    };

export type GenerationDispatcher = {
  dispatch(message: GenerationMessage): Promise<void>;
};

type WorkflowBindingLike = {
  create(options?: {
    id?: string;
    params?: GenerationMessage;
    retention?: {
      successRetention?: WorkflowRetentionDuration;
      errorRetention?: WorkflowRetentionDuration;
    };
  }): Promise<{ id: string }>;
};

export function parseGenerationMessage(input: unknown): GenerationMessage {
  if (!input || typeof input !== "object") {
    throw new Error("Generation message must be an object.");
  }

  const value = input as Record<string, unknown>;
  if (value.type === "start_run" && typeof value.runId === "string") {
    return { type: "start_run", runId: value.runId };
  }

  if (
    value.type === "retry_run" &&
    typeof value.runId === "string" &&
    typeof value.requestedBy === "string"
  ) {
    return {
      type: "retry_run",
      runId: value.runId,
      requestedBy: value.requestedBy,
    };
  }

  throw new Error("Unsupported generation message.");
}

export function createQueueGenerationDispatcher(
  queue: Queue<GenerationMessage>
): GenerationDispatcher {
  return {
    async dispatch(message) {
      await queue.send(message);
    },
  };
}

export function createWorkflowGenerationDispatcher(
  workflow: WorkflowBindingLike
): GenerationDispatcher {
  return {
    async dispatch(message) {
      await workflow.create({
        id: createWorkflowInstanceId(message),
        params: message,
        retention: {
          successRetention: "30 days",
          errorRetention: "90 days",
        },
      });
    },
  };
}

export function createGenerationDispatcher(env: {
  GENERATION_WORKFLOW?: WorkflowBindingLike;
  GENERATION_QUEUE: Queue<GenerationMessage>;
}): GenerationDispatcher {
  if (env.GENERATION_WORKFLOW) {
    return createWorkflowGenerationDispatcher(env.GENERATION_WORKFLOW);
  }

  return createQueueGenerationDispatcher(env.GENERATION_QUEUE);
}

function createWorkflowInstanceId(message: GenerationMessage): string {
  const suffix =
    message.type === "retry_run"
      ? `retry-${sanitizeWorkflowIdPart(message.requestedBy)}-${Date.now()}`
      : `start-${Date.now()}`;

  return `generation-${sanitizeWorkflowIdPart(message.runId)}-${suffix}`;
}

function sanitizeWorkflowIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 96);
}
