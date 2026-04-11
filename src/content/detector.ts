/**
 * Scans candidate text nodes for crypto entities.
 * The placeholder return value preserves the detector contract while the real
 * DOM scanning pipeline is still under construction.
 *
 * @param textNodes - Explicit text nodes supplied by the caller so tests can
 *   exercise detection without implicit DOM traversal.
 */
export function scanDocument(textNodes: Text[]) {
  return [];
}
