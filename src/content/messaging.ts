import type { Message, MessageResponse } from "@/shared/types";

const REQUEST_TIMEOUT_MS = 10_000;
const inflightRequests = new Map<string, Promise<MessageResponse<unknown>>>();

/**
 * Sends a typed message to the background worker with request deduplication and
 * timeout handling so hover-driven lookups do not fan out duplicate requests.
 */
export function sendMessage<T>(message: Message): Promise<MessageResponse<T>> {
  const dedupKey = getDedupKey(message);
  const existing = inflightRequests.get(dedupKey);
  if (existing) {
    return existing as Promise<MessageResponse<T>>;
  }

  const request = new Promise<MessageResponse<T>>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      inflightRequests.delete(dedupKey);
      reject(new Error("Background request timed out"));
    }, REQUEST_TIMEOUT_MS);

    chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
      globalThis.clearTimeout(timeoutId);
      inflightRequests.delete(dedupKey);
      resolve(response);
    });
  });

  inflightRequests.set(dedupKey, request as Promise<MessageResponse<unknown>>);
  return request;
}

function getDedupKey(message: Message): string {
  const payload =
    typeof message.payload === "object" && message.payload !== null
      ? (message.payload as Record<string, unknown>)
      : {};

  const id =
    typeof payload.id === "string"
      ? payload.id
      : typeof payload.address === "string"
        ? payload.address
        : JSON.stringify(payload);

  return `${message.type}:${id}`;
}
