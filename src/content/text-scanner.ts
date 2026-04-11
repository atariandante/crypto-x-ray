/**
 * DOM text scanner using TreeWalker API with visibility checks.
 * Returns text nodes from visible elements for token detection.
 */

const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "INPUT", "TEXTAREA"]);
const HIGHLIGHT_CLASS = "crypto-xray-highlight";

export interface DynamicScannerOptions {
  debounceMs?: number;
  throttleMs?: number;
}

export type DynamicScanEvent = { type: "full" } | { nodes: Text[]; type: "incremental" };

/**
 * Checks if an element is visible on the page.
 * @param el - The element to check
 * @returns True if the element is visible, false otherwise
 */
function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

/**
 * Checks if a node and all its ancestors are visible and not in ignored elements.
 * @param node - The node to check
 * @returns True if the node is visible, false otherwise
 */
function isNodeVisible(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current instanceof Element) {
      if (IGNORED_TAGS.has(current.tagName)) return false;
      if (isContentEditable(current)) return false;
      if (!isElementVisible(current)) return false;
    }
    current = current.parentNode;
  }
  return true;
}

/**
 * Checks if an element is contenteditable.
 * @param el - The element to check
 * @returns True if the element is contenteditable
 */
function isContentEditable(el: Element): boolean {
  const attr = el.getAttribute("contenteditable");
  if (attr === "true" || attr === "") return true;
  return "isContentEditable" in el && el.isContentEditable === true;
}

/**
 * Checks whether a text node already lives inside one of our highlight spans.
 * Re-scanning those nodes causes duplicate wrapping on dynamic pages.
 */
function isHighlightedTextNode(node: Text): boolean {
  return node.parentElement?.classList.contains(HIGHLIGHT_CLASS) ?? false;
}

/**
 * Traverses the DOM and returns all visible text nodes with non-whitespace content.
 * Ignores script, style, noscript, input, textarea, and contenteditable elements.
 * @param root - The root node to start scanning from (defaults to document.body)
 * @returns Array of visible Text nodes
 */
export function getVisibleTextNodes(root: Node = document.body): Text[] {
  if (!root) return [];

  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (!isNodeVisible(node)) return NodeFilter.FILTER_REJECT;
      if (node instanceof Text && isHighlightedTextNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof Text) {
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * Collects visible text nodes from a subtree using TreeWalker.
 * @param root - The root node to scan
 * @returns Array of visible Text nodes
 */
function collectVisibleTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (!isNodeVisible(node)) return NodeFilter.FILTER_REJECT;
      if (node instanceof Text && isHighlightedTextNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof Text) {
      nodes.push(node);
    }
  }

  return nodes;
}

let observer: MutationObserver | null = null;
let scheduleTimeout: ReturnType<typeof setTimeout> | null = null;
let patchedHistory = false;
let restorePushState: History["pushState"] | null = null;
let restoreReplaceState: History["replaceState"] | null = null;
let lastDispatchTime = 0;
let pendingFullScan = false;
let pendingNodes = new Set<Text>();
let processedNodes = new WeakSet<Text>();

function resetPendingState(): void {
  pendingFullScan = false;
  pendingNodes = new Set<Text>();
}

/**
 * Emits either a full re-scan request or the currently queued incremental nodes.
 */
function dispatchScheduledScan(onScan: (event: DynamicScanEvent) => void): void {
  scheduleTimeout = null;
  lastDispatchTime = Date.now();

  if (pendingFullScan) {
    resetPendingState();
    processedNodes = new WeakSet<Text>();
    onScan({ type: "full" });
    return;
  }

  const nodes = [...pendingNodes];
  resetPendingState();

  if (nodes.length === 0) {
    return;
  }

  for (const node of nodes) {
    processedNodes.add(node);
  }

  onScan({ type: "incremental", nodes });
}

/**
 * Schedules a scanner callback while respecting debounce and throttle windows.
 */
function scheduleScan(
  onScan: (event: DynamicScanEvent) => void,
  debounceMs: number,
  throttleMs: number,
  prioritizeFullScan = false
): void {
  if (scheduleTimeout) {
    clearTimeout(scheduleTimeout);
  }

  const throttleDelay = Math.max(0, throttleMs - (Date.now() - lastDispatchTime));
  const debounceDelay = prioritizeFullScan ? 0 : debounceMs;
  const delay = Math.max(throttleDelay, debounceDelay);
  scheduleTimeout = setTimeout(() => dispatchScheduledScan(onScan), delay);
}

/**
 * Adds new text nodes into the current incremental scan batch.
 */
function queueIncrementalNodes(
  nodes: Text[],
  onScan: (event: DynamicScanEvent) => void,
  debounceMs: number,
  throttleMs: number
): void {
  for (const node of nodes) {
    if (processedNodes.has(node) || pendingNodes.has(node) || isHighlightedTextNode(node)) {
      continue;
    }

    pendingNodes.add(node);
  }

  if (pendingNodes.size > 0) {
    scheduleScan(onScan, debounceMs, throttleMs);
  }
}

/**
 * Requests a throttled full re-scan, upgrading any queued incremental work.
 */
function queueFullScan(
  onScan: (event: DynamicScanEvent) => void,
  debounceMs: number,
  throttleMs: number
): void {
  pendingFullScan = true;
  pendingNodes.clear();
  scheduleScan(onScan, debounceMs, throttleMs, true);
}

/**
 * Installs history listeners so SPA navigation can trigger a full re-scan.
 */
function patchHistory(
  onScan: (event: DynamicScanEvent) => void,
  debounceMs: number,
  throttleMs: number
): void {
  if (patchedHistory) {
    return;
  }

  restorePushState = history.pushState.bind(history);
  restoreReplaceState = history.replaceState.bind(history);

  history.pushState = function pushState(...args) {
    restorePushState?.(...args);
    queueFullScan(onScan, debounceMs, throttleMs);
  };

  history.replaceState = function replaceState(...args) {
    restoreReplaceState?.(...args);
    queueFullScan(onScan, debounceMs, throttleMs);
  };

  window.addEventListener("popstate", handlePopState);
  patchedHistory = true;
}

function unpatchHistory(): void {
  if (!patchedHistory) {
    return;
  }

  if (restorePushState) {
    history.pushState = restorePushState;
  }

  if (restoreReplaceState) {
    history.replaceState = restoreReplaceState;
  }

  restorePushState = null;
  restoreReplaceState = null;
  window.removeEventListener("popstate", handlePopState);
  patchedHistory = false;
}

let currentPopstateHandler: (() => void) | null = null;

function handlePopState(): void {
  currentPopstateHandler?.();
}

/**
 * Observes DOM mutations and reports newly added visible text nodes.
 * Debounces rapid changes to avoid excessive scanning on dynamic pages.
 * @param onNewNodes - Callback invoked with newly detected text nodes
 * @param debounceMs - Debounce delay in milliseconds (default: 400)
 * @returns Cleanup function to stop the observer
 */
export function startDynamicPageScanner(
  onScan: (event: DynamicScanEvent) => void,
  options: DynamicScannerOptions = {}
): () => void {
  if (observer) return () => {};

  const debounceMs = options.debounceMs ?? 400;
  const throttleMs = options.throttleMs ?? 500;
  lastDispatchTime = Date.now() - throttleMs;
  resetPendingState();
  processedNodes = new WeakSet<Text>();
  currentPopstateHandler = () => queueFullScan(onScan, debounceMs, throttleMs);

  observer = new MutationObserver((mutations) => {
    const newNodes: Text[] = [];

    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;

      for (const added of mutation.addedNodes) {
        const nodes =
          added instanceof Text
            ? added.textContent?.trim() && isNodeVisible(added)
              ? isHighlightedTextNode(added)
                ? []
                : [added]
              : []
            : added instanceof Element
              ? collectVisibleTextNodes(added)
              : [];
        newNodes.push(...nodes);
      }
    }

    queueIncrementalNodes(newNodes, onScan, debounceMs, throttleMs);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  patchHistory(onScan, debounceMs, throttleMs);

  return () => {
    observer?.disconnect();
    observer = null;
    if (scheduleTimeout) clearTimeout(scheduleTimeout);
    scheduleTimeout = null;
    currentPopstateHandler = null;
    unpatchHistory();
    resetPendingState();
  };
}
