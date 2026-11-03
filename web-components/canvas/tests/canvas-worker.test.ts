import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { forceGraph3DMockState, resetForceGraph3DMockState } from "./mocks/3d-force-graph";
import { resetForceGraphMockState } from "./mocks/force-graph";
import type { LayoutInput, LayoutOutput } from "../src/force-layout";
import type { CanvasTestElement } from "./test-types";

vi.mock("force-graph", async () => import("./mocks/force-graph"));
vi.mock("3d-force-graph", async () => import("./mocks/3d-force-graph"));
import "../src/canvas";

class LayoutWorkerMock {
  static instances: LayoutWorkerMock[] = [];
  onmessage: ((event: MessageEvent<LayoutOutput>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  messages: LayoutInput[] = [];
  terminated = false;
  constructor() { LayoutWorkerMock.instances.push(this); }
  postMessage(message: LayoutInput) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  get request() {
    const message = this.messages[0];
    if (message.type !== "start") throw new Error("Missing start");
    return message.request;
  }
  complete(done = true) {
    const { request } = this;
    const positions = new Float64Array(request.nodes.length * 6);
    request.nodes.forEach((node, index) => positions.set([index, index + 1, index + 2, 0, 0, 0], index * 6));
    this.onmessage?.(new MessageEvent("message", {
      data: { type: "positions", revision: request.revision, positions, done },
    }));
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: class { observe() {} disconnect() {} }, configurable: true,
  });
  Object.defineProperty(document, "fonts", {
    value: { addEventListener() {}, removeEventListener() {} }, configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  resetForceGraph3DMockState();
  resetForceGraphMockState();
  LayoutWorkerMock.instances = [];
  vi.unstubAllGlobals();
});

async function canvas3D(enabled = true, supported = true) {
  vi.stubGlobal("Worker", supported ? LayoutWorkerMock : undefined);
  const canvas = document.createElement("falkordb-canvas") as CanvasTestElement;
  document.body.appendChild(canvas);
  canvas.setConfig({ simulation: { workerLayout: enabled }, animation: false });
  canvas.setData({
    nodes: Array.from({ length: 1001 }, (_, id) => ({
      id, labels: ["N"], color: "#ff0000", data: {}, visible: true,
    })),
    links: [
      { id: 1, source: 0, target: 1, relationship: "R", color: "#888888", visible: true, data: {} },
      { id: 2, source: 1, target: 2, relationship: "R", color: "#888888", visible: false, data: {} },
    ],
  });
  await canvas.setDimension("3d");
  return canvas;
}

describe("3D worker integration", () => {
  it("disables local warmup, sends only physics data, and fits after worker positions arrive", async () => {
    const canvas = await canvas3D();
    const graph = forceGraph3DMockState.lastInstance!;
    const worker = LayoutWorkerMock.instances.at(-1)!;
    expect(graph.props.get("warmupTicks")).toBe(0);
    expect(graph.props.get("cooldownTicks")).toBe(0);
    expect(worker.request.nodes).toHaveLength(1001);
    expect(worker.request.links).toEqual([{ source: 0, target: 1 }]);
    expect(worker.request.nodes[0]).not.toHaveProperty("data");
    const positionsBefore = graph.callsTo("cameraPosition").length;
    graph.callback("onEngineStop")();
    expect(graph.callsTo("cameraPosition")).toHaveLength(positionsBefore);
    worker.complete();
    expect(canvas.getGraphData().nodes[1]).toMatchObject({ x: 1, y: 2, z: 3 });
    expect(canvas.getData().nodes[1]).not.toHaveProperty("z");
    expect(canvas.getData().nodes[1]).not.toHaveProperty("vz");
    expect(canvas.getData().nodes[1]).not.toHaveProperty("fz");
    expect(graph.callsTo("cameraPosition").length).toBeGreaterThan(positionsBefore);
    expect(worker.terminated).toBe(true);
    canvas.remove();
  });

  it("does not create workers for small force graphs", async () => {
    vi.stubGlobal("Worker", LayoutWorkerMock);
    const canvas = document.createElement("falkordb-canvas") as CanvasTestElement;
    document.body.appendChild(canvas);
    canvas.setData({
      nodes: [{ id: 1, labels: ["N"], color: "#ff0000", data: {}, visible: true }],
      links: [],
    });
    expect(LayoutWorkerMock.instances).toHaveLength(0);
    await canvas.setDimension("3d");
    expect(LayoutWorkerMock.instances).toHaveLength(0);
    expect(forceGraph3DMockState.lastInstance!.props.get("warmupTicks")).toBe(300);
  });

  it("cancels stale work on layout switch, replacement data and teardown", async () => {
    const canvas = await canvas3D();
    const old = LayoutWorkerMock.instances.at(-1)!;
    canvas.setLayout("tree");
    expect(old.terminated).toBe(true);
    const positions = canvas.getGraphData().nodes.map(node => node.x);
    old.complete();
    expect(canvas.getGraphData().nodes.map(node => node.x)).toEqual(positions);
    canvas.setLayout("force");
    const active = LayoutWorkerMock.instances.at(-1)!;
    canvas.setGraphData({ nodes: [], links: [] });
    expect(active.terminated).toBe(true);
    canvas.remove();
  });

  it("pauses worker updates while dragging and resumes from the actual dragged position", async () => {
    const canvas = await canvas3D();
    canvas.setAnimation(true);
    canvas.setPinOnDragEnd(false);
    const graph = forceGraph3DMockState.lastInstance!;
    const worker = LayoutWorkerMock.instances.at(-1)!;
    worker.complete(false);
    const node = canvas.getGraphData().nodes[0];
    node.x = 800;
    graph.callback("onNodeDrag")(node);
    expect(worker.terminated).toBe(true);
    worker.complete();
    expect(node.x).toBe(800);
    graph.callback("onNodeDragEnd")(node);
    const resumed = LayoutWorkerMock.instances.at(-1)!;
    expect(resumed.request.nodes[0].x).toBe(800);
    expect(resumed.request.warmupTicks).toBe(0);
    expect(resumed.request.animate).toBe(true);
  });

  it("can opt out and falls back explicitly after worker failure", async () => {
    const canvas = await canvas3D(false);
    expect(LayoutWorkerMock.instances).toHaveLength(0);
    const graph = forceGraph3DMockState.lastInstance!;
    expect(graph.props.get("warmupTicks")).toBe(300);
    canvas.setConfig({ simulation: { workerLayout: true } });
    canvas.setLayout("force");
    const worker = LayoutWorkerMock.instances.at(-1)!;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    worker.onerror?.(new ErrorEvent("error", { message: "blocked by CSP" }));
    expect(error).toHaveBeenCalledWith(expect.stringContaining("using local physics"), expect.any(Error));
    expect(worker.terminated).toBe(true);
    expect(graph.props.get("warmupTicks")).toBe(300);
    error.mockRestore();
  });

  it("uses the original local path when Worker is unavailable", async () => {
    const canvas = await canvas3D(true, false);
    expect(LayoutWorkerMock.instances).toHaveLength(0);
    expect(forceGraph3DMockState.lastInstance!.props.get("warmupTicks")).toBe(300);
    canvas.remove();
  });

  it.each([false, true])("keeps worker physics unchanged during visual rebuilds, settled: %s", async settled => {
    const canvas = await canvas3D();
    canvas.setAnimation(true);
    const worker = LayoutWorkerMock.instances.at(-1)!;
    worker.complete(settled);
    const count = LayoutWorkerMock.instances.length;
    const messages = worker.messages.length;
    canvas.setBackgroundColor("#123456");
    canvas.setConfig({ nodeStyle: { fontFamily: "Inter" } });
    canvas.setConfig({ interaction: { contrastThreshold: 0.6 } });
    expect(LayoutWorkerMock.instances).toHaveLength(count);
    expect(worker.messages).toHaveLength(messages);
    canvas.remove();
  });

  it("refreshes worker forces after live visibility changes", async () => {
    const canvas = await canvas3D();
    const worker = LayoutWorkerMock.instances.at(-1)!;
    canvas.getGraphData().links[0].visible = false;
    canvas.refresh();
    expect(worker.terminated).toBe(true);
    expect(LayoutWorkerMock.instances.at(-1)!.request.links).toEqual([]);
    canvas.remove();
  });

  it("retains warmup when configuration changes before its first reply", async () => {
    const canvas = await canvas3D();
    const first = LayoutWorkerMock.instances.at(-1)!;
    canvas.setConfig({ simulation: { chargeStrength: -600 } });
    expect(first.terminated).toBe(true);
    const next = LayoutWorkerMock.instances.at(-1)!;
    expect(next.request.warmupTicks).toBe(300);
    expect(next.request.chargeStrength).toBe(-600);
    first.complete();
    next.complete();
    canvas.setConfig({ simulation: { workerLayout: false } });
    expect(forceGraph3DMockState.lastInstance!.props.get("warmupTicks")).toBe(300);
  });

  it.each([false, true])("pins every node and cancels worker updates, after reply: %s", async replied => {
    const canvas = await canvas3D();
    const worker = LayoutWorkerMock.instances.at(-1)!;
    if (replied) worker.complete(false);
    const nodes = canvas.getGraphData().nodes;
    const before = nodes.map(node => ({ x: node.x, y: node.y, z: (node as typeof node & { z?: number }).z }));
    canvas.setPinOnDragEnd(true);
    expect(worker.terminated).toBe(true);
    for (const node of canvas.getData().nodes) {
      expect(node).not.toHaveProperty("z");
      expect(node).not.toHaveProperty("vz");
      expect(node).not.toHaveProperty("fz");
    }
    nodes.forEach((node, index) => {
      expect(node.fx).toBe(before[index].x ?? 0);
      expect(node.fy).toBe(before[index].y ?? 0);
      expect((node as typeof node & { fz?: number }).fz).toBe(before[index].z ?? 0);
    });
    worker.complete();
    expect(nodes.map(node => ({ x: node.x, y: node.y, z: (node as typeof node & { z?: number }).z }))).toEqual(before.map(node => ({ x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 })));
    canvas.setPinOnDragEnd(false);
    const resumed = LayoutWorkerMock.instances.at(-1)!;
    expect(resumed).not.toBe(worker);
    expect(resumed.request.nodes.every(node => node.fx === undefined && node.fy === undefined && node.fz === undefined)).toBe(true);
    canvas.remove();
  });
});
