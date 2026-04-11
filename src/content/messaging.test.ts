import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendMessage } from "./messaging";
import type { Message } from "@/shared/types";

const sendMessageMock = vi.fn();

vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: sendMessageMock,
  },
});

describe("sendMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses one in-flight request for identical messages", async () => {
    let resolveResponse: ((value: { success: true; data: { ok: boolean } }) => void) | undefined;
    sendMessageMock.mockImplementation(
      (_message: Message, callback: (response: { success: true; data: { ok: boolean } }) => void) => {
        resolveResponse = callback;
      },
    );

    const message: Message = {
      type: "GET_RISK_ASSESSMENT",
      payload: { id: "ethereum" },
    };

    const first = sendMessage<{ ok: boolean }>(message);
    const second = sendMessage<{ ok: boolean }>(message);

    expect(first).toBe(second);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);

    resolveResponse?.({ success: true, data: { ok: true } });

    await expect(first).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(second).resolves.toEqual({ success: true, data: { ok: true } });
  });

  it("rejects when the background response times out", async () => {
    sendMessageMock.mockImplementation(() => undefined);

    const promise = sendMessage({
      type: "GET_RISK_ASSESSMENT",
      payload: { address: "0xabc", chain: "ethereum" },
    });
    const rejection = expect(promise).rejects.toThrow("Background request timed out");

    await vi.advanceTimersByTimeAsync(10_000);

    await rejection;
  });
});
