/**
 * DOM highlighter for crypto-related terms.
 * Wraps detected tokens in styled spans with Shadow DOM isolation.
 */

const HIGHLIGHT_CLASS = "crypto-xray-highlight";
const SHADOW_HOST_ID = "crypto-xray-shadow-host";

/**
 * Creates or retrieves the Shadow DOM host for highlight styles.
 * @returns The ShadowRoot for injecting highlight styles
 */
function getShadowRoot(): ShadowRoot {
  let host = document.getElementById(SHADOW_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = SHADOW_HOST_ID;
    host.style.display = "none";
    document.documentElement.appendChild(host);
  }

  if (host.shadowRoot) return host.shadowRoot;
  return host.attachShadow({ mode: "open" });
}

/**
 * Injects highlight styles into the Shadow DOM.
 */
function ensureStylesInjected(): void {
  const root = getShadowRoot();
  if (root.getElementById("crypto-xray-styles")) return;

  const style = document.createElement("style");
  style.id = "crypto-xray-styles";
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: rgba(99, 102, 241, 0.15);
      border-bottom: 2px solid rgba(99, 102, 241, 0.6);
      border-radius: 2px;
      cursor: pointer;
      padding: 0 2px;
      transition: background-color 0.15s ease;
    }
    .${HIGHLIGHT_CLASS}:hover {
      background: rgba(99, 102, 241, 0.3);
    }
  `;
  root.appendChild(style);
}

/**
 * Builds a regex pattern from a list of terms to match.
 * @param terms - Array of terms to match (case-insensitive)
 * @returns RegExp for matching any of the terms
 */
function buildPattern(terms: string[]): RegExp {
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(^|\\s|[^a-zA-Z0-9])(${escaped.join("|")})(?=\\s|$|[^a-zA-Z0-9])`, "gi");
}

/**
 * Checks if a text node is already highlighted.
 * @param node - The text node to check
 * @returns True if the node's parent is a highlight span
 */
function isAlreadyHighlighted(node: Text): boolean {
  const parent = node.parentElement;
  return (
    parent !== null &&
    parent.classList instanceof DOMTokenList &&
    parent.classList.contains(HIGHLIGHT_CLASS)
  );
}

/**
 * Highlights matching terms in a single text node.
 * @param node - The text node to process
 * @param pattern - Regex pattern for matching terms
 * @returns True if the node was modified
 */
function highlightNode(node: Text, pattern: RegExp): boolean {
  if (isAlreadyHighlighted(node)) return false;

  const text = node.textContent;
  if (!text) return false;

  pattern.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let found = false;

  while ((match = pattern.exec(text)) !== null) {
    found = true;
    const prefix = match[1];
    const term = match[2];
    const termStart = match.index + prefix.length;

    if (termStart > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, termStart)));
    }

    const span = document.createElement("span");
    span.className = HIGHLIGHT_CLASS;
    span.textContent = term;
    span.dataset.token = term.toLowerCase();
    fragment.appendChild(span);

    lastIndex = pattern.lastIndex;
  }

  if (!found) return false;

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.parentNode?.replaceChild(fragment, node);
  return true;
}

/**
 * Highlights all matching terms in a list of text nodes.
 * @param nodes - Array of text nodes to process
 * @param terms - Array of terms to highlight
 * @returns Number of nodes that were modified
 */
export function highlightNodes(nodes: Text[], terms: string[]): number {
  if (terms.length === 0) return 0;

  ensureStylesInjected();
  const pattern = buildPattern(terms);
  let count = 0;

  for (const node of nodes) {
    if (highlightNode(node, pattern)) {
      count++;
    }
  }

  return count;
}

/**
 * Removes all crypto-xray highlights from the document.
 */
export function removeAllHighlights(): void {
  const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  for (const el of highlights) {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ""), el);
      parent.normalize();
    }
  }
}
