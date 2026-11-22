import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  forceGraphMockState,
  resetForceGraphMockState,
} from "./mocks/force-graph";

vi.mock("force-graph", async () => import("./mocks/force-graph"));

import "../src/canvas";
import type { CanvasTestElement } from "./test-types";

type CanvasElement = CanvasTestElement;

function createCtxSpy() {
  const spy = {
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    setLineDash: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    rect: vi.fn(),
    clearRect: vi.fn(),
    getLineDash: vi.fn(() => []),
    measureText: vi.fn(() => ({
      width: 10,
      actualBoundingBoxAscent: 2,
      actualBoundingBoxDescent: 1,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 10,
    })),
    canvas: { width: 800, height: 600 },
    lineWidth: 1,
    strokeStyle: "#000",
    fillStyle: "#000",
    font: "12px sans-serif",
    textAlign: "center" as CanvasTextAlign,
    textBaseline: "middle" as CanvasTextBaseline,
    globalAlpha: 1,
  };
  return spy as typeof spy & CanvasRenderingContext2D;
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverMock, configurable: true });
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    configurable: true,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getBoundingClientRect", {
    value: () => ({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }),
    configurable: true,
  });
});

function createCanvas(): CanvasElement {
  const canvas = document.createElement("falkordb-canvas") as CanvasElement;
  document.body.appendChild(canvas);
  return canvas;
}

function getLastInstance() {
  return forceGraphMockState.lastInstance!;
}

function setupInstanceDimensions(instance: ReturnType<typeof getLastInstance>, w = 800, h = 600) {
  (instance as any).width = (value?: number) => {
    if (value === undefined) return w;
    return instance;
  };
  (instance as any).height = (value?: number) => {
    if (value === undefined) return h;
    return instance;
  };
}

describe("node rendering", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetForceGraphMockState();
  });

  it("draws a circle for each visible node", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: "test" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 100;
    node.y = 100;

    // Trigger onZoom to set culling bounds so node is visible
    instance.callbacks.onZoom?.({ k: 1, x: 100, y: 100 });

    const ctx = createCtxSpy();
    const painter = instance.callbacks.nodeCanvasObject!;
    painter(node, ctx);

    // Should draw a circle (arc call)
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("draws a square for a node with shape 'square'", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", shape: "square", data: { name: "test" } }],
      links: [],
    });

    const instance = getLastInstance();
    const node = canvas.getGraphData().nodes[0];
    node.x = 100;
    node.y = 100;
    instance.callbacks.onZoom?.({ k: 1, x: 100, y: 100 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    expect(ctx.rect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();

    // The square is the circle's bounding box: side = 2 × radius.
    const [x, y, width, height] = ctx.rect.mock.calls.at(-1)!;
    expect(width).toBe(node.size * 2);
    expect(height).toBe(width);
    expect(x).toBe(node.x! - node.size);
    expect(y).toBe(node.y! - node.size);
  });

  it("applies node color as fill style", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#ff5733", data: { name: "test" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // fillStyle should be set to the node color at some point
    // We check that fill was called (the color is set via ctx.fillStyle assignment)
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("renders text inside node using textFillRatio", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      captionsKeys: [["name", true]],
      twoD: { largeGraph: { lowZoomThreshold: 0.5 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: "Alice" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // Text should be rendered
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("fits the full inside caption regardless of the fixed font size in auto-size mode", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: [["name", true]],
      twoD: { largeGraph: { enabled: false } },
    });
    const caption = "A long caption that should not be truncated";
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: caption } }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;
    node.size = 10;

    const draw = () => {
      const ctx = createCtxSpy();
      ctx.measureText.mockImplementation((text: string) => {
        const size = Number.parseFloat(ctx.font.split(" ")[1]);
        const width = text.length * size * 0.6;
        return {
          width,
          actualBoundingBoxAscent: size * 0.7,
          actualBoundingBoxDescent: size * 0.2,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: width,
        };
      });
      getLastInstance().callbacks.nodeCanvasObject!(node, ctx);
      return ctx;
    };

    const first = draw();
    expect(first.fillText).toHaveBeenCalledExactlyOnceWith(caption, 0, expect.any(Number));
    const fittedFont = first.font;
    const fittedSize = Number.parseFloat(fittedFont.split(" ")[1]);
    const diagonal = Math.hypot(caption.length * fittedSize * 0.6, fittedSize * 0.9);
    expect(diagonal).toBeCloseTo(2 * 0.85 * 9);
    canvas.setConfig({ twoD: { nodeStyle: { fontSize: 12 } } });
    const second = draw();
    expect(second.fillText).toHaveBeenCalledExactlyOnceWith(caption, 0, expect.any(Number));
    expect(second.font).toBe(fittedFont);
  });

  it("does not render an auto-sized inside caption when the usable radius is non-positive", () => {
    const canvas = createCanvas();
    canvas.setConfig({ twoD: { largeGraph: { enabled: false } } });
    canvas.setData({
      nodes: [{ id: 1, labels: [], visible: true, color: "#f00", size: 0.5, data: {} }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;
    const ctx = createCtxSpy();
    getLastInstance().callbacks.nodeCanvasObject!(node, ctx);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("caches a fixed-size caption that cannot fit and retries when its font changes", () => {
    let selected = false;
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: ["name"],
      isNodeSelected: () => selected,
      twoD: { largeGraph: { enabled: false }, nodeStyle: { textFillRatio: 0, fontSize: 6 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: [], visible: true, color: "#f00", size: 2, data: { name: "abc" } }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;
    const ctx = createCtxSpy();
    ctx.measureText.mockImplementation((text: string) => {
      const small = ctx.font.startsWith("700 ");
      const width = text.length * (small ? 0.4 : 4);
      return {
        width,
        actualBoundingBoxAscent: text ? (small ? 0.2 : 3) : 0,
        actualBoundingBoxDescent: text ? (small ? 0.2 : 2) : 0,
        actualBoundingBoxLeft: width / 2,
        actualBoundingBoxRight: width / 2,
      };
    });
    const draw = () => getLastInstance().callbacks.nodeCanvasObject!(node, ctx);

    draw();
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.measureText).toHaveBeenCalled();
    ctx.measureText.mockClear();
    draw();
    expect(ctx.measureText).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();

    selected = true;
    draw();
    expect(ctx.fillText).toHaveBeenCalledWith("abc", 0, 0);
    selected = false;
    ctx.fillText.mockClear();
    draw();
    expect(ctx.fillText).not.toHaveBeenCalled();
    canvas.setConfig({ twoD: { nodeStyle: { textFillRatio: 0.85 } } });
    draw();
    expect(ctx.fillText).toHaveBeenCalledWith("abc", 0, expect.any(Number));
  });

  it("keeps both fixed-size caption lines inside the usable circular radius", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: ["name"],
      twoD: { largeGraph: { enabled: false }, nodeStyle: { textFillRatio: 0, fontSize: 6 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: [], visible: true, color: "#f00", size: 9, data: { name: "abcd efgh ijkl" } }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;
    const ctx = createCtxSpy();
    ctx.measureText.mockImplementation((text: string) => {
      const width = text.length * 2;
      return {
        width,
        actualBoundingBoxAscent: 3,
        actualBoundingBoxDescent: 2,
        actualBoundingBoxLeft: width / 2,
        actualBoundingBoxRight: width / 2,
      };
    });
    getLastInstance().callbacks.nodeCanvasObject!(node, ctx);
    expect(ctx.fillText).toHaveBeenCalledTimes(2);
    for (const [text, x, y] of ctx.fillText.mock.calls) {
      const halfWidth = String(text).length;
      expect(x).toBe(0);
      expect(Math.hypot(halfWidth, Math.max(Math.abs(y - 3), Math.abs(y + 2)))).toBeLessThanOrEqual(8);
    }
  });

  it("re-wraps fixed-size captions when selection changes the font weight", () => {
    let selected = false;
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: ["name"],
      isNodeSelected: () => selected,
      twoD: { largeGraph: { enabled: false }, nodeStyle: { textFillRatio: 0, fontSize: 6 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: [], visible: true, color: "#f00", size: 9, data: { name: "abcd efgh ijkl" } }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;
    const ctx = createCtxSpy();
    ctx.measureText.mockImplementation((text: string) => {
      const width = text.length * (ctx.font.startsWith("700 ") ? 3 : 2);
      return {
        width,
        actualBoundingBoxAscent: 3,
        actualBoundingBoxDescent: 2,
        actualBoundingBoxLeft: width / 2,
        actualBoundingBoxRight: width / 2,
      };
    });
    const draw = () => getLastInstance().callbacks.nodeCanvasObject!(node, ctx);
    draw();
    ctx.fillText.mockClear();
    selected = true;
    draw();
    expect(ctx.fillText).toHaveBeenCalled();
    for (const [text, x, y] of ctx.fillText.mock.calls) {
      const halfWidth = String(text).length * 1.5;
      expect(x).toBe(0);
      expect(Math.hypot(halfWidth, Math.max(Math.abs(y - 3), Math.abs(y + 2)))).toBeLessThanOrEqual(8);
    }
  });

  it("uses a truncated single line when two fixed-size lines cannot fit", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: ["name"],
      twoD: { largeGraph: { enabled: false }, nodeStyle: { textFillRatio: 0, fontSize: 6 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: [], visible: true, color: "#f00", size: 7, data: { name: "abcdefghijk" } }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;
    const ctx = createCtxSpy();
    ctx.measureText.mockImplementation((text: string) => ({
      width: text.length * 2,
      actualBoundingBoxAscent: 3,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: text.length,
      actualBoundingBoxRight: text.length,
    }));
    getLastInstance().callbacks.nodeCanvasObject!(node, ctx);
    expect(ctx.fillText).toHaveBeenCalledExactlyOnceWith("ab...", 0, 0.5);
  });

  it("renders text with fixed fontSize when textFillRatio is 0", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      twoD: {
        nodeStyle: { textFillRatio: 0, fontSize: 3 },
        largeGraph: { lowZoomThreshold: 0.5 },
      },
      captionsKeys: [["name", true]],
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: "Bob" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    ctx.measureText.mockImplementation((text: string) => ({
      width: text.length * 2,
      actualBoundingBoxAscent: 2,
      actualBoundingBoxDescent: 1,
      actualBoundingBoxLeft: text.length,
      actualBoundingBoxRight: text.length,
    }));
    instance.callbacks.nodeCanvasObject!(node, ctx);

    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("moves a 2D caption below a node and back inside without replacing the graph", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: [["name", true]],
      foregroundColor: "#345678",
      twoD: { largeGraph: { enabled: false } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: "Alice" } }],
      links: [],
    });
    const instance = getLastInstance();
    const node = canvas.getGraphData().nodes[0];
    node.x = 12;
    node.y = 25;

    const draw = () => {
      const ctx = createCtxSpy();
      instance.callbacks.nodeCanvasObject!(node, ctx);
      return ctx;
    };

    const inside = draw();
    expect(inside.fillText).toHaveBeenCalledExactlyOnceWith("Alice", 12, 25.5);

    canvas.setConfig({ twoD: { nodeStyle: { captionPosition: "below" } } });
    const below = draw();
    expect(below.fillText).toHaveBeenCalledExactlyOnceWith("Alice", 12, expect.any(Number));
    expect(below.fillText.mock.calls[0][2]).toBeGreaterThan(25 + node.size);
    expect(below.textBaseline).toBe("top");
    expect(below.fillStyle).toBe("#345678");
    expect(below.font).toBe("400 6px SofiaSans");

    canvas.setConfig({ twoD: { nodeStyle: { captionPosition: "inside" } } });
    expect(draw().fillText.mock.calls).toEqual(inside.fillText.mock.calls);
    expect(canvas.getGraphData().nodes[0]).toBe(node);
  });

  it.each([
    ["above", 12, 11.5, "center", "bottom"],
    ["below", 12, 38.5, "center", "top"],
    ["left", -1.5, 25, "right", "middle"],
    ["right", 25.5, 25, "left", "middle"],
  ] as const)("places a 2D caption %s the node with the configured gap and size", (side, x, y, align, baseline) => {
    const canvas = createCanvas();
    canvas.setConfig({
      captionsKeys: [["name", true]],
      twoD: { largeGraph: { enabled: false }, nodeStyle: { captionPosition: side, captionGap: 3, fontSize: 5 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: "Alice" } }],
      links: [],
    });
    const node = canvas.getGraphData().nodes[0];
    node.x = 12;
    node.y = 25;
    node.size = 10;

    const ctx = createCtxSpy();
    getLastInstance().callbacks.nodeCanvasObject!(node, ctx);
    expect(ctx.fillText).toHaveBeenCalledExactlyOnceWith("Alice", x, y);
    expect(ctx.textAlign).toBe(align);
    expect(ctx.textBaseline).toBe(baseline);
    expect(ctx.font).toBe("400 5px SofiaSans");

    canvas.setConfig({ twoD: { nodeStyle: { captionGap: 0, fontSize: 3 } } });
    const updated = createCtxSpy();
    getLastInstance().callbacks.nodeCanvasObject!(node, updated);
    expect(updated.font).toBe("400 3px SofiaSans");
    const [updatedX, updatedY] = updated.fillText.mock.calls[0].slice(1);
    expect(Math.abs(updatedX - 12) + Math.abs(updatedY - 25)).toBe(10.5);
  });

  it.each([-1, NaN, Infinity])("rejects invalid caption gap %s", (captionGap) => {
    const canvas = createCanvas();
    expect(() => canvas.setConfig({ twoD: { nodeStyle: { captionGap } } })).toThrow(RangeError);
  });

  it("applies glow effect when node has glow style", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      twoD: { nodeStyle: { glowSpread: 5, glowColor: [255, 0, 0] } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {} }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // Glow renders extra arc calls (outer glow circle)
    expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("applies stroke to selected nodes", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      twoD: { nodeStyle: { strokeWidthSelected: 1.5 } },
      isNodeSelected: () => true,
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {} }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // Selected node should have stroke
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("skips rendering for nodes outside culling bounds (large graph mode)", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      twoD: { largeGraph: { lowZoomThreshold: 0.5, viewportPadding: 10 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {} }],
      links: [],
    });

    const instance = getLastInstance();
    setupInstanceDimensions(instance);
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    // Place node far outside viewport
    node.x = 9999;
    node.y = 9999;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // Node outside bounds should not draw arc
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("resolves caption from captionsKeys with fuzzy match", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      captionsKeys: [["Name", false]], // non-exact match (case-insensitive includes)
      twoD: { largeGraph: { lowZoomThreshold: 0.5 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { displayName: "Hello" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // displayName key contains "Name" (case-insensitive) so it should match
    expect(ctx.fillText).toHaveBeenCalled();
    const textArg = ctx.fillText.mock.calls[0]?.[0];
    expect(textArg).toContain("Hello");
  });

  it("resolves caption from a bare-string captionsKeys entry", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      captionsKeys: ["Name"], // bare string → fuzzy, case-insensitive match
      twoD: { largeGraph: { lowZoomThreshold: 0.5 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { displayName: "Hello" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    expect(ctx.fillText).toHaveBeenCalled();
    const textArg = ctx.fillText.mock.calls[0]?.[0];
    expect(textArg).toContain("Hello");
  });

  it("falls back to node ID if no caption key matches", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      captionsKeys: [["nonexistent", true]],
      twoD: { largeGraph: { lowZoomThreshold: 0.5 } },
    });
    canvas.setData({
      nodes: [{ id: 42, labels: ["A"], visible: true, color: "#f00", data: { x: "y" } }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // Should still render something — likely the node id
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("renders expand indicator for nodes with expand[0]=true", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {}, expand: true }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;
    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    // Should draw extra elements for expand indicator
    expect(ctx.beginPath.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("node label caching", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetForceGraphMockState();
  });

  function paintRepeatedly(frames: number) {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      captionsKeys: [["name", true]],
      twoD: { largeGraph: { lowZoomThreshold: 0.5 } },
    });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: { name: "test", title: "other" } }],
      links: [],
    });

    const instance = getLastInstance();
    const node = canvas.getGraphData().nodes[0];
    node.x = 100;
    node.y = 100;
    instance.callbacks.onZoom?.({ k: 1, x: 100, y: 100 });

    const contexts = Array.from({ length: frames }, () => createCtxSpy());
    contexts.forEach((ctx) => instance.callbacks.nodeCanvasObject!(node, ctx));

    return { canvas, contexts };
  }

  it("measures a node's label once, not once per frame", () => {
    const { contexts } = paintRepeatedly(3);
    const [first, ...rest] = contexts;

    expect(first.measureText).toHaveBeenCalled();
    rest.forEach((ctx) => expect(ctx.measureText).not.toHaveBeenCalled());
  });

  it("keeps the label in the same place across frames", () => {
    const { contexts } = paintRepeatedly(3);
    const positions = contexts.map((ctx) => ctx.fillText.mock.calls);

    positions.forEach((calls) => expect(calls).toEqual(positions[0]));
    expect(positions[0].length).toBeGreaterThan(0);
  });

  it("re-measures after the caption keys change", () => {
    const { canvas, contexts } = paintRepeatedly(2);
    const instance = getLastInstance();
    const node = canvas.getGraphData().nodes[0];

    expect(contexts[1].measureText).not.toHaveBeenCalled();

    canvas.setConfig({ captionsKeys: [["title", true]] });

    const ctx = createCtxSpy();
    instance.callbacks.nodeCanvasObject!(node, ctx);

    expect(ctx.measureText).toHaveBeenCalled();
    expect(ctx.fillText.mock.calls[0]?.[0]).toBe("other");
  });
});

describe("link rendering", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetForceGraphMockState();
  });

  it.each([
    { curve: 0, loop: false, selected: false },
    { curve: 0.5, loop: false, selected: false },
    { curve: 0.5, loop: false, selected: true },
    { curve: 0.5, loop: true, selected: false },
    { curve: 0.5, loop: true, selected: true },
  ])("ends the 2D stroke behind its arrow tip: %o", ({ curve, loop, selected }) => {
    const canvas = createCanvas();
    canvas.setConfig({ twoD: { largeGraph: { lowZoomThreshold: 0 } }, isLinkSelected: () => selected });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["A"], visible: true, color: "#f00", data: {} },
      ],
      links: [{ id: 1, relationship: "", source: 1, target: loop ? 1 : 2, visible: true, color: "#888", data: {} }],
    });
    const link = canvas.getGraphData().links[0];
    Object.assign(link.source, { x: 0, y: 0 });
    if (!loop) Object.assign(link.target, { x: 500, y: 0 });
    link.curve2D = curve;
    const ctx = createCtxSpy();
    getLastInstance().callbacks.linkCanvasObject!(link, ctx, 2);
    const stroke = loop ? ctx.bezierCurveTo.mock.calls[0] : ctx.quadraticCurveTo.mock.calls[0];
    const [x, y] = stroke.slice(-2) as number[];
    const [tipX, tipY] = ctx.moveTo.mock.calls.at(-1)! as number[];
    const [backX, backY] = ctx.lineTo.mock.calls.at(-2)! as number[];
    const dx = tipX - backX;
    const dy = tipY - backY;
    const back = Math.hypot(dx, dy);
    const behind = ((tipX - x) * dx + (tipY - y) * dy) / back;
    expect(behind).toBeGreaterThan(back * 0.8);
    if (!curve) expect(behind).toBeCloseTo(back);
  });

  it("draws a straight line for simple link", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "REL", source: 1, target: 2, visible: true, color: "#888", data: {} },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const link = graphData.links[0];
    link.source.x = -50;
    link.source.y = 0;
    link.target.x = 50;
    link.target.y = 0;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(link, ctx, 1);

    // Should call moveTo/lineTo or bezierCurveTo for straight/curved link
    const drawCalls = ctx.moveTo.mock.calls.length + ctx.bezierCurveTo.mock.calls.length + ctx.quadraticCurveTo.mock.calls.length;
    expect(drawCalls).toBeGreaterThan(0);
  });

  it("draws curved links for parallel edges", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "R1", source: 1, target: 2, visible: true, color: "#888", data: {} },
        { id: 2, relationship: "R2", source: 1, target: 2, visible: true, color: "#888", data: {} },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    // Parallel links should have different curve values
    expect(graphData.links[0].curve2D).not.toBe(graphData.links[1].curve2D);

    // Position nodes
    graphData.links[0].source.x = -50;
    graphData.links[0].source.y = 0;
    graphData.links[0].target.x = 50;
    graphData.links[0].target.y = 0;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[1], ctx, 1);

    // Curved link should use bezierCurveTo or quadraticCurveTo
    const curveCalls = ctx.bezierCurveTo.mock.calls.length + ctx.quadraticCurveTo.mock.calls.length;
    expect(curveCalls).toBeGreaterThan(0);
  });

  it("draws self-loop links", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {} }],
      links: [{ id: 1, relationship: "SELF", source: 1, target: 1, visible: true, color: "#888", data: {} }],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const link = graphData.links[0];
    link.source.x = 0;
    link.source.y = 0;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(link, ctx, 1);

    // Self-loop should draw something (arc or bezier)
    const drawCalls = ctx.arc.mock.calls.length + ctx.bezierCurveTo.mock.calls.length + ctx.quadraticCurveTo.mock.calls.length;
    expect(drawCalls).toBeGreaterThan(0);
  });

  it("renders link label", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600, twoD: { largeGraph: { lowZoomThreshold: 0.5 } } });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "KNOWS", source: 1, target: 2, visible: true, color: "#888", data: {} },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    graphData.links[0].source.x = -50;
    graphData.links[0].source.y = 0;
    graphData.links[0].target.x = 50;
    graphData.links[0].target.y = 0;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[0], ctx, 1);

    // Should render the relationship label as text
    expect(ctx.fillText).toHaveBeenCalled();
    const textArgs = ctx.fillText.mock.calls.map((c: any[]) => c[0]);
    expect(textArgs.some((t: string) => t.includes("KNOWS"))).toBe(true);
  });

  it("skips rendering links outside culling bounds (large graph mode)", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      twoD: { largeGraph: { lowZoomThreshold: 2, viewportPadding: 10 } },
    });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "R", source: 1, target: 2, visible: true, color: "#888", data: {} },
      ],
    });

    const instance = getLastInstance();
    setupInstanceDimensions(instance);
    const graphData = canvas.getGraphData();
    const link = graphData.links[0];
    // Place both endpoints far outside viewport
    link.source.x = 9999;
    link.source.y = 9999;
    link.target.x = 9998;
    link.target.y = 9998;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(link, ctx, 1);

    // Link outside bounds should not draw
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.bezierCurveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });

  it("applies dash pattern to dashed links", () => {
    const canvas = createCanvas();
    canvas.setConfig({
      width: 800,
      height: 600,
      twoD: { linkLineDash: () => [5, 3] },
    });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "R", source: 1, target: 2, visible: true, color: "#888", data: {} },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    graphData.links[0].source.x = -50;
    graphData.links[0].source.y = 0;
    graphData.links[0].target.x = 50;
    graphData.links[0].target.y = 0;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const ctx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[0], ctx, 1);

    expect(ctx.setLineDash).toHaveBeenCalled();
  });

  it("uses the configured link text size while preserving per-link overrides", () => {
    const canvas = createCanvas();
    canvas.setConfig({ twoD: { largeGraph: { enabled: false } } });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "DEFAULT", source: 1, target: 2, visible: true, color: "#888", data: {} },
        { id: 2, relationship: "OVERRIDE", source: 1, target: 2, visible: true, color: "#888", fontSize: 13, data: {} },
      ],
    });
    const links = canvas.getGraphData().links;
    links[0].source.x = 0;
    links[0].source.y = 0;
    links[0].target.x = 100;
    links[0].target.y = 0;
    const paint = (index: number) => {
      const ctx = createCtxSpy();
      getLastInstance().callbacks.linkCanvasObject!(links[index], ctx, 1);
      return ctx.font;
    };
    expect(paint(0)).toContain("6px");
    canvas.setConfig({ linkStyle: { fontSize: 9 } });
    expect(paint(0)).toContain("9px");
    expect(paint(1)).toContain("13px");
    canvas.setConfig({ linkStyle: { fontSize: 4 } });
    expect(paint(0)).toContain("4px");
  });

  it("uses per-link width, fontSize and arrowSize overrides", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
        { id: 3, labels: ["C"], visible: true, color: "#00f", data: {} },
      ],
      links: [
        { id: 1, relationship: "PLAIN", source: 1, target: 2, visible: true, color: "#888", data: {} },
        {
          id: 2,
          relationship: "BIG",
          source: 1,
          target: 3,
          visible: true,
          color: "#888",
          width: 5,
          fontSize: 20,
          arrowSize: 40,
          data: {},
        },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    graphData.nodes.forEach((node, i) => {
      node.x = i === 0 ? -50 : 50;
      node.y = i === 2 ? 40 : 0;
    });

    // Above largeGraph.lowZoomThreshold (1), where arrowheads are skipped.
    instance.callbacks.onZoom?.({ k: 2, x: 0, y: 0 });

    const plainCtx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[0], plainCtx, 1);
    const plainArrowPoints = plainCtx.lineTo.mock.calls.length;

    const bigCtx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[1], bigCtx, 1);

    // width override drives ctx.lineWidth (divided by globalScale = 1 here)
    expect(bigCtx.lineWidth).toBeGreaterThan(plainCtx.lineWidth);
    expect(bigCtx.lineWidth).toBe(5);

    // fontSize override drives the label font
    expect(bigCtx.font).toContain("20px");

    // arrowSize override makes the arrowhead geometry larger
    expect(plainArrowPoints).toBeGreaterThan(0);
    const arrowSpread = (calls: [number, number][]) => {
      const xs = calls.map(([x]) => x);
      const ys = calls.map(([, y]) => y);
      return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
    };
    expect(arrowSpread(bigCtx.lineTo.mock.calls as [number, number][]))
      .toBeGreaterThan(arrowSpread(plainCtx.lineTo.mock.calls as [number, number][]));
  });

  it("doubles the width and arrow size of a selected link", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "R", source: 1, target: 2, visible: true, color: "#888", width: 3, data: {} },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    graphData.links[0].source.x = -50;
    graphData.links[0].source.y = 0;
    graphData.links[0].target.x = 50;
    graphData.links[0].target.y = 0;

    instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

    const unselectedCtx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[0], unselectedCtx, 1);
    expect(unselectedCtx.lineWidth).toBe(3);

    canvas.setConfig({ isLinkSelected: () => true });
    const selectedCtx = createCtxSpy();
    instance.callbacks.linkCanvasObject!(graphData.links[0], selectedCtx, 1);
    expect(selectedCtx.lineWidth).toBe(6);
  });

  it("clips a diagonal link at the square outline of its target", () => {
    // A square reaches out to radius × √2 towards its corners, so a link
    // arriving diagonally has to stop that much further from the centre.
    const drawDiagonalLink = (shape?: "square") => {
      const canvas = createCanvas();
      canvas.setConfig({ width: 800, height: 600 });
      canvas.setData({
        nodes: [
          { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
          { id: 2, labels: ["B"], visible: true, color: "#0f0", shape, data: {} },
        ],
        links: [{ id: 1, relationship: "R", source: 1, target: 2, visible: true, color: "#888", data: {} }],
      });

      const instance = getLastInstance();
      const link = canvas.getGraphData().links[0];
      link.source.x = 0;
      link.source.y = 0;
      link.target.x = 100;
      link.target.y = 100;

      instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

      const ctx = createCtxSpy();
      instance.callbacks.linkCanvasObject!(link, ctx, 1);

      const [, , endX, endY] = ctx.quadraticCurveTo.mock.calls.at(-1)!;
      return Math.hypot(endX - link.target.x!, endY - link.target.y!);
    };

    const circleGap = drawDiagonalLink();
    const squareGap = drawDiagonalLink("square");

    expect(squareGap / circleGap).toBeCloseTo(Math.SQRT2, 2);
  });

  it("clips a self-loop at the square outline of its node", () => {
    const drawSelfLoop = (shape?: "square") => {
      const canvas = createCanvas();
      canvas.setConfig({ width: 800, height: 600 });
      canvas.setData({
        nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", shape, data: {} }],
        links: [{ id: 1, relationship: "SELF", source: 1, target: 1, visible: true, color: "#888", data: {} }],
      });

      const instance = getLastInstance();
      const link = canvas.getGraphData().links[0];
      link.source.x = 0;
      link.source.y = 0;

      instance.callbacks.onZoom?.({ k: 1, x: 0, y: 0 });

      const ctx = createCtxSpy();
      instance.callbacks.linkCanvasObject!(link, ctx, 1);

      const [, , , , endX, endY] = ctx.bezierCurveTo.mock.calls.at(-1)!;
      return Math.hypot(endX - link.source.x!, endY - link.source.y!);
    };

    // The loop leaves the node off-axis, so a square pushes its tip further out
    // than a circle of the same radius — but by less than the √2 corner factor.
    expect(drawSelfLoop("square")).toBeGreaterThan(drawSelfLoop());
  });
});

describe("nodePointerAreaPaint", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetForceGraphMockState();
  });

  it("paints pointer area as filled circle with given color", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {} }],
      links: [],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const node = graphData.nodes[0];
    node.x = 0;
    node.y = 0;

    const ctx = createCtxSpy();
    const areaPainter = instance.callbacks.nodePointerAreaPaint!;
    areaPainter(node, "#00ff00", ctx);

    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("resolves a scrambled pointer pixel to the node under it", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [{ id: 1, labels: ["A"], visible: true, color: "#f00", data: {} }],
      links: [],
    });

    const instance = getLastInstance();
    const node = canvas.getGraphData().nodes[0];
    node.x = 0;
    node.y = 0;

    // Fingerprinting protection nudges the colour the hidden canvas reads back.
    const shadowCtx = Object.assign(createCtxSpy(), {
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0xff, 1, 255]) })),
      // force-graph centres the graph, so graph point (0, 0) is device pixel (400, 300).
      getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 400, f: 300 }) as DOMMatrix),
    });
    const scratch = Object.assign(createCtxSpy(), {
      setTransform: vi.fn(),
      isPointInPath: vi.fn(() => true),
      isPointInStroke: vi.fn(() => false),
    });
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(scratch as unknown as RenderingContext);

    let pixel: number[];
    try {
      instance.callbacks.nodePointerAreaPaint!(node, "#00ff00", shadowCtx);
      pixel = Array.from(shadowCtx.getImageData(400, 300, 1, 1).data);
    } finally {
      // Restore even when the paint or read throws, so later tests get the real getContext.
      getContext.mockRestore();
    }

    expect(pixel).toEqual([0, 0xff, 0, 255]);
    // The scratch canvas re-traced the node's real hit area.
    expect(scratch.arc).toHaveBeenCalled();
  });
});

describe("linkPointerAreaPaint", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    resetForceGraphMockState();
  });

  it("paints link pointer area with given color", () => {
    const canvas = createCanvas();
    canvas.setConfig({ width: 800, height: 600 });
    canvas.setData({
      nodes: [
        { id: 1, labels: ["A"], visible: true, color: "#f00", data: {} },
        { id: 2, labels: ["B"], visible: true, color: "#0f0", data: {} },
      ],
      links: [
        { id: 1, relationship: "R", source: 1, target: 2, visible: true, color: "#888", data: {} },
      ],
    });

    const instance = getLastInstance();
    const graphData = canvas.getGraphData();
    const link = graphData.links[0];
    link.source.x = -50;
    link.source.y = 0;
    link.target.x = 50;
    link.target.y = 0;

    const ctx = createCtxSpy();
    const areaPainter = instance.callbacks.linkPointerAreaPaint!;
    areaPainter(link, "#00ff00", ctx);

    // Should paint the hit area along the link path
    expect(ctx.stroke).toHaveBeenCalled();
  });
});
