import { scanDocument } from "./detector";
import { highlightNodes } from "./highlighter";

/**
 * Highlights detector-approved terms one node at a time so acceptance decisions
 * stay local to the text node that produced them.
 *
 * This preserves the detector's ambiguity handling across a scan batch instead
 * of flattening all detections into one global term list.
 */
export function highlightDetectedTerms(nodes: Text[]): number {
  let highlighted = 0;

  for (const node of nodes) {
    const detections = scanDocument([node]);
    const terms = [...new Set(detections.map((detection) => detection.text))];

    if (terms.length === 0) {
      continue;
    }

    highlighted += highlightNodes([node], terms);
  }

  return highlighted;
}
