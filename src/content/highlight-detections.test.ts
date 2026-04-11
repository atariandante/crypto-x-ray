/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { highlightDetectedTerms } from "./highlight-detections";
import { highlightNodes } from "./highlighter";

vi.mock("./highlighter", () => ({
  highlightNodes: vi.fn(),
}));

const mockedHighlightNodes = vi.mocked(highlightNodes);

describe("highlightDetectedTerms", () => {
  afterEach(() => {
    mockedHighlightNodes.mockReset();
  });

  it("keeps ambiguous detections local to the node that produced them", () => {
    const acceptedNode = document.createTextNode(
      "Rain token holders tracked the protocol after the exchange listing.",
    );
    const ordinaryNode = document.createTextNode("Rain fell all afternoon on the city.");
    mockedHighlightNodes.mockReturnValue(1);

    const highlighted = highlightDetectedTerms([acceptedNode, ordinaryNode]);

    expect(mockedHighlightNodes).toHaveBeenCalledTimes(1);
    expect(mockedHighlightNodes).toHaveBeenCalledWith([acceptedNode], ["Rain"]);
    expect(highlighted).toBe(1);

    expect(mockedHighlightNodes.mock.calls[0]).not.toEqual([[acceptedNode, ordinaryNode], ["Rain"]]);
  });
});
