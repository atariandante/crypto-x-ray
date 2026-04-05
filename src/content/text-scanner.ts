/**
 * DOM text scanner using TreeWalker API with visibility checks.
 * Returns text nodes from visible elements for token detection.
 */

const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "INPUT", "TEXTAREA"]);

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
let scanTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Observes DOM mutations and reports newly added visible text nodes.
 * Debounces rapid changes to avoid excessive scanning on dynamic pages.
 * @param onNewNodes - Callback invoked with newly detected text nodes
 * @param debounceMs - Debounce delay in milliseconds (default: 400)
 * @returns Cleanup function to stop the observer
 */
export function startDynamicPageScanner(
  onNewNodes: (nodes: Text[]) => void,
  debounceMs = 400
): () => void {
  if (observer) return () => {};

  observer = new MutationObserver((mutations) => {
    const newNodes: Text[] = [];

    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;

      for (const added of mutation.addedNodes) {
        const nodes =
          added instanceof Text
            ? added.textContent?.trim() && isNodeVisible(added)
              ? [added]
              : []
            : added instanceof Element
              ? collectVisibleTextNodes(added)
              : [];
        newNodes.push(...nodes);
      }
    }

    if (newNodes.length > 0) {
      if (scanTimeout) clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => onNewNodes(newNodes), debounceMs);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer?.disconnect();
    observer = null;
    if (scanTimeout) clearTimeout(scanTimeout);
  };
}
