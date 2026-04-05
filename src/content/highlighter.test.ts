/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { highlightNodes, removeAllHighlights } from "./highlighter";

describe("highlightNodes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    const style = document.getElementById("crypto-xray-highlight-styles");
    if (style) style.remove();
  });

  it("wraps matching terms in highlight spans", () => {
    const text = document.createTextNode("I love $SOL and $ETH");
    document.body.appendChild(text);

    const count = highlightNodes([text], ["$SOL", "$ETH"]);

    expect(count).toBe(1);
    expect(document.body.innerHTML).toContain("crypto-xray-highlight");
    expect(document.body.querySelectorAll(".crypto-xray-highlight")).toHaveLength(2);
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

  it("injects styles into document head", () => {
    const text = document.createTextNode("$BTC");
    document.body.appendChild(text);

    highlightNodes([text], ["$BTC"]);

    const style = document.getElementById("crypto-xray-highlight-styles");
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("crypto-xray-highlight");
  });
});

describe("removeAllHighlights", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    const style = document.getElementById("crypto-xray-highlight-styles");
    if (style) style.remove();
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
