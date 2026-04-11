/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getVisibleTextNodes,
  startDynamicPageScanner,
  type DynamicScanEvent,
} from "./text-scanner";

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("returns a cleanup function", () => {
    const callback = vi.fn();
    const stop = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });
    expect(typeof stop).toBe("function");
    stop();
  });

  it("does not call callback after cleanup", () => {
    const callback = vi.fn();
    const stop = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });
    stop();

    const text = createText("After cleanup");
    document.body.appendChild(text);
    vi.advanceTimersByTime(150);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not start duplicate observers", () => {
    const callback = vi.fn();
    const stop1 = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });
    const stop2 = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });

    expect(stop1).not.toBe(stop2);
    expect(stop2()).toBeUndefined();

    stop1();
  });

  it("emits incremental scans for newly added visible nodes", async () => {
    const callback = vi.fn<[DynamicScanEvent], void>();
    const stop = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });

    document.body.appendChild(createText("Dynamic $SOL node"));
    await Promise.resolve();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledWith({
      type: "incremental",
      nodes: [expect.any(Text)],
    });
    const event = callback.mock.calls[0]?.[0];
    expect(event?.type).toBe("incremental");
    if (event?.type === "incremental") {
      expect(event.nodes[0]?.textContent).toBe("Dynamic $SOL node");
    }

    stop();
  });

  it("deduplicates rapid mutations for the same text node", async () => {
    const callback = vi.fn<[DynamicScanEvent], void>();
    const stop = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });
    const wrapper = document.createElement("div");
    const text = createText("Repeated $ETH node");
    wrapper.appendChild(text);
    document.body.appendChild(wrapper);
    await Promise.resolve();

    wrapper.removeChild(text);
    wrapper.appendChild(text);
    await Promise.resolve();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(1);
    const event = callback.mock.calls[0]?.[0];
    expect(event?.type).toBe("incremental");
    if (event?.type === "incremental") {
      expect(event.nodes).toHaveLength(1);
    }

    stop();
  });

  it("skips already highlighted nodes during mutation scans", async () => {
    const callback = vi.fn<[DynamicScanEvent], void>();
    const stop = startDynamicPageScanner(callback, { debounceMs: 100, throttleMs: 100 });
    const span = document.createElement("span");
    span.className = "crypto-xray-highlight";
    span.appendChild(createText("$BTC"));
    document.body.appendChild(span);

    await Promise.resolve();
    vi.advanceTimersByTime(100);

    expect(callback).not.toHaveBeenCalled();

    stop();
  });

  it("throttles dynamic scans to at most one dispatch per throttle window", async () => {
    const callback = vi.fn<[DynamicScanEvent], void>();
    const stop = startDynamicPageScanner(callback, { debounceMs: 50, throttleMs: 500 });

    document.body.appendChild(createText("First node"));
    await Promise.resolve();
    vi.advanceTimersByTime(50);

    document.body.appendChild(createText("Second node"));
    await Promise.resolve();
    vi.advanceTimersByTime(50);

    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(450);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1]?.[0]?.type).toBe("incremental");

    stop();
  });

  it("requests a full re-scan when history navigation changes the URL", async () => {
    const callback = vi.fn<[DynamicScanEvent], void>();
    const stop = startDynamicPageScanner(callback, { debounceMs: 50, throttleMs: 100 });

    history.pushState({}, "", "/next-page");
    await Promise.resolve();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledWith({ type: "full" });

    stop();
  });

  it("requests a full re-scan on popstate", async () => {
    const callback = vi.fn<[DynamicScanEvent], void>();
    const stop = startDynamicPageScanner(callback, { debounceMs: 50, throttleMs: 100 });

    window.dispatchEvent(new PopStateEvent("popstate"));
    await Promise.resolve();
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledWith({ type: "full" });

    stop();
  });
});
