import { describe, expect, it, vi } from "vitest";

import {
  createGenerationDispatcher,
  createQueueGenerationDispatcher,
  createWorkflowGenerationDispatcher,
  parseGenerationMessage,
} from "./messages";

describe("generation messages", () => {
  it("parses supported generation messages", () => {
    expect(parseGenerationMessage({ type: "start_run", runId: "run-1" })).toEqual(
      {
        type: "start_run",
        runId: "run-1",
      }
    );

    expect(
      parseGenerationMessage({
        type: "retry_run",
        runId: "run-1",
        requestedBy: "admin@example.com",
      })
    ).toEqual({
      type: "retry_run",
      runId: "run-1",
      requestedBy: "admin@example.com",
    });
  });

  it("rejects unsupported messages", () => {
    expect(() => parseGenerationMessage({ type: "start_run" })).toThrow(
      "Unsupported generation message."
    );
  });

  it("dispatches to queues when only queue binding is available", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createQueueGenerationDispatcher({
      send,
    } as unknown as Queue);

    await dispatcher.dispatch({ type: "start_run", runId: "run-1" });

    expect(send).toHaveBeenCalledWith({ type: "start_run", runId: "run-1" });
  });

  it("dispatches to workflows with durable instance params", async () => {
    const create = vi.fn().mockResolvedValue({ id: "workflow-instance" });
    const dispatcher = createWorkflowGenerationDispatcher({ create });

    await dispatcher.dispatch({
      type: "retry_run",
      runId: "run/1",
      requestedBy: "admin@example.com",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(
          /^generation-run-1-retry-admin-example-com-\d+$/
        ),
        params: {
          type: "retry_run",
          runId: "run/1",
          requestedBy: "admin@example.com",
        },
      })
    );
  });

  it("prefers workflows over queues when both bindings exist", async () => {
    const create = vi.fn().mockResolvedValue({ id: "workflow-instance" });
    const send = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createGenerationDispatcher({
      GENERATION_WORKFLOW: { create },
      GENERATION_QUEUE: { send } as unknown as Queue,
    });

    await dispatcher.dispatch({ type: "start_run", runId: "run-1" });

    expect(create).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });
});
