<p align="center">
  <img src="public/icons/icon_128.png" alt="Crypto X-Ray" width="96" />
</p>

<h1 align="center">Crypto X-Ray</h1>

<p align="center">
  <strong>Token intelligence at the point of discovery.</strong><br />
  A Chrome extension that detects crypto tokens on any webpage and delivers instant tokenomics analysis — without leaving the page.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/typescript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/vite-5-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

# Crypto X-Ray

Crypto X-Ray is a Chrome extension that acts as a real-time crypto risk detector for the internet.

Instead of just showing token data, it scans any webpage, detects crypto-related entities (tokens, wallet addresses, contracts), and instantly tells you whether you should trust them.

The goal is simple: help you avoid getting rugged.

---

## Why this exists

Crypto moves fast, and most users make decisions based on incomplete or misleading information.

You see a token on Twitter.  
A wallet address in Discord.  
A contract on a random site.

And you have seconds to decide:

“Is this safe?”

Today, that requires opening multiple tabs, checking explorers, and doing manual research.

Crypto X-Ray compresses that into a few seconds directly in the page you are already on.

---

## What it does

- Detects crypto entities directly in any webpage  
  Tokens (e.g. ADA, ETH)  
  Wallet addresses (0x...)  
  ENS domains  

- Highlights them inline without breaking your browsing experience  

- Shows instant risk insights  
  Ownership concentration  
  Liquidity signals  
  Contract recency  
  Basic trust indicators  

- Provides a quick verdict  
  Not just data, but a decision layer  

---

## Product philosophy

This is not another CoinMarketCap overlay.

Raw data is not the problem. Interpretation is.

Crypto X-Ray focuses on:

- Speed → understand in seconds  
- Clarity → no dashboards, just signals  
- Risk-first → protect users before informing them  

Think of it as a “Web3 antivirus” rather than a data tool.

---

## Example

You see a token mentioned on a page:

ADA

Instead of manually researching, you hover and get:

Risk: Medium  
- High concentration in top wallets  
- Moderate liquidity  

You immediately know whether to dig deeper or ignore it.

---

## How it works (high level)

The extension has three main parts:

1. Content Script  
Scans the DOM and detects crypto-related entities.

2. Background Layer  
Fetches data, caches results, and computes insights.

3. UI Layer  
Displays tooltips and panels with risk summaries and explanations.

---

## Tech Stack

Core:
- TypeScript
- Chrome Extension APIs (Manifest V3)

Frontend / UI:
- React (for tooltip and panel UI)
- Shadow DOM (UI isolation inside webpages)

DOM Processing:
- TreeWalker API (text node traversal)
- MutationObserver (dynamic DOM updates)

Architecture:
- Content Script (detection + highlighting)
- Background Service Worker (data fetching, caching, insights)
- Messaging system (chrome.runtime messaging)

Data Layer:
- External APIs (e.g. CoinGecko for token data)
- In-memory caching with TTL strategy

Future / Planned:
- Shared core package (for cross-platform reuse)
- macOS app (system-wide detection layer)

---

## Milestones

### Milestone 1 — Chrome Extension (MVP)

Goal: Validate the core idea — real-time crypto risk detection directly in the browser.

Status: In progress (initial SPIKES completed, see GitHub issues)

Scope:
- Detect tokens, wallet addresses, and ENS domains in the DOM
- Highlight detected entities inline
- Show tooltip with basic data (price, simple insights)
- Basic background data fetching and caching

Action Items:
- [ ] Integrate token data providers — dictionary + RugCheck ([#6](https://github.com/atariandante/crypto-x-ray/issues/6))
- [ ] Finalize entity detection engine ([#3](https://github.com/atariandante/crypto-x-ray/issues/3))
- [ ] Implement caching layer ([#7](https://github.com/atariandante/crypto-x-ray/issues/7))
- [ ] Implement highlight injection system ([#4](https://github.com/atariandante/crypto-x-ray/issues/4))
- [ ] Set up background messaging pipeline ([#5](https://github.com/atariandante/crypto-x-ray/issues/5))
- [ ] Implement insight engine with unified RiskProvider interface ([#9](https://github.com/atariandante/crypto-x-ray/issues/9))
- [ ] Build tooltip UI ([#8](https://github.com/atariandante/crypto-x-ray/issues/8))
- [ ] Add debounced DOM observer ([#10](https://github.com/atariandante/crypto-x-ray/issues/10))
- [ ] Reduce false positives in detection ([#11](https://github.com/atariandante/crypto-x-ray/issues/11))
- [ ] Validate UX on real-world sites ([#12](https://github.com/atariandante/crypto-x-ray/issues/12))

---

### Milestone 2 — macOS App

Goal: Expand from browser-only context to a system-wide crypto intelligence layer.

Status: Not started

Scope:
- Detect crypto entities across applications (browser, Discord, Slack, etc.)
- Provide global overlay or floating panel
- Reuse core detection + data + insight engine

Action Items:
- [ ] Define macOS architecture (#13)
- [ ] Research system-wide text detection (#14)
- [ ] Extract shared core logic into reusable package (#15)
- [ ] Design global overlay UI (#16)
- [ ] Implement system-wide detection (#17)
- [ ] Connect to data + caching layer (#18)
- [ ] Add quick access panel (keyboard shortcut) (#19)
- [ ] Optimize performance (#20)
- [ ] Validate UX across apps (#21)

---

## Roadmap

- Better risk scoring engine  
- Wallet intelligence (whales, smart money)  
- More accurate detection (reduce false positives)  
- Support for more chains and data providers  
- Side panel with deeper analysis  

---

## Current status

Early stage / experimental.

This project started as a spike to explore whether real-time crypto context on any webpage is useful.

We are currently validating:
- Detection accuracy  
- Performance on real-world pages  
- Whether users actually rely on the insights  

---

<p align="center">
  <sub>Built with ☕ and conviction that you shouldn't need 5 browser tabs to evaluate a token.</sub>
</p>
