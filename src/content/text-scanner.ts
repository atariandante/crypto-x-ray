// DOM text scanner using TreeWalker API with visibility checks
// Returns text nodes from visible elements for token detection

const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "INPUT", "TEXTAREA"]);

function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function isNodeVisible(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const tag = (current as Element).tagName;
      if (IGNORED_TAGS.has(tag)) return false;
      if (
        (el as HTMLElement).isContentEditable ||
        (el as HTMLElement).getAttribute("contenteditable") === "true" ||
        (el as HTMLElement).getAttribute("contenteditable") === ""
      )
        return false;
      if (!isElementVisible(el)) return false;
    }
    current = current.parentNode;
  }
  return true;
}

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
    nodes.push(node as Text);
  }

  return nodes;
}

let observer: MutationObserver | null = null;
let scanTimeout: ReturnType<typeof setTimeout> | null = null;

export function startDynamicPageScanner(
  onNewNodes: (nodes: Text[]) => void,
  debounceMs = 400
): () => void {
  if (observer) return () => {};

  observer = new MutationObserver((mutations) => {
    const newNodes: Text[] = [];

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            if ((node as Text).textContent?.trim() && isNodeVisible(node)) {
              newNodes.push(node as Text);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
              acceptNode(textNode) {
                if (!textNode.textContent?.trim()) return NodeFilter.FILTER_REJECT;
                if (!isNodeVisible(textNode)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              },
            });

            let textNode: Node | null;
            while ((textNode = walker.nextNode())) {
              newNodes.push(textNode as Text);
            }
          }
        }
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
