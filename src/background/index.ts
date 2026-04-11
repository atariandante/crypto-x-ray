import {
  fetchTokenById,
  fetchTokenByContract,
  fetchSimplePrices,
} from "../shared/api/coingecko";
import {
  fetchFundamentals,
  fetchPrices,
  formatCoinId,
} from "../shared/api/defi-llama";
import { clearExpired } from "../shared/cache";
import type {
  Chain,
  Message,
  MessageResponse,
  TokenProfile,
} from "../shared/types";

console.log("[Crypto X-Ray] Background service worker loaded");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Narrows token-resolution payloads received over the extension message bus.
 */
function isResolveTokenPayload(
  payload: unknown,
): payload is { id: string } {
  return isRecord(payload) && typeof payload.id === "string";
}

/**
 * Narrows address-resolution payloads received over the extension message bus.
 */
function isResolveAddressPayload(
  payload: unknown,
): payload is { address: string; chain: Chain } {
  return (
    isRecord(payload) &&
    typeof payload.address === "string" &&
    typeof payload.chain === "string"
  );
}

/**
 * Narrows search payloads received over the extension message bus.
 */
function isSearchTokenPayload(
  payload: unknown,
): payload is { query: string } {
  return isRecord(payload) && typeof payload.query === "string";
}

// ---------- Message handler ----------

chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    handleMessage(message).then(sendResponse).catch((error) => {
      console.error("[Crypto X-Ray] Message handler error:", error);
      sendResponse({ success: false, error: String(error) });
    });
    return true; // keep channel open for async response
  },
);

async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case "RESOLVE_TOKEN":
      return isResolveTokenPayload(message.payload)
        ? resolveToken(message.payload)
        : { success: false, error: "Invalid RESOLVE_TOKEN payload" };

    case "RESOLVE_ADDRESS":
      return isResolveAddressPayload(message.payload)
        ? resolveAddress(message.payload)
        : { success: false, error: "Invalid RESOLVE_ADDRESS payload" };

    case "SEARCH_TOKEN":
      return isSearchTokenPayload(message.payload)
        ? searchToken(message.payload)
        : { success: false, error: "Invalid SEARCH_TOKEN payload" };

    case "GET_SETTINGS":
    case "UPDATE_SETTINGS":
      // TODO: Implement in settings task
      return { success: false, error: "Not implemented" };

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// ---------- Handlers ----------

async function resolveToken(payload: {
  id: string;
}): Promise<MessageResponse<TokenProfile>> {
  const profile = await fetchTokenById(payload.id);

  // Enrich with DeFiLlama fundamentals (TVL, revenue)
  const fundamentals = await fetchFundamentals(profile.coingeckoId);
  if (fundamentals) {
    profile.fundamentals = fundamentals;
  }

  // Enrich price from DeFiLlama (more generous rate limits)
  const coinId = formatCoinId("coingecko", profile.coingeckoId);
  const prices = await fetchPrices([coinId]);
  const dlPrice = prices[coinId];
  if (dlPrice) {
    profile.price = dlPrice.price;
  }

  return { success: true, data: profile };
}

async function resolveAddress(payload: {
  address: string;
  chain: Chain;
}): Promise<MessageResponse<TokenProfile>> {
  // Try CoinGecko contract lookup first (gives full profile)
  const profile = await fetchTokenByContract(payload.chain, payload.address);
  if (!profile) {
    return { success: false, error: "Token not found" };
  }

  // Enrich with fundamentals
  const fundamentals = await fetchFundamentals(profile.coingeckoId);
  if (fundamentals) {
    profile.fundamentals = fundamentals;
  }

  return { success: true, data: profile };
}

async function searchToken(payload: {
  query: string;
}): Promise<MessageResponse> {
  // Use simple price lookup as a quick search mechanism
  const prices = await fetchSimplePrices([payload.query.toLowerCase()]);
  if (Object.keys(prices).length > 0) {
    const id = Object.keys(prices)[0];
    const profile = await fetchTokenById(id);
    return { success: true, data: profile };
  }
  return { success: false, error: "Token not found" };
}

// ---------- Scheduled cache cleanup ----------

chrome.alarms.create("cache-cleanup", { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cache-cleanup") {
    clearExpired().catch(console.error);
  }
});
