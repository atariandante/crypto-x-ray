import type { Chain, TokenProfile } from "../types";

/**
 * Categories used to group normalized risk signals from different providers.
 */
export type RiskCategory =
  | "supply"
  | "liquidity"
  | "ownership"
  | "contract"
  | "fundamentals"
  | "general";

/**
 * Severity scale shared across providers so the engine can aggregate them.
 */
export type RiskSeverity = "info" | "warning" | "critical";

/**
 * Normalized entity shape that providers can reason about without depending on
 * message-layer payloads or provider-specific fetch logic.
 */
export interface RiskEntity {
  type: "token" | "address" | "wallet";
  identifier: string;
  chain?: Chain;
  tokenProfile?: TokenProfile;
}

/**
 * Single risk signal produced by a provider after normalizing raw source data.
 */
export interface RiskInsight {
  signal: string;
  severity: RiskSeverity;
  detail: string;
  provider: string;
  category: RiskCategory;
}

/**
 * Final aggregate risk result returned by the engine for UI and messaging.
 */
export interface RiskAssessment {
  riskLevel: "low" | "medium" | "high";
  score: number;
  verdict: string;
  insights: RiskInsight[];
  providers: string[];
}

/**
 * Provider contract for any source capable of emitting normalized risk signals.
 */
export interface RiskProvider {
  readonly id: string;
  readonly name: string;
  canHandle(entity: RiskEntity): boolean;
  getInsights(entity: RiskEntity): Promise<RiskInsight[]>;
}
