import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTokenReport, fetchTokenSummary } from "./rugcheck";

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rugcheck", () => {
  describe("fetchTokenSummary", () => {
    it("maps a RugCheck summary response into the shared summary shape", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            mint: "So11111111111111111111111111111111111111112",
            score: 1234,
            score_normalised: 87,
            tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            tokenType: "spl",
            lpLockedPct: 91.2,
            risks: [
              {
                name: "Mint authority still enabled",
                value: "present",
                description: "Token can still mint additional supply",
                level: "high",
                score: 4000,
              },
            ],
          }),
      });

      const summary = await fetchTokenSummary(
        "So11111111111111111111111111111111111111112",
      );

      expect(summary).toEqual({
        mint: "So11111111111111111111111111111111111111112",
        score: 1234,
        normalizedScore: 87,
        tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        tokenType: "spl",
        lpLockedPct: 91.2,
        risks: [
          {
            name: "Mint authority still enabled",
            value: "present",
            description: "Token can still mint additional supply",
            level: "high",
            score: 4000,
          },
        ],
      });
    });

    it("returns null for not-found tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const summary = await fetchTokenSummary("unknown-mint");
      expect(summary).toBeNull();
    });
  });

  describe("fetchTokenReport", () => {
    it("preserves report sections needed by downstream risk analysis", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            mint: "mint-123",
            score: 55,
            score_normalised: 61,
            tokenProgram: "Tokenkeg",
            tokenType: "spl",
            rugged: false,
            risks: [
              {
                name: "Low liquidity",
                value: "12000",
                description: "Liquidity is thin for the reported market cap",
                level: "warn",
                score: 2000,
              },
            ],
            topHolders: [
              {
                address: "holder-1",
                pct: 12.5,
                amount: 1250000,
                insider: true,
              },
            ],
            markets: [
              {
                marketType: "Raydium",
                liquidityA: "100000",
                liquidityB: "25000",
                lp: {
                  lpLockedPct: 72.5,
                },
              },
            ],
            graphInsidersDetected: 3,
            insiderNetworks: [
              {
                wallet: "insider-1",
                related: ["insider-2"],
              },
            ],
            creatorTokens: [
              {
                mint: "creator-token-1",
              },
            ],
          }),
      });

      const report = await fetchTokenReport("mint-123");

      expect(report).toEqual({
        mint: "mint-123",
        score: 55,
        normalizedScore: 61,
        tokenProgram: "Tokenkeg",
        tokenType: "spl",
        rugged: false,
        risks: [
          {
            name: "Low liquidity",
            value: "12000",
            description: "Liquidity is thin for the reported market cap",
            level: "warn",
            score: 2000,
          },
        ],
        topHolders: [
          {
            address: "holder-1",
            pct: 12.5,
            amount: 1250000,
            insider: true,
          },
        ],
        markets: [
          {
            marketType: "Raydium",
            liquidityA: "100000",
            liquidityB: "25000",
            lp: {
              lpLockedPct: 72.5,
            },
          },
        ],
        graphInsidersDetected: 3,
        insiderNetworks: [
          {
            wallet: "insider-1",
            related: ["insider-2"],
          },
        ],
        creatorTokens: [
          {
            mint: "creator-token-1",
          },
        ],
      });
    });

    it("returns null for not-found reports", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const report = await fetchTokenReport("unknown-mint");
      expect(report).toBeNull();
    });
  });
});
