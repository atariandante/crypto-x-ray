import { getCached, setCached, withCache } from "../cache";
import { ApiName, getRateLimiter } from "../rate-limiter";
import {
  CACHE_TTL,
  RugCheckReport,
  RugCheckRisk,
  RugCheckSummary,
} from "../types";

const BASE_URL = "https://api.rugcheck.xyz/v1/tokens";
const limiter = getRateLimiter(ApiName.RugCheck);

interface RugCheckRiskResponse {
  name?: string;
  level?: string;
  description?: string;
  value?: string;
  score?: number;
}

interface RugCheckSummaryResponse {
  mint?: string;
  score?: number;
  score_normalised?: number;
  tokenProgram?: string;
  tokenType?: string;
  lpLockedPct?: number;
  risks?: RugCheckRiskResponse[] | null;
}

interface RugCheckReportResponse extends RugCheckSummaryResponse {
  rugged?: boolean;
  topHolders?: Record<string, unknown>[] | null;
  markets?: Record<string, unknown>[] | null;
  graphInsidersDetected?: number;
  insiderNetworks?: Record<string, unknown>[] | null;
  creatorTokens?: Record<string, unknown>[] | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  return limiter.execute(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`RugCheck ${response.status}: ${url}`);
    }
    return response.json();
  });
}

/**
 * Normalizes a raw RugCheck risk item into the shared risk shape used by the
 * rest of the extension.
 */
function mapRisk(risk: RugCheckRiskResponse): RugCheckRisk {
  return {
    name: risk.name ?? "",
    level: risk.level ?? "unknown",
    description: risk.description,
    value: risk.value,
    score: risk.score,
  };
}

/**
 * Normalizes the shared summary fields that appear in both RugCheck endpoints.
 */
function mapSummary(response: RugCheckSummaryResponse): RugCheckSummary {
  return {
    mint: response.mint ?? "",
    score: response.score ?? 0,
    normalizedScore: response.score_normalised ?? 0,
    tokenProgram: response.tokenProgram ?? "",
    tokenType: response.tokenType ?? "",
    lpLockedPct: response.lpLockedPct,
    risks: (response.risks ?? []).map(mapRisk),
  };
}

/**
 * Fetch the lightweight RugCheck report summary for a Solana mint.
 */
export async function fetchTokenSummary(
  mint: string,
): Promise<RugCheckSummary | null> {
  try {
    return await withCache(`rugcheck:${mint}`, CACHE_TTL.RUGCHECK, async () => {
      const response = await fetchJson<RugCheckSummaryResponse>(
        `${BASE_URL}/${mint}/report/summary`,
      );
      return mapSummary(response);
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch the full RugCheck report for a Solana mint.
 */
export async function fetchTokenReport(
  mint: string,
): Promise<RugCheckReport | null> {
  const cacheKey = `rugcheck:report:${mint}`;
  const cached = await getCached<RugCheckReport>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchJson<RugCheckReportResponse>(
      `${BASE_URL}/${mint}/report`,
    );
    const report: RugCheckReport = {
      ...mapSummary(response),
      rugged: response.rugged ?? false,
      topHolders: response.topHolders ?? [],
      markets: response.markets ?? [],
      graphInsidersDetected: response.graphInsidersDetected ?? 0,
      insiderNetworks: response.insiderNetworks ?? [],
      creatorTokens: response.creatorTokens ?? [],
    };
    await setCached(cacheKey, report, CACHE_TTL.RUGCHECK);
    return report;
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}
