import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  forceGraphMockState,
  resetForceGraphMockState,
} from "./mocks/force-graph";
import {
  forceGraph3DMockState,
  resetForceGraph3DMockState,
  type MockForceGraph3DInstance,
} from "./mocks/3d-force-graph";

vi.mock("force-graph", async () => import("./mocks/force-graph"));
vi.mock("3d-force-graph", async () => import("./mocks/3d-force-graph"));

import { BoxGeometry, Group, Object3D, Sprite, type BufferGeometry, type Mesh, type MeshLambertMaterial, type SpriteMaterial } from "three";
import "../src/canvas";
import type { CanvasTestElement, GraphNode, GraphLink } from "./test-types";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock,
    configurable: true,
  });

  Object.defineProperty(document, "fonts", {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  resetForceGraphMockState();
  resetForceGraph3DMockState();
});

const DATA = {
  nodes: [
    { id: 1, labels: ["A"], visible: true, color: "#ff0000", data: { name: "n1" } },
    { id: 2, labels: ["B"], visible: true, color: "#00ff00", data: { name: "n2" } },
  ],
  links: [
    { id: 10, relationship: "REL", source: 1, target: 2, visible: true, color: "#888888", data: {} },
  ],
};

function createCanvas(): CanvasTestElement {
  const canvas = document.createElement("falkordb-canvas") as CanvasTestElement;
  document.body.appendChild(canvas);
  return canvas;
}

function last3D(): MockForceGraph3DInstance {
  return forceGraph3DMockState.lastInstance!;
}

async function canvasIn3D(): Promise<CanvasTestElement> {
  const canvas = createCanvas();
  canvas.setData(DATA);
  await canvas.setDimension("3d");
  return canvas;
}

describe("dimension", () => {
  it("defaults to 2D without loading the 3D renderer", () => {
    const canvas = createCanvas();
    canvas.setData(DATA);

    expect(canvas.getDimension()).toBe("2d");
    expect(forceGraphMockState.instances).toHaveLength(1);
    expect(forceGraph3DMockState.instances).toHaveLength(0);
  });

  it("swaps the 2D renderer for a 3D one with the same data", async () => {
    const onDimensionChange = vi.fn();
    const canvas = createCanvas();
    canvas.setConfig({ eventHandlers: { onDimensionChange } });
    canvas.setData(DATA);
    const graph2D = forceGraphMockState.lastInstance!;

    await canvas.setDimension("3d");

    expect(canvas.getDimension()).toBe("3d");
    expect(graph2D.destroyed).toBe(true);
    expect(forceGraph3DMockState.instances).toHaveLength(1);
    expect(canvas.getGraph()).toBeUndefined();
    expect(onDimensionChange).toHaveBeenCalledWith("3d");

    const shown = last3D().data.nodes as GraphNode[];
    expect(shown.map((n) => n.id)).toEqual([1, 2]);
    // 2D positions would flatten the 3D layout, so it starts from scratch.
    expect(shown.every((n) => n.x === undefined && n.fx === undefined)).toBe(true);

    // Only the 3D canvas is left in the shadow DOM.
    expect(canvas.shadowRoot!.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("switches back to a fresh 2D renderer and drops depth", async () => {
    const canvas = await canvasIn3D();
    const graph3D = last3D();
    for (const node of canvas.getGraphData().nodes as Array<GraphNode & { z?: number }>) node.z = 5;

    await canvas.setDimension("2d");

    expect(graph3D.destroyed).toBe(true);
    expect(forceGraphMockState.instances).toHaveLength(2);
    expect(canvas.getGraph()).toBe(forceGraphMockState.lastInstance);
    const nodes = canvas.getGraphData().nodes as Array<GraphNode & { z?: number }>;
    expect(nodes.every((n) => n.z === undefined)).toBe(true);
  });

  it("does nothing when asked for the dimension already shown", async () => {
    const onDimensionChange = vi.fn();
    const canvas = createCanvas();
    canvas.setConfig({ eventHandlers: { onDimensionChange } });
    canvas.setData(DATA);

    await canvas.setDimension("2d");

    expect(forceGraphMockState.instances).toHaveLength(1);
    expect(onDimensionChange).not.toHaveBeenCalled();
  });

  it("drops a 3D switch overtaken by a switch back to 2D", async () => {
    const canvas = createCanvas();
    canvas.setData(DATA);

    const toThree = canvas.setDimension("3d");
    const toTwo = canvas.setDimension("2d");
    await Promise.all([toThree, toTwo]);

    expect(canvas.getDimension()).toBe("2d");
    expect(forceGraph3DMockState.instances).toHaveLength(0);
    expect(forceGraphMockState.lastInstance!.destroyed).toBe(false);
  });

  it("can be chosen through setConfig", async () => {
    const onDimensionChange = vi.fn();
    const canvas = createCanvas();
    canvas.setData(DATA);

    canvas.setConfig({ dimension: "3d", eventHandlers: { onDimensionChange } });
    await vi.waitFor(() => expect(onDimensionChange).toHaveBeenCalledWith("3d"));

    expect(forceGraph3DMockState.instances).toHaveLength(1);
  });

  it("falls back to 2D when the 3D view cannot start", async () => {
    const canvas = createCanvas();
    canvas.setData(DATA);
    forceGraph3DMockState.failNext = true;

    const onDimensionChange = vi.fn();
    canvas.setConfig({ eventHandlers: { onDimensionChange } });

    await expect(canvas.setDimension("3d")).rejects.toThrow("WebGL");
    expect(onDimensionChange).toHaveBeenCalledWith("2d");

    // The 2D view was already taken down; a fresh one is put back.
    expect(canvas.getDimension()).toBe("2d");
    expect(canvas.getGraph()).toBe(forceGraphMockState.lastInstance);
    expect(forceGraphMockState.instances).toHaveLength(2);
  });

  it("falls back to a 2D view when a first render into 3D cannot start", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    forceGraph3DMockState.failNext = true;
    const canvas = document.createElement("falkordb-canvas") as CanvasTestElement;
    await canvas.setDimension("3d");

    document.body.appendChild(canvas);

    await vi.waitFor(() => expect(canvas.getGraph()).toBeDefined());
    expect(canvas.getDimension()).toBe("2d");
  });

  it("mounts a fresh 3D view when a 3D canvas is moved in the page", async () => {
    const canvas = await canvasIn3D();
    const first = last3D();

    canvas.remove();
    document.body.appendChild(canvas);

    await vi.waitFor(() => expect(forceGraph3DMockState.instances).toHaveLength(2));
    expect(first.destroyed).toBe(true);
    expect(last3D()).not.toBe(first);
    // The old full-height container is gone, so the new view is not pushed below it.
    expect(canvas.shadowRoot!.children).toHaveLength(2);
    expect(canvas.shadowRoot!.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("still reports the viewport it was left at once disconnected", () => {
    const canvas = createCanvas();
    canvas.setData(DATA);
    canvas.setViewport({ zoom: 2.5, centerX: 10, centerY: -4 });

    // Hosts save the view while unmounting, after the element has left the page.
    canvas.remove();

    expect(canvas.getViewport()).toEqual({ zoom: 2.5, centerX: 10, centerY: -4 });
    // Each read is its own snapshot.
    canvas.getViewport()!.zoom = 99;
    expect(canvas.getViewport()!.zoom).toBe(2.5);

    // Back on the page, it reports the live view again.
    document.body.appendChild(canvas);
    expect(canvas.getViewport()).toEqual({ zoom: forceGraphMockState.lastInstance!.zoomValue, centerX: 0, centerY: 0 });
  });

  it("reports no viewport once disconnected from 3D", async () => {
    const canvas = await canvasIn3D();

    canvas.remove();

    expect(canvas.getViewport()).toBeUndefined();
  });

  it("renders a 2D canvas moved in the page afresh, in one container", () => {
    const canvas = createCanvas();
    canvas.setData(DATA);
    const first = forceGraphMockState.lastInstance!;

    canvas.remove();
    document.body.appendChild(canvas);

    expect(first.destroyed).toBe(true);
    expect(canvas.getGraph()).not.toBe(first);
    expect(canvas.shadowRoot!.children).toHaveLength(2);
  });

  it("mounts in 3D when chosen before the element is connected", async () => {
    const canvas = document.createElement("falkordb-canvas") as CanvasTestElement;
    await canvas.setDimension("3d");
    expect(forceGraph3DMockState.instances).toHaveLength(0);

    document.body.appendChild(canvas);
    await vi.waitFor(() => expect(forceGraph3DMockState.instances).toHaveLength(1));
    expect(forceGraphMockState.instances).toHaveLength(0);
  });
});

describe("3D rendering", () => {
  it("spaces linked nodes by their sizes plus the configured link distance", async () => {
    const canvas = await canvasIn3D();
    canvas.setConfig({ layoutOptions: { force: { linkDistance: 30 } } });

    const distance = last3D().linkForce.distanceAccessor as (link: GraphLink) => number;
    const link = canvas.getGraphData().links[0];

    expect(distance(link)).toBe(link.source.size + link.target.size + 60);
  });

  it("hands new data to the 3D renderer instead of creating a 2D one", async () => {
    const canvas = await canvasIn3D();

    canvas.setData({ nodes: [DATA.nodes[0]], links: [] });

    expect(forceGraphMockState.instances).toHaveLength(1);
    expect((last3D().data.nodes as GraphNode[]).map((n) => n.id)).toEqual([1]);
  });

  it("keeps the positions of nodes that stay on an incremental update", async () => {
    const canvas = await canvasIn3D();
    const kept = canvas.getGraphData().nodes[0] as GraphNode & { z?: number };
    Object.assign(kept, { x: 1, y: 2, z: 3 });

    canvas.setGraphData({
      nodes: [...DATA.nodes, { id: 3, labels: ["C"], visible: true, color: "#0000ff", data: {} }],
      links: DATA.links,
    });

    const shown = last3D().data.nodes as Array<GraphNode & { z?: number }>;
    expect(shown).toHaveLength(3);
    expect(shown.find((n) => n.id === 1)).toMatchObject({ x: 1, y: 2, z: 3 });
  });

  it("levels a tree along its direction's axis", async () => {
    const canvas = await canvasIn3D();

    canvas.setLayoutOptions({ tree: { direction: "lr" } });
    canvas.setLayout("tree");
    expect(last3D().props.get("dagMode")).toBe("lr");

    canvas.setLayout("force");
    expect(last3D().props.get("dagMode")).toBeNull();
  });

  it("lays the radial rings out along a cone, pinned", async () => {
    const canvas = createCanvas();
    canvas.setData({
      nodes: [1, 2, 3, 4].map((id) => ({ id, labels: ["A"], visible: true, color: "#ff0000", data: {} })),
      links: [
        { id: 10, relationship: "R", source: 1, target: 2, visible: true, color: "#888888", data: {} },
        { id: 11, relationship: "R", source: 1, target: 3, visible: true, color: "#888888", data: {} },
        { id: 12, relationship: "R", source: 2, target: 4, visible: true, color: "#888888", data: {} },
      ],
    });
    await canvas.setDimension("3d");

    canvas.setLayout("radial");

    expect(last3D().props.get("dagMode")).toBeNull();
    const nodes = canvas.getGraphData().nodes as Array<GraphNode & { z?: number; fz?: number }>;
    const ring = (id: number) => Math.hypot(nodes.find((n) => n.id === id)!.x!, nodes.find((n) => n.id === id)!.y!);
    const depth = (id: number) => nodes.find((n) => n.id === id)!.z!;

    // The root is the cone's tip; each level is a wider ring further back.
    expect(ring(1)).toBeCloseTo(0);
    expect(depth(1)).toBeCloseTo(0);
    expect(ring(4)).toBeGreaterThan(ring(2));
    expect(depth(4)).toBeLessThan(depth(2));
    expect(depth(2)).toBeLessThan(0);
    // Every node sits on the same cone.
    for (const id of [2, 3, 4]) expect(-depth(id) / ring(id)).toBeCloseTo(0.6);
    // Pinned, so the simulation leaves the cone alone.
    for (const n of nodes) expect([n.fx, n.fy, n.fz]).toEqual([n.x, n.y, n.z]);
  });

  it("settles the layout up front unless animation is on", async () => {
    const canvas = await canvasIn3D();
    expect(last3D().props.get("cooldownTicks")).toBe(0);
    expect(last3D().props.get("warmupTicks")).toBeGreaterThan(0);

    canvas.setAnimation(true);
    expect(last3D().props.get("cooldownTicks")).toBe(Infinity);

    canvas.setPinOnDragEnd(true);
    expect(last3D().props.get("cooldownTicks")).toBe(0);
  });

  it("restyles in place on config changes rather than recreating objects", async () => {
    const canvas = await canvasIn3D();
    const factorySets = last3D().callsTo("nodeThreeObject").length;
    const widthSets = last3D().callsTo("linkWidth").length;

    canvas.setConfig({ dimmed: true, isNodeDimmed: () => true, isLinkDimmed: () => true });

    expect(last3D().callsTo("nodeThreeObject")).toHaveLength(factorySets);
    expect(last3D().callsTo("linkWidth")).toHaveLength(widthSets);

    // A dimmed link is blended towards the background.
    const linkColor = last3D().props.get("linkColor") as (link: GraphLink) => string;
    const link = canvas.getGraphData().links[0];
    expect(linkColor(link)).not.toBe(link.color);
  });

  it("re-sets link widths only when the link selection changes", async () => {
    const canvas = await canvasIn3D();
    const widthSets = last3D().callsTo("linkWidth").length;

    canvas.setConfig({ isLinkSelected: (link) => link.id === 10 });
    expect(last3D().callsTo("linkWidth")).toHaveLength(widthSets + 1);

    canvas.setConfig({ isLinkSelected: (link) => link.id === 10 });
    expect(last3D().callsTo("linkWidth")).toHaveLength(widthSets + 1);

    const linkWidth = last3D().props.get("linkWidth") as (link: GraphLink) => number;
    expect(linkWidth(canvas.getGraphData().links[0])).toBeGreaterThan(0);
  });

  it("forwards pointer events to the configured handlers", async () => {
    const onNodeClick = vi.fn();
    const onBackgroundClick = vi.fn();
    const canvas = await canvasIn3D();
    canvas.setConfig({ eventHandlers: { onNodeClick, onBackgroundClick } });

    const node = canvas.getGraphData().nodes[0];
    const event = new MouseEvent("click");
    last3D().callback("onNodeClick")(node, event);
    last3D().callback("onBackgroundClick")(event);

    expect(onNodeClick).toHaveBeenCalledWith(node, event);
    expect(onBackgroundClick).toHaveBeenCalledWith(event);
  });

  it("pins a dragged node in place when pinning is on", async () => {
    const onNodeDragEnd = vi.fn();
    const canvas = await canvasIn3D();
    canvas.setConfig({ eventHandlers: { onNodeDragEnd } });
    canvas.setPinOnDragEnd(true);

    const node = canvas.getGraphData().nodes[0] as GraphNode & { z?: number; fz?: number };
    Object.assign(node, { x: 4, y: 5, z: 6 });
    last3D().callback("onNodeDragEnd")(node, { x: 0, y: 0, z: 0 });

    expect(node).toMatchObject({ fx: 4, fy: 5, fz: 6 });
    expect(onNodeDragEnd).toHaveBeenCalledWith(node);
  });

  it("expresses camera distance as a zoom factor", async () => {
    const canvas = await canvasIn3D();

    canvas.zoom(2);
    const zoomed = canvas.getZoom();
    expect(zoomed).toBeCloseTo(2);

    canvas.zoom(zoomed * 0.5);
    expect(canvas.getZoom()).toBeCloseTo(1);
  });

  it("moves what the camera looks at on centerAt, keeping its distance", async () => {
    const canvas = await canvasIn3D();
    const before = canvas.getZoom();

    canvas.centerAt(30, 40);

    expect(last3D().controlsState.target).toEqual({ x: 30, y: 40, z: 0 });
    expect(canvas.getZoom()).toBeCloseTo(before);
  });

  it("frames the visible nodes on zoomToFit, from their positions", async () => {
    const canvas = await canvasIn3D();
    last3D().callback("onEngineStop")();
    last3D().width(900);
    last3D().height(600);
    const [a, b] = canvas.getGraphData().nodes as Array<GraphNode & { z?: number }>;
    Object.assign(a, { x: -100, y: 0, z: 0 });
    Object.assign(b, { x: 100, y: 0, z: 0 });

    canvas.zoomToFit();

    expect(last3D().controlsState.target).toEqual({ x: 0, y: 0, z: 0 });
    const camera = last3D().cameraPos;
    const distance = Math.hypot(camera.x, camera.y, camera.z);
    // Far enough back for both nodes to be in view, not just their middle.
    expect(distance).toBeGreaterThan(100 / Math.tan((20 * Math.PI) / 180));

    // A hidden node is left out of the frame.
    b.visible = false;
    canvas.zoomToFit();
    expect(last3D().controlsState.target).toEqual({ x: -100, y: 0, z: 0 });
  });

  it("frames a new layout only once the library has applied it", async () => {
    const canvas = await canvasIn3D();
    const fits = () => last3D().callsTo("cameraPosition").length;
    canvas.getGraphData().nodes.forEach((node, i) => Object.assign(node, { x: i * 50, y: 0, z: 0 }));
    last3D().callback("onEngineStop")();
    const before = fits();

    // Before the engine reports, positions are still the starting cluster.
    canvas.setLayout("force");
    canvas.zoomToFit();
    expect(fits()).toBe(before);

    last3D().callback("onEngineTick")();
    expect(fits()).toBe(before + 1);

    // Later ticks are the simulation running, not a new layout.
    last3D().callback("onEngineTick")();
    expect(fits()).toBe(before + 1);
  });

  it("keeps a deferred fit's zoom multiplier, capped at zoomToFitMaxZoom", async () => {
    const canvas = await canvasIn3D();
    last3D().width(900);
    last3D().height(600);
    const place = () => canvas.getGraphData().nodes.forEach((node, i) => Object.assign(node, { x: i * 200, y: 0, z: 0 }));
    const distance = () => {
      const { cameraPos: c, controlsState: { target: t } } = last3D();
      return Math.hypot(c.x - t.x, c.y - t.y, c.z - t.z);
    };

    canvas.setLayout("force");
    place();
    canvas.zoomToFit();
    last3D().callback("onEngineStop")();
    const plain = distance();

    // Asked for while the layout is still landing: the multiplier waits with it.
    canvas.setLayout("force");
    place();
    canvas.zoomToFit(2);
    last3D().callback("onEngineStop")();
    expect(distance()).toBeCloseTo(plain / 2);

    // Never closer than zoomToFitMaxZoom allows (zoom k = 500 / distance).
    canvas.setConfig({ interaction: { zoomToFitMaxZoom: 1 } });
    canvas.zoomToFit(100);
    expect(distance()).toBeCloseTo(500);

    // Unset, it falls back to the 2D default of 8.
    canvas.setConfig({ interaction: { zoomToFitMaxZoom: undefined } });
    canvas.zoomToFit(100);
    expect(distance()).toBeCloseTo(500 / 8);
  });

  it("keeps the radial cone pinned when pinning is turned off", async () => {
    const canvas = await canvasIn3D();
    canvas.setAnimation(true);
    canvas.setLayout("radial");
    canvas.setPinOnDragEnd(true);

    canvas.setPinOnDragEnd(false);

    const nodes = canvas.getGraphData().nodes as Array<GraphNode & { z?: number; fz?: number }>;
    for (const n of nodes) expect([n.fx, n.fy, n.fz]).toEqual([n.x, n.y, n.z]);
    // Nor does turning animation on set forces loose on it.
    canvas.setAnimation(false);
    canvas.setAnimation(true);
    expect(last3D().props.get("cooldownTicks")).toBe(0);
  });

  it("redraws 3D captions when their fonts or contrast change", async () => {
    const canvas = await canvasIn3D();
    const refreshes = () => last3D().callsTo("refresh").length;
    const before = refreshes();

    canvas.setConfig({ nodeStyle: { fontFamily: "Inter" } });
    canvas.setConfig({ linkStyle: { fontWeightUnselected: 500 } });
    canvas.setConfig({ interaction: { contrastThreshold: 0.6 } });

    expect(refreshes()).toBe(before + 3);
  });

  it("has no 2D viewport to report or restore", async () => {
    const canvas = await canvasIn3D();

    expect(canvas.getViewport()).toBeUndefined();
    expect(() => canvas.setViewport({ zoom: 2, centerX: 0, centerY: 0 })).not.toThrow();
  });

  it("follows background colour and container size", async () => {
    const canvas = await canvasIn3D();

    canvas.setBackgroundColor("#123456");
    canvas.setWidth(640);
    canvas.setHeight(480);

    expect(last3D().props.get("backgroundColor")).toBe("#123456");
    expect(last3D().width()).toBe(640);
    expect(last3D().height()).toBe(480);
  });

  it("marks the engine as stopped when the 3D simulation stops", async () => {
    const onEngineStop = vi.fn();
    const canvas = await canvasIn3D();
    canvas.setConfig({ eventHandlers: { onEngineStop } });
    canvas.setAnimation(true);
    const element = canvas.shadowRoot!.querySelector("canvas")!;
    expect(element.getAttribute("data-engine-status")).toBe("running");

    last3D().callback("onEngineStop")();

    expect(element.getAttribute("data-engine-status")).toBe("stopped");
    expect(onEngineStop).toHaveBeenCalled();
  });

  it("destroys the 3D renderer when the element is removed", async () => {
    const canvas = await canvasIn3D();

    canvas.remove();

    expect(last3D().destroyed).toBe(true);
  });
});

describe("3D scene objects", () => {
  type Parts = { body: Mesh<BufferGeometry, MeshLambertMaterial>; outline: Mesh; caption: Sprite | undefined };

  beforeAll(() => {
    // jsdom has no 2D context; captions only need text measured and drawn.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
      measureText: (text: string) => ({ width: text.length * 10 }),
      fillRect: () => {},
      fillText: () => {},
    }) as unknown as CanvasRenderingContext2D);
  });

  /** Build `id`'s scene object through the factory the canvas hands the library. */
  function nodeObject(canvas: CanvasTestElement, id: number): Parts {
    const factory = last3D().props.get("nodeThreeObject") as (node: GraphNode) => Group;
    const group = factory(canvas.getGraphData().nodes.find((n) => n.id === id)!);
    const [body, outline, caption] = group.children as [Mesh<BufferGeometry, MeshLambertMaterial>, Mesh, Sprite?];
    return { body, outline, caption };
  }

  it("draws a node in its colour, with its caption underneath", async () => {
    const canvas = await canvasIn3D();
    canvas.setConfig({ captionsKeys: ["name"] });

    const { body, outline, caption } = nodeObject(canvas, 1);

    expect(`#${body.material.color.getHexString()}`).toBe("#ff0000");
    expect(outline.visible).toBe(false);
    expect(caption).toBeInstanceOf(Sprite);
    expect(caption!.position.y).toBeLessThan(0);
  });

  it("outlines selected nodes and fades dimmed ones, in place", async () => {
    const canvas = await canvasIn3D();
    const parts = nodeObject(canvas, 1);

    canvas.setConfig({
      isNodeSelected: (node) => node.id === 1,
      dimmed: true,
      isNodeDimmed: (node) => node.id === 1,
      dimOpacity: 0.2,
    });

    expect(parts.outline.visible).toBe(true);
    expect(parts.body.material.opacity).toBe(0.2);
    expect(parts.body.material.transparent).toBe(true);
    expect((parts.caption!.material as SpriteMaterial).opacity).toBe(0.2);
  });

  it("redraws a caption in place when the caption keys change", async () => {
    const canvas = await canvasIn3D();
    canvas.setConfig({ captionsKeys: ["name"] });
    const { body, caption: before } = nodeObject(canvas, 1);
    const group = body.parent!;

    // No such property: the caption falls back to the node id.
    canvas.setConfig({ captionsKeys: ["missing"] });

    const after = group.children[2];
    expect(after).toBeInstanceOf(Sprite);
    expect(after).not.toBe(before);
    expect(group.children).not.toContain(before);
  });

  it("builds a square node as a cube", async () => {
    const canvas = createCanvas();
    canvas.setData({ nodes: [{ ...DATA.nodes[0], shape: "square" }], links: [] });
    await canvas.setDimension("3d");

    expect(nodeObject(canvas, 1).body.geometry).toBeInstanceOf(BoxGeometry);
  });

  it("labels links with their relationship, faded when dimmed", async () => {
    const canvas = await canvasIn3D();
    canvas.setConfig({ dimmed: true, isLinkDimmed: () => true, dimOpacity: 0.3 });

    const factory = last3D().props.get("linkThreeObject") as (link: GraphLink) => Sprite;
    const label = factory(canvas.getGraphData().links[0]);

    expect(label).toBeInstanceOf(Sprite);
    expect(label.material.opacity).toBe(0.3);
  });

  it("places link labels halfway along the link", async () => {
    await canvasIn3D();
    const update = last3D().props.get("linkPositionUpdate") as (obj: Object3D, coords: object, link: object) => void;
    const label = new Object3D();

    update(label, { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 20, z: 30 } }, {});

    expect(label.position.toArray()).toEqual([5, 10, 15]);
  });

  it("rebuilds every object on refresh, for size and shape changes", async () => {
    const canvas = await canvasIn3D();
    const refreshes = last3D().callsTo("refresh").length;

    canvas.refresh();

    expect(last3D().callsTo("refresh")).toHaveLength(refreshes + 1);
  });
});

describe("3D hidden links", () => {
  const THREE_NODES = {
    nodes: [
      { id: 1, labels: ["A"], visible: true, color: "#ff0000", data: {} },
      { id: 2, labels: ["B"], visible: true, color: "#00ff00", data: {} },
      { id: 3, labels: ["C"], visible: true, color: "#0000ff", data: {} },
    ],
    links: [
      { id: 10, relationship: "REL", source: 1, target: 2, visible: true, color: "#888888", data: {} },
      { id: 11, relationship: "REL", source: 2, target: 3, visible: false, color: "#888888", data: {} },
    ],
  };

  const boundIds = () => last3D().linkForce.linkSet!.map((link) => link.id);

  it("keeps a hidden link out of the simulation", async () => {
    const canvas = createCanvas();
    canvas.setData(THREE_NODES);
    await canvas.setDimension("3d");

    expect(boundIds()).toEqual([10]);
  });

  it("drops a link hidden in place when refresh() is called", async () => {
    const canvas = createCanvas();
    canvas.setData({ ...THREE_NODES, links: THREE_NODES.links.map((link) => ({ ...link, visible: true })) });
    await canvas.setDimension("3d");
    expect(boundIds()).toEqual([10, 11]);

    // getGraphData() hands back the live links, so this is an in-place change.
    canvas.getGraphData().links[1].visible = false;
    canvas.refresh();

    expect(boundIds()).toEqual([10]);
  });
});
