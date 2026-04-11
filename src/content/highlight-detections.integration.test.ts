/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { highlightDetectedTerms } from "./highlight-detections";
import { removeAllHighlights } from "./highlighter";

describe("highlightDetectedTerms integration", () => {
  afterEach(() => {
    removeAllHighlights();
    document.body.innerHTML = "";
  });

  it("does not re-highlight rejected ambiguous matches later in the same node", () => {
    const text = document.createTextNode("Rain token rallied. Hours later, rain hit the city.");
    document.body.appendChild(text);

    const highlighted = highlightDetectedTerms([text]);
    const spans = [...document.querySelectorAll(".crypto-xray-highlight")];

    expect(highlighted).toBe(1);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.textContent).toBe("Rain");
    expect(document.body.textContent).toBe("Rain token rallied. Hours later, rain hit the city.");
  });

  it("keeps accepted ambiguous highlights scoped to the node that produced them", () => {
    const acceptedNode = document.createTextNode(
      "Rain token holders tracked the protocol after the exchange listing.",
    );
    const ordinaryNode = document.createTextNode("Rain fell all afternoon on the city.");
    document.body.append(acceptedNode, ordinaryNode);

    const highlighted = highlightDetectedTerms([acceptedNode, ordinaryNode]);
    const spans = [...document.querySelectorAll(".crypto-xray-highlight")];

    expect(highlighted).toBe(1);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.textContent).toBe("Rain");
    expect(document.body.textContent).toBe(
      "Rain token holders tracked the protocol after the exchange listing.Rain fell all afternoon on the city.",
    );
  });

  it("preserves longer detector-approved names during highlighting", () => {
    const text = document.createTextNode("Bitcoin rallied, but Bitcoin Cash fell.");
    document.body.appendChild(text);

    const highlighted = highlightDetectedTerms([text]);
    const spans = [...document.querySelectorAll(".crypto-xray-highlight")];

    expect(highlighted).toBe(1);
    expect(spans.map((span) => span.textContent)).toEqual(["Bitcoin", "Bitcoin Cash"]);
    expect(document.body.textContent).toBe("Bitcoin rallied, but Bitcoin Cash fell.");
  });
});
