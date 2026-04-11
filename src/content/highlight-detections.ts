import { scanDocumentMatches } from "./detector";
import { highlightRanges } from "./highlighter";

/**
 * Highlights detector-approved terms one node at a time so acceptance decisions
 * stay local to the text node that produced them.
 *
 * This preserves the detector's ambiguity handling across a scan batch instead
 * of flattening all detections into one global term list.
 */
export function highlightDetectedTerms(nodes: Text[]): number {
  let highlighted = 0;
  const matchesByNode = new Map<Text, ReturnType<typeof scanDocumentMatches>>();

  for (const match of scanDocumentMatches(nodes)) {
    const nodeMatches = matchesByNode.get(match.node) ?? [];
    nodeMatches.push(match);
    matchesByNode.set(match.node, nodeMatches);
  }

  for (const node of nodes) {
    const matches = matchesByNode.get(node);
    if (!matches?.length) {
      continue;
    }

    if (
      highlightRanges(
        node,
        matches.map((match) => ({
          end: match.end,
          start: match.start,
          text: match.detection.text,
        })),
      )
    ) {
      highlighted++;
    }
  }

  return highlighted;
}
