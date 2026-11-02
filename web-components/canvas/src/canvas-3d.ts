import ForceGraph3D, { type ForceGraph3DInstance } from "3d-force-graph";
import * as THREE from "three";
import type { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import * as d3 from "d3";
import {
  GraphData,
  GraphLink,
  GraphNode,
  InternalForceGraphConfig,
} from "./canvas-types.js";
import {
  ARROW_SIZE,
  LINK_DISTANCE,
  LINK_FONT_SIZE,
  LINK_WIDTH,
  getContrastTextColor,
  getNodeDisplayText,
  wrapVisibleLinks,
} from "./canvas-utils.js";
import { DEFAULT_LEVEL_DISTANCE, computeRadialPositions, computeTreePositions } from "./layouts.js";
import { NodeInstances } from "./node-instances.js";
import { LinkShaft } from "./link-shaft.js";
import { ForceLayoutClient } from "./force-layout-client.js";
import type { LayoutNode } from "./force-layout.js";

/** Selected nodes get an outline shell this much larger than the node. */
const SELECTED_OUTLINE_SCALE = 1.2;

/**
 * Links are drawn as hairlines; a selected link becomes a tube this many world
 * units wide per unit of `link.width`, with a proportionally longer arrowhead.
 */
const SELECTED_LINK_WIDTH = 1.5;

/**
 * Captions are drawn on a canvas texture this many pixels tall, then scaled
 * into world units. Higher is sharper and costs more texture memory.
 */
const LABEL_TEXTURE_HEIGHT = 64;

/**
 * Each caption is its own texture, so past this many elements captions are
 * left to the hover tooltip to keep large graphs responsive.
 */
const MAX_LABELED_ELEMENTS = 1000;

const MAX_CACHED_LABELS = 256;
const MAX_CACHED_SHAFT_MATERIALS = 256;
const MAX_CACHED_LABEL_PIXELS = 1024 * 1024;
const MAX_LABEL_TEXTURE_WIDTH = 2048;
const IDLE_RENDER_DELAY = 150;
const LARGE_GRAPH_NODE_THRESHOLD = 1000;

/**
 * `getZoom()`/`zoom()` express camera distance as a zoom factor, so callers
 * that scale the current zoom (`zoom(getZoom() * 1.1)`) work in both
 * dimensions: zoom `k` puts the camera `ZOOM_REFERENCE_DISTANCE / k` away
 * from what it looks at.
 */
const ZOOM_REFERENCE_DISTANCE = 500;

/**
 * Tree and radial layouts keep their 2D positions in 3D, so face-on they read
 * exactly as in 2D with no node over another, and each level sits this many
 * level distances further back than the one above it. Seen side-on, every
 * level is then a single point and the levels step back like stairs.
 * (The library's own DAG modes leave the spread across a level to the force
 * simulation, which lets nodes overlap; its radial mode nests spheres that
 * collapse into one ball on screen.)
 */
const DEPTH_PER_LEVEL = 1;

type Instance = ForceGraph3DInstance<GraphNode, GraphLink>;

type Vec3 = { x: number; y: number; z: number };

type Node3D = GraphNode & { z?: number; vz?: number; fz?: number };

/** The scene objects of one node, kept so a restyle can update them in place. */
type NodeParts = {
  body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  outline: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  label: THREE.Sprite | null;
  labelText: string;
  labelRevision: number;
  labelStyle: string;
  dirty: boolean;
  color?: string;
  borderColor?: string;
  opacity?: number;
};

/** What the 3D renderer reads from the `<falkordb-canvas>` element that owns it. */
export interface Graph3DHost {
  readonly config: InternalForceGraphConfig;
  readonly data: GraphData;
  log(...args: unknown[]): void;
  setEngineStatus(isRunning: boolean): void;
}

/**
 * Renders the canvas's graph data in 3D with WebGL, through `3d-force-graph`.
 *
 * Owned by `FalkorDBCanvas`, which keeps the data, the config and the public
 * API, and forwards to this class while `dimension` is `'3d'`. It lives in its
 * own module so three.js is only downloaded once a graph is shown in 3D.
 */
export class Graph3D {
  readonly graph: Instance;

  private nodeParts = new WeakMap<GraphNode, NodeParts>();

  private linkLabels = new WeakMap<GraphLink, THREE.Sprite>();

  private readonly linkShafts = new Map<GraphLink, LinkShaft>();

  private readonly shaftMaterials = new Map<string, THREE.LineBasicMaterial | THREE.MeshLambertMaterial>();

  private readonly sphereGeometry = new THREE.SphereGeometry(1, 12, 8);

  private readonly boxGeometry = new THREE.BoxGeometry(2, 2, 2);

  private readonly labelTextures = new Map<string, THREE.CanvasTexture>();

  private readonly cachedTextures = new WeakSet<THREE.Texture>();

  private cachedLabelPixels = 0;

  private labelRevision = 0;

  private captionConfig = "";

  private readonly linkColors = new WeakMap<GraphLink, { color: string; background: string; opacity: number; output: string }>();

  private rendering = true;

  private engineRunning = true;

  private pointerDown = false;

  private destroyed = false;

  private renderUntil = 0;

  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  private cleanupInteraction: (() => void) | undefined;

  private details = { nodes: true, links: true, arrows: true };

  private readonly frustum = new THREE.Frustum();

  private readonly projection = new THREE.Matrix4();

  private readonly bounds = new THREE.Sphere();

  private instances: NodeInstances;

  private layoutWorker: ForceLayoutClient;

  private workerActive = false;

  private workerWarming = false;

  private workerFailed = false;

  private dragging: GraphNode | undefined;

  private workerNodes: Node3D[] = [];

  private get shouldUseWorker() {
    return !this.holdsLayout && this.host.config.simulation.workerLayout && !this.workerFailed &&
      typeof Worker !== "undefined" && this.host.data.nodes.length >= LARGE_GRAPH_NODE_THRESHOLD;
  }

  private startWorker(warmupTicks: number) {
    const { simulation, layoutOptions, animation, pinOnDragEnd } = this.host.config;
    // A style/config refresh during warmup must not replace it with an unlaid graph.
    const ticks = this.workerWarming ? Math.max(warmupTicks, simulation.warmupTicks) : warmupTicks;
    if (!this.shouldUseWorker) {
      this.stopWorker();
      return false;
    }
    this.workerNodes = [...this.host.data.nodes];
    const nodes: LayoutNode[] = this.workerNodes.map(node => ({
      id: node.id, size: node.size,
      x: node.x, y: node.y, z: node.z, vx: node.vx, vy: node.vy, vz: node.vz,
      fx: node.fx, fy: node.fy, fz: node.fz,
    }));
    const links = this.host.data.links.filter(link => link.visible !== false).map(link => ({
      source: typeof link.source === "number" ? link.source : link.source.id,
      target: typeof link.target === "number" ? link.target : link.target.id,
    }));
    this.workerActive = true;
    this.workerWarming = ticks > 0;
    this.engineRunning = true;
    this.layoutPending = true;
    this.graph.warmupTicks(0).cooldownTicks(0);
    this.host.setEngineStatus(true);
    return this.layoutWorker.start({
      nodes, links, warmupTicks: ticks,
      chargeStrength: simulation.chargeStrength,
      velocityDecay: simulation.velocityDecay,
      alphaMin: simulation.alphaMin,
      linkDistance: layoutOptions.force?.linkDistance ?? LINK_DISTANCE,
      animate: !!animation && !pinOnDragEnd,
    });
  }

  private stopWorker() {
    this.layoutWorker.stop();
    this.workerActive = false;
    this.workerWarming = false;
    this.workerNodes = [];
  }

  private applyWorkerPositions(positions: Float64Array, done: boolean) {
    if (!this.workerActive || this.destroyed) return;
    this.workerWarming = false;
    this.workerNodes.forEach((node, index) => {
      const offset = index * 6;
      node.x = positions[offset];
      node.y = positions[offset + 1];
      node.z = positions[offset + 2];
      node.vx = positions[offset + 3];
      node.vy = positions[offset + 4];
      node.vz = positions[offset + 5];
    });
    this.layoutLanded();
    // cooldown=0 updates scene positions without executing any local force tick.
    this.graph.d3ReheatSimulation();
    this.updateViewport();
    this.engineRunning = !done;
    this.host.setEngineStatus(!done);
    this.requestRender();
    if (done) this.host.config.eventHandlers?.onEngineStop?.();
  }

  private updateFrustum() {
    const camera = this.graph.camera();
    camera.updateMatrixWorld();
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projection);
  }

  private inView(position: { x?: number; y?: number; z?: number }, radius: number) {
    if (!this.host.config.largeGraph.enabled) return true;
    this.bounds.center.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
    this.bounds.radius = radius + Math.max(0, this.host.config.largeGraph.viewportPadding);
    return this.frustum.intersectsSphere(this.bounds);
  }

  private syncNode(node: Node3D, parts: NodeParts) {
    // Include the widest possible caption and square-node diagonal at the edge.
    const height = Math.max(node.size * 0.6, 3);
    const radius = node.size * SELECTED_OUTLINE_SCALE * Math.sqrt(3) +
      height * (MAX_LABEL_TEXTURE_WIDTH / LABEL_TEXTURE_HEIGHT + 1);
    const visible = node.visible !== false && this.inView(node, radius);
    if (visible && parts.dirty) {
      this.styleNode(node, parts);
      parts.dirty = false;
    }
    if (parts.label) parts.label.visible = visible && this.details.nodes;
  }

  private syncLinkLabel(link: GraphLink, label: THREE.Sprite) {
    const visible = link.visible !== false && this.inView(label.position, label.scale.length() / 2);
    label.visible = visible && this.details.links;
    if (label.visible) label.material.opacity = this.linkOpacity(link);
  }

  private updateViewport() {
    this.updateFrustum();
    for (const node of this.host.data.nodes) {
      const parts = this.nodeParts.get(node);
      if (parts) this.syncNode(node, parts);
    }
    for (const link of this.host.data.links) {
      const label = this.linkLabels.get(link);
      if (label) this.syncLinkLabel(link, label);
    }
    const { largeGraph } = this.host.config;
    const items = [];
    if (largeGraph.enabled && largeGraph.nodeInstancing && this.host.data.nodes.length >= LARGE_GRAPH_NODE_THRESHOLD) {
      for (const node of this.host.data.nodes as Node3D[]) {
        const parts = this.nodeParts.get(node);
        // Keep selected bodies with their shells to preserve contour depth.
        if (!parts || node.visible === false || parts.outline.visible || parts.body.material.opacity !== 1) continue;
        if (!this.inView(node, node.size * Math.sqrt(3))) continue;
        items.push({ body: parts.body, x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0, size: node.size });
      }
    }
    this.instances.update(items);
  }

  /** Selected link ids, as last applied — link widths only change with the selection. */
  private linkSelection = "";

  /**
   * The library lays data out on a debounced update, so until the engine next
   * reports, node positions are still the starting cluster. A fit asked for in
   * that window waits for the layout, or it frames the wrong extent.
   */
  private layoutPending = false;

  private pendingFit: { filter?: (node: GraphNode) => boolean; zoomMultiplier?: number } | null = null;

  /**
   * Set when a layout is applied: the next fit looks at the graph face-on and
   * upright again. Tree levels and the radial cone are laid out to be read
   * from the front, so the angle and roll the user dragged the camera to would
   * show them edge-on. A flag rather than part of `pendingFit`, so a fit asked
   * for meanwhile cannot drop it.
   */
  private resetViewPending = false;

  constructor(container: HTMLElement, private readonly host: Graph3DHost) {
    const { config } = host;

    this.graph = new (ForceGraph3D as unknown as new (el: HTMLElement) => Instance)(container)
      .width(config.width || container.clientWidth || 800)
      .height(config.height || container.clientHeight || 600)
      .backgroundColor(config.backgroundColor)
      .showNavInfo(false)
      .nodeId("id")
      .nodeRelSize(1)
      // Radius = cbrt(val) * nodeRelSize, so a node is as big as its 2D circle
      // and arrowheads stop at its surface.
      .nodeVal((node) => node.size ** 3)
      .nodeVisibility("visible")
      .linkVisibility("visible")
      .nodeLabel((node) => getNodeDisplayText(node, config.captionsKeys, config.showPropertyKeyPrefix))
      .linkLabel((link) => link.relationship)
      .linkOpacity(0.9)
      .linkCurvature("curve")
      .linkDirectionalArrowRelPos(1)
      // Setting either factory again recreates every object, so they are set
      // once here; restyle() updates the objects they build.
      .nodeThreeObject((node) => this.createNodeObject(node))
      .linkThreeObjectExtend(false)
      .linkThreeObject((link) => {
        this.linkShafts.get(link)?.dispose();
        const shaft = new LinkShaft(this.createLinkLabel(link),
          this.isLinkSelected(link) ? (link.width ?? LINK_WIDTH) * SELECTED_LINK_WIDTH : 0, this.shaftMaterial(link));
        this.linkShafts.set(link, shaft);
        return shaft;
      })
      .linkPositionUpdate((obj, { start, end }, link) => {
        const curve = (link as GraphLink & { __curve?: THREE.Curve<THREE.Vector3> | null }).__curve;
        const mid = curve
          ? curve.getPoint(0.5)
          : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, z: (start.z + end.z) / 2 };
        const shaft = obj as LinkShaft;
        shaft.label.position.set(mid.x, mid.y, mid.z);
        shaft.update(new THREE.Vector3(start.x, start.y, start.z ?? 0), new THREE.Vector3(end.x, end.y, end.z ?? 0),
          curve ?? null, typeof link.target === "number" ? 0 : link.target.size, this.arrowLength(link));
        const label = this.linkLabels.get(link);
        if (label) this.syncLinkLabel(link, label);
        return true;
      })
      .enableNodeDrag(true)
      // Graphs with cycles are the norm: level them as well as possible
      // instead of throwing.
      .onDagError(() => {});

    this.applyLinkSelection(true);
    this.instances = new NodeInstances(this.graph.scene());
    this.layoutWorker = new ForceLayoutClient(
      (positions, done) => this.applyWorkerPositions(positions, done),
      error => {
        console.error("[FalkorDBCanvas] 3D layout worker failed; using local physics", error);
        this.workerFailed = true;
        this.stopWorker();
        if (!this.destroyed) this.applyLayout();
      },
    );
    this.bindEventHandlers();
    const controls = this.graph.controls() as TrackballControls;
    controls.noPan = false;
    controls.noRotate = false;
    controls.noZoom = false;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.bindRenderActivity(container);
  }

  private requestRender(durationMs = 0) {
    if (this.destroyed) return;
    this.renderUntil = Math.max(this.renderUntil, Date.now() + durationMs);
    clearTimeout(this.idleTimer);
    if (!this.rendering) {
      this.rendering = true;
      this.graph.resumeAnimation();
    }
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idleTimer = undefined;
      if ((this.engineRunning && !this.workerWarming) || this.pointerDown || this.destroyed) return;
      if (Date.now() < this.renderUntil) {
        this.requestRender();
        return;
      }
      this.graph.pauseAnimation();
      this.rendering = false;
    }, IDLE_RENDER_DELAY);
  }

  private bindRenderActivity(container: HTMLElement) {
    const controls = this.graph.controls() as TrackballControls;
    const change = () => {
      this.updateDetailVisibility();
      this.requestRender();
    };
    const wake = () => this.requestRender();
    const down = () => { this.pointerDown = true; this.requestRender(); };
    const up = () => { this.pointerDown = false; this.requestRender(); };
    const end = () => { if (this.pointerDown) up(); };
    controls.addEventListener("change", change);
    container.addEventListener("pointermove", wake, { passive: true });
    container.addEventListener("pointerleave", wake, { passive: true });
    container.addEventListener("pointerdown", down, { passive: true });
    container.addEventListener("wheel", wake, { passive: true });
    window.addEventListener("pointerup", end, { passive: true });
    window.addEventListener("pointercancel", end, { passive: true });
    window.addEventListener("blur", up);
    this.cleanupInteraction = () => {
      controls.removeEventListener("change", change);
      container.removeEventListener("pointermove", wake);
      container.removeEventListener("pointerleave", wake);
      container.removeEventListener("pointerdown", down);
      container.removeEventListener("wheel", wake);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", up);
    };
  }

  private updateDetailVisibility() {
    const { largeGraph } = this.host.config;
    const lowZoom = largeGraph.enabled && this.getZoom() <= largeGraph.lowZoomThreshold;
    const next = {
      nodes: !(lowZoom && largeGraph.skipLabelsAtLowZoom),
      links: !(lowZoom && largeGraph.skipLinkLabelsAtLowZoom),
      arrows: !(lowZoom && largeGraph.skipArrowsAtLowZoom),
    };
    const previous = this.details;
    this.details = next;
    this.updateViewport();
    if (previous.arrows !== next.arrows) this.updateArrows();
  }

  /**
   * Bring every object in line with the current config: colours, selection
   * and dimming. Cheap enough to run on every hover.
   */
  restyle() {
    const { config } = this.host;
    const captionConfig = JSON.stringify([config.captionsKeys, config.showPropertyKeyPrefix]);
    if (captionConfig !== this.captionConfig) {
      this.captionConfig = captionConfig;
      this.labelRevision += 1;
    }
    for (const node of this.host.data.nodes) {
      const parts = this.nodeParts.get(node);
      if (parts) parts.dirty = true;
    }
    this.updateDetailVisibility();

    const liveLinks = new Set(this.host.data.links.filter(link => link.visible));
    for (const [link, shaft] of this.linkShafts) {
      if (liveLinks.has(link)) continue;
      shaft.dispose();
      this.linkShafts.delete(link);
    }
    let colorsChanged = false;
    for (const link of this.host.data.links) {
      const before = this.linkColors.get(link);
      this.linkColor(link);
      this.linkShafts.get(link)?.setStyle(
        this.isLinkSelected(link) ? (link.width ?? LINK_WIDTH) * SELECTED_LINK_WIDTH : 0,
        this.shaftMaterial(link),
      );
      if (before !== this.linkColors.get(link)) colorsChanged = true;
    }

    // Colours are re-read when the accessors are set; that keeps the objects.
    if (colorsChanged) {
      this.graph
        .linkColor((link) => this.linkColor(link))
        .linkDirectionalArrowColor((link) => this.linkColor(link));
    }
    this.applyLinkSelection();
    this.trimShaftMaterials();
    this.requestRender();
  }

  /** Recreate every object, for changes restyle() does not cover (sizes, shapes, captions' colours). */
  rebuild() {
    this.labelRevision += 1;
    // Visibility may have changed in place, and the force caches the links it
    // was given, so hand it the live ones again; the wrapper drops hidden ones.
    const linkForce = this.graph.d3Force("link");
    if (linkForce) wrapVisibleLinks(linkForce).links(this.host.data.links);
    this.graph.refresh();
    if (this.workerActive && !this.startWorker(0)) this.applyLayout(false);
    this.restyle();
  }

  setBackgroundColor(color: string) {
    this.graph.backgroundColor(color);
    // Captions are coloured against the background.
    this.rebuild();
  }

  setSize(width: number, height: number) {
    this.graph.width(width).height(height);
    // The library resizes on a debounce; culling needs the new projection now.
    const camera = this.graph.camera();
    if (camera instanceof THREE.PerspectiveCamera && width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    this.updateViewport();
    this.requestRender();
  }

  /**
   * Lay the host's data out again under `config.layoutMode`. Force runs
   * freely; tree and radial are placed from their 2D layouts, a level deeper
   * per step down the hierarchy.
   */
  applyLayout(fit = false) {
    this.stopWorker();
    this.labelRevision += 1;
    this.engineRunning = true;
    const { layoutMode, simulation, animation, pinOnDragEnd } = this.host.config;
    this.layoutPending = true;
    if (fit) {
      this.pendingFit = {};
      this.resetViewPending = true;
    }
    const placed = layoutMode === "tree" || layoutMode === "radial";
    const running = !!animation && !pinOnDragEnd && !placed;

    this.setupForces(false);
    for (const node of this.host.data.nodes) unpin3D(node);

    if (layoutMode === "tree") this.placeTree();
    else if (layoutMode === "radial") this.placeRadial();

    // As in 2D: a force layout is settled up front, then either keeps running
    // with animation on or is held still. Tree and radial are placed, not
    // simulated, so there is nothing to warm up.
    const worker = this.startWorker(simulation.warmupTicks);
    if (!worker) {
      this.graph.warmupTicks(placed ? 0 : simulation.warmupTicks);
      this.graph.cooldownTicks(running ? Infinity : 0);
      this.host.setEngineStatus(running);
    }

    // Handing the data over again is what re-runs the warmup; a fresh wrapper
    // so it is never taken for the data already shown.
    const { nodes, links } = this.host.data;
    this.graph.graphData({ nodes, links });
    this.restyle();
  }

  /** Show the host's data as it changed, keeping the nodes that stayed where they are. */
  updateData() {
    this.labelRevision += 1;
    this.engineRunning = true;
    const { nodes, links } = this.host.data;
    if (!this.startWorker(this.host.config.simulation.warmupTicks)) {
      const { simulation, animation, pinOnDragEnd } = this.host.config;
      this.graph.warmupTicks(this.holdsLayout ? 0 : simulation.warmupTicks)
        .cooldownTicks(animation && !pinOnDragEnd && !this.holdsLayout ? Infinity : 0);
    }
    this.graph.graphData({ nodes, links });
    this.restyle();
  }

  /*
   * Pausing and pinning stop the engine rather than fixing every node, as 2D
   * does: the library lays data out on a debounced update, so nodes pinned
   * right after a layout change would be frozen where the old layout left them.
   */

  /**
   * Pin every node to the 2D tree layout, each level a step further back; see
   * DEPTH_PER_LEVEL. The 2D layout puts the root level at 0 and each level
   * one level distance further along its direction's axis.
   */
  private placeTree() {
    const direction = this.host.config.layoutOptions.tree?.direction ?? "td";
    computeTreePositions(this.host.data, this.host.config.layoutOptions);

    for (const node of this.host.data.nodes as Node3D[]) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const levelOffset = direction === "lr" || direction === "rl" ? Math.abs(x) : Math.abs(y);
      place3D(node, x, y, -levelOffset * DEPTH_PER_LEVEL);
    }
  }

  /**
   * Pin every node to the 2D radial layout's rings, each level a step further
   * back; see DEPTH_PER_LEVEL. The levels are the rings, ordered from the root:
   * outward from the centre, or inward from the outermost ring.
   */
  private placeRadial() {
    const radial = this.host.config.layoutOptions.radial;
    computeRadialPositions(this.host.data, this.host.config.layoutOptions);

    const nodes = this.host.data.nodes as Node3D[];
    const ringOf = (node: Node3D) => Math.round(Math.hypot(node.x ?? 0, node.y ?? 0) * 1000) / 1000;
    const rings = [...new Set(nodes.map(ringOf))].sort((a, b) => a - b);
    if (radial?.direction === "in") rings.reverse();
    // Looked up once per node, so a deep graph stays linear in its size.
    const levelOf = new Map(rings.map((ring, level) => [ring, level]));
    const step = (radial?.levelDistance ?? DEFAULT_LEVEL_DISTANCE) * DEPTH_PER_LEVEL;

    for (const node of nodes) {
      place3D(node, node.x ?? 0, node.y ?? 0, -levelOf.get(ringOf(node))! * step);
    }
  }

  /** Tree and radial are their pinned positions: forces would only pull them apart. */
  private get holdsLayout(): boolean {
    const { layoutMode } = this.host.config;
    return layoutMode === "tree" || layoutMode === "radial";
  }

  setAnimation(enabled: boolean) {
    if (this.workerActive) {
      this.startWorker(this.layoutPending ? this.host.config.simulation.warmupTicks : 0);
      this.requestRender();
      return;
    }
    if (enabled && !this.host.config.pinOnDragEnd && !this.holdsLayout) {
      this.graph.cooldownTicks(Infinity).d3ReheatSimulation();
      this.host.setEngineStatus(true);
      this.engineRunning = true;
    } else if (!enabled) {
      this.graph.cooldownTicks(0);
      this.host.setEngineStatus(false);
    }
    this.requestRender();
  }

  setPinned(pinned: boolean) {
    if (pinned) {
      this.stopWorker();
      this.dragging = undefined;
      for (const node of this.host.data.nodes) pin3D(node);
      this.layoutLanded();
      this.graph.cooldownTicks(0);
      this.host.setEngineStatus(false);
      this.engineRunning = false;
      this.requestRender();
      return;
    }
    if (this.workerActive) {
      for (const node of this.host.data.nodes) unpin3D(node);
      this.startWorker(0);
      this.requestRender();
      return;
    }

    // As in 2D, only a force layout comes loose and starts moving again.
    if (this.holdsLayout) return;
    for (const node of this.host.data.nodes) unpin3D(node);
    if (this.shouldUseWorker) {
      this.startWorker(0);
      this.requestRender();
      return;
    }
    if (this.host.config.animation) {
      this.graph.cooldownTicks(Infinity).d3ReheatSimulation();
      this.host.setEngineStatus(true);
      this.engineRunning = true;
    }
    this.requestRender();
  }

  setupForces(restartWorker = true) {
    const { layoutOptions, simulation } = this.host.config;
    const linkDist = layoutOptions.force?.linkDistance ?? LINK_DISTANCE;

    const linkForce = this.graph.d3Force("link");
    if (linkForce) {
      // linkVisibility only filters drawing here too: the library binds every
      // link to this force on each data update. See wrapVisibleLinks.
      wrapVisibleLinks(linkForce);
      linkForce.distance?.((link: GraphLink) => link.source.size + link.target.size + linkDist * 2);
    }
    this.graph.d3Force("charge")?.strength?.(simulation.chargeStrength);
    this.graph.d3VelocityDecay(simulation.velocityDecay);
    this.graph.d3AlphaMin(simulation.alphaMin);
    if (restartWorker && (this.workerActive || this.shouldUseWorker) && !this.startWorker(0)) this.applyLayout(false);
  }

  /**
   * Frame the visible nodes, or those `filter` keeps, once any layout in
   * progress has landed. Keeps the camera's viewing angle, except right after
   * a layout is applied, when it looks at the graph face-on again.
   *
   * Measured from the node data rather than with the library's own zoomToFit,
   * which reads the scene objects — and those only catch up with a new layout
   * a frame or more after it has landed.
   */
  zoomToFit(filter?: (node: GraphNode) => boolean, zoomMultiplier = 1, durationMs = 0) {
    if (this.layoutPending) {
      this.pendingFit = { filter, zoomMultiplier };
      return;
    }

    // Taken by this fit even when there is nothing to frame, or a later plain
    // fit would snap the view face-on with no layout applied since.
    const resetView = this.resetViewPending;
    this.resetViewPending = false;

    const nodes = (this.host.data.nodes as Node3D[]).filter((node) =>
      node.visible && (!filter || filter(node)) && Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z));
    if (nodes.length === 0) return;

    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const node of nodes) {
      const r = node.size;
      min.min(new THREE.Vector3(node.x! - r, node.y! - r, node.z! - r));
      max.max(new THREE.Vector3(node.x! + r, node.y! + r, node.z! + r));
    }
    const center = min.clone().add(max).multiplyScalar(0.5);
    // Enclosing sphere, so the fit holds from any viewing angle.
    const radius = max.clone().sub(min).length() / 2;

    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const height = this.graph.height();
    const padding = Math.min(this.graph.width(), height) * this.host.config.interaction.zoomToFitPadding;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2) * Math.max(1 - (2 * padding) / height, 0.1);
    const halfView = Math.min(Math.tan(halfFov), Math.tan(halfFov) * camera.aspect);
    // As in 2D: the multiplier scales the fit, which never zooms in past zoomToFitMaxZoom.
    const fitZoom = ZOOM_REFERENCE_DISTANCE / (radius / Math.sin(Math.atan(halfView)));
    const zoom = Math.min(fitZoom * zoomMultiplier, this.host.config.interaction.zoomToFitMaxZoom ?? 8);
    const distance = ZOOM_REFERENCE_DISTANCE / Math.max(zoom, 0.01);

    const direction = resetView ? new THREE.Vector3(0, 0, 1) : this.cameraOffset();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    direction.setLength(distance);
    // Dragging rolls the camera too; lookAt below re-aims it with this up.
    if (resetView) camera.up.set(0, 1, 0);

    this.graph.cameraPosition(
      { x: center.x + direction.x, y: center.y + direction.y, z: center.z + direction.z },
      { x: center.x, y: center.y, z: center.z },
      durationMs,
    );
    this.updateDetailVisibility();
    this.requestRender(durationMs);
  }

  getZoom(): number {
    const distance = this.cameraOffset().length();
    return distance > 0 ? ZOOM_REFERENCE_DISTANCE / distance : 1;
  }

  /** Move the camera towards or away from what it looks at; see ZOOM_REFERENCE_DISTANCE. */
  zoom(k: number, durationMs = 200) {
    if (!(k > 0)) return;
    const target = this.cameraTarget();
    const offset = this.cameraOffset();
    if (offset.lengthSq() === 0) offset.set(0, 0, 1);
    offset.setLength(ZOOM_REFERENCE_DISTANCE / k);
    this.graph.cameraPosition(
      { x: target.x + offset.x, y: target.y + offset.y, z: target.z + offset.z },
      target,
      durationMs,
    );
    this.updateDetailVisibility();
    this.requestRender(durationMs);
  }

  /** Look at (x, y) on the current target's depth, keeping the camera's angle and distance. */
  centerAt(x: number, y: number, durationMs = 0) {
    const target = this.cameraTarget();
    const offset = this.cameraOffset();
    const lookAt = { x, y, z: target.z };
    this.graph.cameraPosition(
      { x: x + offset.x, y: y + offset.y, z: lookAt.z + offset.z },
      lookAt,
      durationMs,
    );
    this.updateDetailVisibility();
    this.requestRender(durationMs);
  }

  destroy() {
    this.destroyed = true;
    this.stopWorker();
    clearTimeout(this.idleTimer);
    this.cleanupInteraction?.();
    const renderer = this.graph.renderer();
    this.instances.dispose();
    for (const shaft of this.linkShafts.values()) shaft.dispose();
    this.linkShafts.clear();
    this.graph._destructor();
    this.sphereGeometry.dispose();
    this.boxGeometry.dispose();
    for (const material of this.shaftMaterials.values()) material.dispose();
    this.shaftMaterials.clear();
    this.clearLabelTextures();
    // dispose() frees renderer objects, but does not release the WebGL context.
    // Repeated dimension switches otherwise wait for the browser to collect it.
    renderer.forceContextLoss();
  }

  private clearLabelTextures() {
    for (const texture of this.labelTextures.values()) texture.dispose();
    this.labelTextures.clear();
    this.cachedLabelPixels = 0;
  }

  private cameraTarget(): Vec3 {
    const { target } = this.graph.controls() as { target?: Vec3 };
    return target ? { x: target.x, y: target.y, z: target.z } : { x: 0, y: 0, z: 0 };
  }

  private cameraOffset(): THREE.Vector3 {
    const camera = this.graph.cameraPosition();
    const target = this.cameraTarget();
    return new THREE.Vector3(camera.x - target.x, camera.y - target.y, camera.z - target.z);
  }

  private bindEventHandlers() {
    const handlers = () => this.host.config.eventHandlers;

    this.graph
      .onNodeClick((node, event) => handlers()?.onNodeClick?.(node, event))
      .onLinkClick((link, event) => handlers()?.onLinkClick?.(link, event))
      .onNodeRightClick((node, event) => handlers()?.onNodeRightClick?.(node, event))
      .onLinkRightClick((link, event) => handlers()?.onLinkRightClick?.(link, event))
      .onNodeHover((node) => handlers()?.onNodeHover?.(node))
      .onLinkHover((link) => handlers()?.onLinkHover?.(link))
      .onBackgroundClick((event) => handlers()?.onBackgroundClick?.(event))
      .onBackgroundRightClick((event) => handlers()?.onBackgroundRightClick?.(event))
      .onNodeDrag((node) => {
        if (!this.workerActive) return;
        this.dragging = node;
        this.layoutWorker.stop();
        this.engineRunning = false;
        this.graph.cooldownTicks(0);
        this.updateViewport();
        this.requestRender();
      })
      .onNodeDragEnd((node) => {
        // The library has released the drag's own pin by now.
        if (this.host.config.pinOnDragEnd) pin3D(node);
        if (this.workerActive && this.dragging === node) {
          this.dragging = undefined;
          this.startWorker(0);
        }
        handlers()?.onNodeDragEnd?.(node);
      })
      // The engine first ticks, or stops, right after a layout has been applied.
      .onEngineTick(() => {
        if (this.workerActive) return;
        this.engineRunning = true;
        this.layoutLanded();
        this.updateViewport();
      })
      .onEngineStop(() => {
        if (this.workerActive) {
          this.updateViewport();
          return;
        }
        this.host.log("3D engine stopped");
        this.layoutLanded();
        this.updateDetailVisibility();
        this.host.setEngineStatus(false);
        this.engineRunning = false;
        this.requestRender();
        handlers()?.onEngineStop?.();
      });
  }

  private layoutLanded() {
    if (!this.layoutPending) return;
    this.layoutPending = false;
    // Placed layouts are pinned again once the library has applied them, so
    // nothing it does while applying the update can leave a node loose.
    if (this.holdsLayout) {
      for (const node of this.host.data.nodes) pin3D(node);
    }
    const fit = this.pendingFit;
    this.pendingFit = null;
    if (fit) this.zoomToFit(fit.filter, fit.zoomMultiplier);
  }

  /**
   * Re-set link widths and arrow lengths when the selection has changed.
   * Either one recreates every link object, so hovering must not trigger it.
   */
  private applyLinkSelection(force = false) {
    const selection = this.host.data.links
      .filter((link) => this.isLinkSelected(link))
      .map((link) => link.id)
      .join(",");
    if (!force && selection === this.linkSelection) return;
    this.linkSelection = selection;

    this.graph
      .linkWidth((link) => (this.isLinkSelected(link) ? (link.width ?? LINK_WIDTH) * SELECTED_LINK_WIDTH : 0));
    this.updateArrows();
  }

  private updateArrows() {
    this.graph.linkDirectionalArrowLength((link) => this.arrowLength(link));
  }

  private shaftMaterial(link: GraphLink) {
    const color = this.linkColor(link);
    const selected = this.isLinkSelected(link);
    const key = `${selected}:${color}`;
    let material = this.shaftMaterials.get(key);
    if (!material) {
      material = selected
        ? new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
      this.shaftMaterials.set(key, material);
    }
    return material;
  }

  private trimShaftMaterials() {
    const used = new Set([...this.linkShafts.values()].map(shaft => shaft.material));
    for (const [key, material] of this.shaftMaterials) {
      if (this.shaftMaterials.size <= MAX_CACHED_SHAFT_MATERIALS) break;
      if (used.has(material)) continue;
      this.shaftMaterials.delete(key);
      material.dispose();
    }
  }

  private arrowLength(link: GraphLink) {
    return this.details.arrows
      ? (link.arrowSize ?? ARROW_SIZE) * (this.isLinkSelected(link) ? SELECTED_LINK_WIDTH : 1)
      : 0;
  }

  private isLinkSelected(link: GraphLink): boolean {
    return this.host.config.isLinkSelected?.(link) ?? false;
  }

  private nodeOpacity(node: GraphNode): number {
    const { config } = this.host;
    const dimmed = config.dimmed === true && (config.isNodeDimmed?.(node) ?? false);
    return dimmed ? config.dimOpacity ?? 0.15 : 1;
  }

  private linkOpacity(link: GraphLink): number {
    const { config } = this.host;
    const dimmed = config.dimmed === true && (config.isLinkDimmed?.(link) ?? false);
    return dimmed ? config.dimOpacity ?? 0.15 : 1;
  }

  /** Line opacity is shared by all links, so a dimmed link is blended into the background instead. */
  private linkColor(link: GraphLink): string {
    const opacity = this.linkOpacity(link);
    const background = this.host.config.backgroundColor;
    const cached = this.linkColors.get(link);
    if (cached?.color === link.color && cached.background === background && cached.opacity === opacity) return cached.output;
    const output = opacity === 1 ? link.color : d3.interpolateRgb(background, link.color)(opacity);
    this.linkColors.set(link, { color: link.color, background, opacity, output });
    return output;
  }

  private createNodeObject(node: GraphNode): THREE.Object3D {
    const geometry = node.shape === "square"
      ? this.boxGeometry
      : this.sphereGeometry;

    const body = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
    const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
    body.scale.setScalar(node.size);
    outline.scale.setScalar(node.size * SELECTED_OUTLINE_SCALE);

    const group = new THREE.Group();
    group.add(body, outline);

    const parts: NodeParts = { body, outline, label: null, labelText: "", labelRevision: -1, labelStyle: "", dirty: true };
    this.nodeParts.set(node, parts);
    this.updateFrustum();
    this.syncNode(node, parts);

    return group;
  }

  private styleNode(node: GraphNode, parts: NodeParts) {
    const { config } = this.host;
    const opacity = this.nodeOpacity(node);
    const { body, outline } = parts;

    if (parts.color !== node.color) {
      body.material.color.set(node.color);
      parts.color = node.color;
    }

    outline.visible = config.isNodeSelected?.(node) ?? false;
    const borderColor = node.borderColor ?? config.foregroundColor;
    if (parts.borderColor !== borderColor) {
      outline.material.color.set(borderColor);
      parts.borderColor = borderColor;
    }
    if (parts.opacity !== opacity) {
      body.material.opacity = outline.material.opacity = opacity;
      body.material.transparent = outline.material.transparent = opacity < 1;
      if (parts.label) parts.label.material.opacity = opacity;
      parts.opacity = opacity;
    }

    if (parts.labelRevision === this.labelRevision) return;
    parts.labelRevision = this.labelRevision;
    const text = this.host.data.nodes.length <= MAX_LABELED_ELEMENTS
      ? getNodeDisplayText(node, config.captionsKeys, config.showPropertyKeyPrefix)
      : "";
    const labelStyle = JSON.stringify([node.size, config.nodeStyle.fontWeightUnselected, config.nodeStyle.fontFamily,
      config.backgroundColor, config.interaction.contrastThreshold]);
    if (text !== parts.labelText || labelStyle !== parts.labelStyle) {
      if (parts.label) {
        parts.label.removeFromParent();
        // Textures can be shared by other labels; only this sprite's material
        // belongs to the outgoing caption.
        const texture = parts.label.material.map;
        if (texture && !this.cachedTextures.has(texture)) texture.dispose();
        parts.label.material.dispose();
      }
      parts.label = this.createTextSprite(text, {
        height: Math.max(node.size * 0.6, 3),
        font: `${config.nodeStyle.fontWeightUnselected} ${LABEL_TEXTURE_HEIGHT * 0.8}px ${config.nodeStyle.fontFamily}`,
        color: getContrastTextColor(config.backgroundColor, config.interaction.contrastThreshold),
      });
      parts.labelText = text;
      parts.labelStyle = labelStyle;
      if (parts.label) {
        // Under the node: inside it, the caption would be hidden by the surface.
        parts.label.position.y = -(node.size * SELECTED_OUTLINE_SCALE + parts.label.scale.y / 2);
        body.parent?.add(parts.label);
        parts.label.visible = this.details.nodes;
      }
    }
    if (parts.label) parts.label.material.opacity = opacity;
  }

  private createLinkLabel(link: GraphLink): THREE.Object3D {
    const { config } = this.host;
    if (this.host.data.links.length > MAX_LABELED_ELEMENTS) return new THREE.Object3D();

    const sprite = this.createTextSprite(link.relationship, {
      height: (link.fontSize ?? LINK_FONT_SIZE) * 0.6,
      font: `${config.linkStyle.fontWeightUnselected} ${LABEL_TEXTURE_HEIGHT * 0.8}px ${config.linkStyle.fontFamily}`,
      color: getContrastTextColor(config.backgroundColor, config.interaction.contrastThreshold),
      background: config.backgroundColor,
    });
    if (!sprite) return new THREE.Object3D();

    sprite.material.opacity = this.linkOpacity(link);
    sprite.visible = this.details.links;
    this.linkLabels.set(link, sprite);
    return sprite;
  }

  private createTextSprite(
    text: string,
    options: { height: number; font: string; color: string; background?: string },
  ): THREE.Sprite | null {
    if (!text) return null;

    const key = JSON.stringify([text, options.font, options.color, options.background]);
    let texture = this.labelTextures.get(key);
    if (texture) {
      this.labelTextures.delete(key);
      this.labelTextures.set(key, texture);
    }
    if (!texture) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const padding = options.background ? LABEL_TEXTURE_HEIGHT * 0.2 : 0;
      ctx.font = options.font;
      canvas.width = Math.min(Math.max(Math.ceil(ctx.measureText(text).width + padding * 2), 1), MAX_LABEL_TEXTURE_WIDTH);
      canvas.height = LABEL_TEXTURE_HEIGHT;

      if (options.background) {
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.font = options.font;
      ctx.fillStyle = options.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - padding * 2);

      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      // Evict old captions so unique node names cannot starve recurring
      // relationship labels. Live sprites retain their texture and Three.js
      // re-uploads it if disposal invalidated a buffer they still need.
      const pixels = canvas.width * canvas.height;
      while (this.labelTextures.size >= MAX_CACHED_LABELS || this.cachedLabelPixels + pixels > MAX_CACHED_LABEL_PIXELS) {
        const oldest = this.labelTextures.entries().next().value;
        if (!oldest) break;
        this.labelTextures.delete(oldest[0]);
        this.cachedTextures.delete(oldest[1]);
        this.cachedLabelPixels -= oldest[1].image.width * oldest[1].image.height;
        oldest[1].dispose();
      }
      this.labelTextures.set(key, texture);
      this.cachedTextures.add(texture);
      this.cachedLabelPixels += pixels;
    }

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set((options.height * texture.image.width) / LABEL_TEXTURE_HEIGHT, options.height, 1);
    return sprite;
  }
}

/**
 * Pin `node` at a 2D layout position, given in the 2D canvas's coordinates,
 * and `z`. The 2D canvas's y axis points down, three.js's up.
 */
function place3D(node: Node3D, x: number, y: number, z: number) {
  node.x = node.fx = x;
  node.y = node.fy = -y;
  node.z = node.fz = z;
  node.vx = node.vy = node.vz = 0;
}

/** Fix `node` where it is, in all three axes. */
function pin3D(node: Node3D) {
  node.z ??= 0;
  node.fx = node.x;
  node.fy = node.y;
  node.fz = node.z;
}

function unpin3D(node: Node3D) {
  delete node.fx;
  delete node.fy;
  delete node.fz;
}
