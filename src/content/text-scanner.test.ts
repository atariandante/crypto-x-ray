/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getVisibleTextNodes, startDynamicPageScanner } from "./text-scanner";

function createMockElement(
  tag: string,
  styles: Record<string, string> = {},
  children: Node[] = []
): HTMLElement {
  const el = document.createElement(tag);
  Object.entries(styles).forEach(([prop, value]) => {
    el.style.setProperty(prop, value);
  });
  children.forEach((child) => el.appendChild(child));
  return el;
}

function createText(content: string): Text {
  return document.createTextNode(content);
}

describe("getVisibleTextNodes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns text nodes from visible elements", () => {
    const text = createText("Hello $SOL world");
    document.body.appendChild(text);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe("Hello $SOL world");
  });

  it("ignores script tags", () => {
    const script = document.createElement("script");
    script.textContent = "const token = 'SOL';";
    document.body.appendChild(script);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores style tags", () => {
    const style = document.createElement("style");
    style.textContent = ".token { color: red; }";
    document.body.appendChild(style);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores noscript tags", () => {
    const noscript = document.createElement("noscript");
    noscript.textContent = "Enable JavaScript";
    document.body.appendChild(noscript);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores input fields", () => {
    const input = document.createElement("input");
    input.value = "0x1234567890abcdef";
    document.body.appendChild(input);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores textarea fields", () => {
    const textarea = document.createElement("textarea");
    textarea.textContent = "Paste your wallet here";
    document.body.appendChild(textarea);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores contenteditable elements", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    div.textContent = "Editing $ETH price";
    document.body.appendChild(div);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores elements with display: none", () => {
    const hidden = createMockElement("div", { display: "none" }, [createText("Hidden $BTC")]);
    document.body.appendChild(hidden);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores elements with visibility: hidden", () => {
    const hidden = createMockElement("div", { visibility: "hidden" }, [createText("Hidden $ADA")]);
    document.body.appendChild(hidden);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores nested hidden elements", () => {
    const parent = createMockElement("div", {}, [
      createMockElement("div", { display: "none" }, [createText("Nested hidden $DOT")]),
    ]);
    document.body.appendChild(parent);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("ignores empty text nodes", () => {
    const empty = createText("   ");
    const whitespace = createText("\n\t");
    document.body.appendChild(empty);
    document.body.appendChild(whitespace);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(0);
  });

  it("returns multiple text nodes from visible elements", () => {
    const div = createMockElement("div", {}, [
      createText("$BTC is up"),
      createMockElement("span", {}, [createText("$ETH is down")]),
    ]);
    document.body.appendChild(div);

    const nodes = getVisibleTextNodes();
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.textContent)).toContain("$BTC is up");
    expect(nodes.map((n) => n.textContent)).toContain("$ETH is down");
  });

  it("scans a custom root element", () => {
    const root = createMockElement("div", {}, [createText("Root text")]);
    const outside = createText("Outside text");
    document.body.appendChild(root);
    document.body.appendChild(outside);

    const nodes = getVisibleTextNodes(root);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].textContent).toBe("Root text");
  });

  it("handles null root gracefully", () => {
    const nodes = getVisibleTextNodes(null as unknown as Node);
    expect(nodes).toHaveLength(0);
  });
});

describe("startDynamicPageScanner", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns a cleanup function", () => {
    const callback = vi.fn();
    const stop = startDynamicPageScanner(callback, 100);
    expect(typeof stop).toBe("function");
    stop();
  });

  it("does not call callback after cleanup", () => {
    const callback = vi.fn();
    const stop = startDynamicPageScanner(callback, 100);
    stop();

    const text = createText("After cleanup");
    document.body.appendChild(text);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not start duplicate observers", () => {
    const callback = vi.fn();
    const stop1 = startDynamicPageScanner(callback, 100);
    const stop2 = startDynamicPageScanner(callback, 100);

    expect(stop1).not.toBe(stop2);
    expect(stop2()).toBeUndefined();

    stop1();
  });
});
