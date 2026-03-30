# Product Strategy

**Date**: 2026-03-30
**Status**: SPIKE-01 Output

---

## Value Proposition

Crypto X-Ray provides **instant due diligence at the point of discovery**. When a user sees a token mentioned on Twitter, a blog, or any webpage, they get an analysis overlay without leaving the page. The alternative today is opening 4+ tabs across CoinGecko, DeFiLlama, Etherscan, and others.

---

## Tier Structure

### Free Tier — Core Extension

The free tier IS the product. Gating it kills adoption.

| Feature | Description |
|---------|-------------|
| **TokenCard** | Full analysis card for known tokens (price, supply, market cap, FDV, scoring) |
| **StablecoinCard** | Peg health, mechanism, circulating supply, chain distribution |
| **ChainCard** | Ecosystem view (TVL, stablecoin liquidity, DEX volume, top protocols) |
| **UnknownTokenCard** | Basic analysis for unindexed contracts (Tier 2 detection) |
| **Basic Scoring** | 1-5 health rating with red flags (supply score + fundamentals score) |
| **Tier 1-2 Detection** | Known token dictionary + contract address resolution |

**Cost to operate**: $0/mo (CoinGecko free + DeFiLlama free + Etherscan free)

---

### Pro Tier — $8/mo

Premium features built entirely from free API data. Zero marginal cost.

#### 1. Portfolio Risk Scanner

- User pastes wallet address or inputs holdings manually
- Extension scores every holding using the free scoring engine
- Shows aggregate portfolio risk, concentration warnings, high-FDV exposure
- **Unique value**: No product offers automated risk scoring across an entire portfolio. CoinGecko/DeFiLlama show data per token — this shows overall exposure.
- **Data sources**: CoinGecko `/coins/{id}` + DeFiLlama `/tvl` + `/summary/fees`

#### 2. Fundamentals Alerts

- Track tokens on a watchlist
- Get notified when score drops (e.g., TVL crash, revenue decline, FDV/MCap spike)
- Score-based alerts are unique — no consumer product does "alert me when fundamentals change"
- **Unique value**: Price alerts are commodity. Fundamentals alerts don't exist.
- **Data sources**: Periodic polling of free APIs, score comparison over time

#### 3. Bulk Page Scan

- One click: scan entire page, rank every detected token by risk score
- CT thread with 15 tokens mentioned? Instant ranked overview
- **Unique value**: Time savings. Alternative is checking each token individually.
- **Data sources**: Detection engine + batch calls to free APIs

#### 4. Multi-Token Comparison

- Select 2-4 tokens, get side-by-side analysis cards
- Revenue, TVL, supply, valuation ratios compared visually
- **Unique value**: DeFi researchers do this manually in spreadsheets today.
- **Data sources**: Same free endpoints, different UI presentation

#### 5. Historical Score Tracking

- Token scored 4/5 three months ago, now 2/5 — what changed?
- Track score components over time (TVL trend, revenue changes, FDV/MCap shifts)
- **Unique value**: Hindsight tool — "I wish I knew this token was deteriorating"
- **Data sources**: Locally cached scores over time

#### 6. Export / Share

- Export analysis cards as images for Twitter/Discord
- Shareable link with snapshot data
- **Unique value**: CT influencers and newsletter writers use this daily
- **Viral potential**: Branded cards = organic distribution

**Cost to operate**: $0/mo (all derived from free APIs + local storage)

---

### Pro + Unlocks Tier — $15-20/mo (Post-PMF)

Enabled after product-market fit is proven, funded by Pro subscribers.

| Feature | Description | Data Source |
|---------|-------------|------------|
| Unlock countdown | "Next unlock in 12 days — 4.2% of circulating supply" | DeFiLlama Pro `/api/emissions` |
| Allocation breakdown | Pie chart: insiders, airdrop, farming, community % | DeFiLlama Pro `/api/emission/{protocol}` |
| Vesting progress | "Team is 45% vested, investors 80% vested" | DeFiLlama Pro `/api/emission/{protocol}` |
| Dilution pressure | "3.2% supply increase projected in next 30d" | Calculated from unlock events |
| Hack history | "This protocol was exploited for $4.8M in March 2024" | DeFiLlama Pro `/api/hacks` |
| Treasury holdings | "Protocol treasury holds $50M (40% stables, 30% ETH)" | DeFiLlama Pro `/api/treasuries` |
| Fundraising context | "Raised $16M Series A from a16z" | DeFiLlama Pro `/api/raises` |

**Cost to operate**: $300/mo (DeFiLlama Pro subscription)
**Break-even**: 38 Pro+Unlocks subscribers at $8 uplift, or 20 at $15 uplift

---

## Revenue Model

| Tier | Price | Target | Revenue |
|------|-------|--------|---------|
| Free | $0 | Mass adoption | $0 (growth engine) |
| Pro | $8/mo | Power users, CT readers | $8/user/mo |
| Pro + Unlocks | $15-20/mo | Researchers, fund analysts | $15-20/user/mo |

### Revenue Projections

| Milestone | Pro Subs | Pro+Unlocks Subs | MRR | Costs | Net |
|-----------|----------|-------------------|-----|-------|-----|
| Launch | 0 | 0 | $0 | $0 | $0 |
| 50 Pro users | 50 | 0 | $400 | $0 | $400 |
| Enable unlocks | 150 | 50 | $1,950 | $300 | $1,650 |
| Growth | 500 | 200 | $7,000 | $300 | $6,700 |

---

## Premium Features Ranked by Revenue Potential

1. **Portfolio Risk Scanner** — highest willingness to pay, most unique offering
2. **Fundamentals Alerts** — recurring value, highest retention driver
3. **Bulk Page Scan** — solves real daily pain for CT readers
4. **Export/Share** — low effort to build, high viral distribution potential
5. **Comparison View** — niche but high-value for researchers
6. **Historical Scoring** — retention feature, reduces Pro churn

---

## Implementation Triggers

| Trigger | Action |
|---------|--------|
| Extension published to Chrome Web Store | Launch with Free tier only |
| 1,000+ weekly active users | Build + launch Pro tier |
| 50+ Pro subscribers ($400/mo MRR) | Subscribe to DeFiLlama Pro, build unlock features |
| 200+ total paid subscribers | Launch Pro+Unlocks tier |

---

## API Cost Summary

| Phase | APIs Used | Monthly Cost |
|-------|----------|-------------|
| MVP (Free + Pro) | CoinGecko free, DeFiLlama free, Etherscan free, Solscan free | $0 |
| Post-PMF (Pro+Unlocks) | Above + DeFiLlama Pro | $300 |
| Scale | Above + CoinGecko paid (if rate limited) | $300-800 |
