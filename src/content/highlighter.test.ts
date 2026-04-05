/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { highlightNodes, removeAllHighlights } from "./highlighter";

describe("highlightNodes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("wraps matching terms in highlight spans", () => {
    const text = document.createTextNode("I love $SOL and $ETH");
    document.body.appendChild(text);

    const count = highlightNodes([text], ["$SOL", "$ETH"]);

    expect(count).toBe(1);
    expect(document.body.innerHTML).toContain("crypto-xray-highlight");
    expect(document.body.querySelectorAll(".crypto-xray-highlight")).toHaveLength(2);
  });

  it("applies inline styles to highlight spans", () => {
    const text = document.createTextNode("$BTC");
    document.body.appendChild(text);

    highlightNodes([text], ["$BTC"]);

    const span = document.querySelector(".crypto-xray-highlight") as HTMLSpanElement;
    expect(span).not.toBeNull();
    expect(span?.style.background).toContain("rgba");
    expect(span?.style.borderBottom).toContain("2px");
  });

  it("ignores already highlighted nodes", () => {
    const span = document.createElement("span");
    span.className = "crypto-xray-highlight";
    span.textContent = "$SOL";
    document.body.appendChild(span);

    const text = document.createTextNode("$SOL");
    span.appendChild(text);

    const count = highlightNodes([text], ["$SOL"]);
    expect(count).toBe(0);
  });

  it("returns 0 for empty terms array", () => {
    const text = document.createTextNode("Hello world");
    document.body.appendChild(text);

    const count = highlightNodes([text], []);
    expect(count).toBe(0);
  });

  it("handles special regex characters in terms", () => {
    const text = document.createTextNode("Address: 0x1234abcd");
    document.body.appendChild(text);

    const count = highlightNodes([text], ["0x1234abcd"]);
    expect(count).toBe(1);
    expect(document.body.querySelectorAll(".crypto-xray-highlight")).toHaveLength(1);
  });
});

describe("removeAllHighlights", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("removes all highlight spans and restores text", () => {
    const text = document.createTextNode("$SOL is great");
    document.body.appendChild(text);

    highlightNodes([text], ["$SOL"]);
    expect(document.body.querySelectorAll(".crypto-xray-highlight")).toHaveLength(1);

    removeAllHighlights();
    expect(document.body.querySelectorAll(".crypto-xray-highlight")).toHaveLength(0);
    expect(document.body.textContent).toBe("$SOL is great");
  });
});
