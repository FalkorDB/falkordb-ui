import ForceGraph3D, { type ForceGraph3DInstance } from "3d-force-graph";
import * as THREE from "three";
import type { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import * as d3 from "d3";
import {
  GraphData,
  GraphLink,
  GraphNode,
  CanvasVector3,
  CameraState,
  InternalCanvasConfig,
  ThreeDCullingStats,
  ThreeDRenderState,
} from "./canvas-types.js";
import { ThreeDResourceTracker } from "./three-d-resource-tracker.js";
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
  group: THREE.Group;
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
  customVisual: THREE.Object3D | null;
  releaseCustomVisual: (() => void) | null;
  renderState: ThreeDRenderState;
  factory: InternalCanvasConfig["modeConfig"]["threeD"]["nodeObject"];
  refreshCustomVisual: boolean;
};

type LinkParts = {
  root: THREE.Object3D;
  label: THREE.Sprite | null;
  customVisual: THREE.Object3D | null;
  dashedLine: THREE.LineSegments | null;
  releaseCustomVisual: (() => void) | null;
  renderState: ThreeDRenderState;
  factory: InternalCanvasConfig["modeConfig"]["threeD"]["linkObject"];
  dashPatternFactory: InternalCanvasConfig["modeConfig"]["threeD"]["linkDashPattern"];
  dashPattern: number[];
  shaft: LinkShaft | null;
};

type GraphSceneObject = THREE.Object3D & {
  __graphObjType?: string;
  __data?: GraphNode | GraphLink;
};

/** What the 3D renderer reads from the `<falkordb-canvas>` element that owns it. */
export interface Graph3DHost {
  readonly config: InternalCanvasConfig;
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

  private nodeParts = new Map<GraphNode, NodeParts>();

  private linkParts = new Map<GraphLink, LinkParts>();

  private readonly resourceTracker = new ThreeDResourceTracker();

  private refreshingDashPatterns = false;

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
    const largeGraph = this.host.config.modeConfig.threeD.largeGraph;
    if (!largeGraph.enabled) return true;
    this.bounds.center.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
    this.bounds.radius = radius + Math.max(0, largeGraph.viewportPadding);
    return this.frustum.intersectsSphere(this.bounds);
  }

  private syncNode(node: Node3D, parts: NodeParts) {
    // Include the widest possible caption and square-node diagonal at the edge.
    const height = Math.max(node.size * 0.6, 3);
    const radius = node.size * SELECTED_OUTLINE_SCALE * Math.sqrt(3) +
      height * (MAX_LABEL_TEXTURE_WIDTH / LABEL_TEXTURE_HEIGHT + 1);
    const visible = node.visible !== false && this.inView(node, radius);
    parts.group.visible = visible;
    if (visible && parts.dirty) {
      const state = this.nodeRenderState(node);
      const factory = this.host.config.modeConfig.threeD.nodeObject;
      if (
        parts.refreshCustomVisual
        || !sameRenderState(state, parts.renderState)
        || parts.factory !== factory
      ) {
        this.replaceNodeCustomVisual(node, parts, state);
      }
      parts.refreshCustomVisual = false;
      parts.renderState = state;
      this.styleNode(node, parts, state);
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
      const label = this.linkParts.get(link)?.label;
      if (label) this.syncLinkLabel(link, label);
    }
    const { largeGraph } = this.host.config.modeConfig.threeD;
    const items = [];
    if (largeGraph.enabled && largeGraph.nodeInstancing && this.host.data.nodes.length >= LARGE_GRAPH_NODE_THRESHOLD) {
      for (const node of this.host.data.nodes as Node3D[]) {
        const parts = this.nodeParts.get(node);
        // Keep selected bodies with their shells to preserve contour depth.
        if (!parts || node.visible === false || parts.customVisual || parts.outline.visible || parts.body.material.opacity !== 1) continue;
        if (!this.inView(node, node.size * Math.sqrt(3))) continue;
        items.push({ body: parts.body, x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0, size: node.size });
      }
    }
    this.instances.update(items);
  }

  /** Selected link ids, as last applied — link widths only change with the selection. */
  private linkSelection = "";

  private appliedUnselectedLinkWidth: number | undefined;

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
      .nodeThreeObject((node) => this.createNodeObject(node))
      .linkThreeObjectExtend(false)
      .linkThreeObject((link) => this.createLinkObject(link))
      .linkPositionUpdate((object, coordinates, link) => this.updateLinkObjectPosition(object, coordinates, link))
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
    const { largeGraph } = this.host.config.modeConfig.threeD;
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
  restyle(refreshCustomVisuals = false) {
    const { config } = this.host;
    const captionConfig = JSON.stringify([config.captionsKeys, config.showPropertyKeyPrefix]);
    if (captionConfig !== this.captionConfig) {
      this.captionConfig = captionConfig;
      this.labelRevision += 1;
    }
    for (const parts of this.nodeParts.values()) {
      parts.dirty = true;
      if (refreshCustomVisuals) parts.refreshCustomVisual = true;
    }

    const liveLinks = new Set(this.host.data.links.filter(link => link.visible));
    for (const [link, parts] of this.linkParts) {
      if (liveLinks.has(link)) continue;
      this.disposeLinkParts(parts);
      this.linkParts.delete(link);
      this.linkShafts.delete(link);
    }
    let colorsChanged = false;
    for (const link of this.host.data.links) {
      const before = this.linkColors.get(link);
      this.linkColor(link);
      if (before !== this.linkColors.get(link)) colorsChanged = true;
      const parts = this.linkParts.get(link);
      if (!parts) continue;
      const state = this.linkRenderState(link);
      const patternFactory = this.host.config.modeConfig.threeD.linkDashPattern;
      if (
        refreshCustomVisuals
        || !sameRenderState(state, parts.renderState)
        || parts.factory !== this.host.config.modeConfig.threeD.linkObject
        || parts.dashPatternFactory !== patternFactory
      ) {
        this.replaceLinkVisual(link, parts, state);
      } else if (parts.label?.visible) {
        parts.label.material.opacity = state.opacity;
      }
      const linkWidth = this.isLinkSelected(link)
        ? Math.max(link.width ?? LINK_WIDTH, config.modeConfig.threeD.linkWidth) * SELECTED_LINK_WIDTH
        : config.modeConfig.threeD.linkWidth;
      this.linkShafts.get(link)?.setStyle(linkWidth, this.shaftMaterial(link));
    }

    this.updateDetailVisibility();

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

  /** Refresh physics after callers mutate live graph structure or visibility. */
  refresh() {
    // Visibility may have changed in place, and the force caches the links it
    // was given, so hand it the live ones again; the wrapper drops hidden ones.
    const linkForce = this.graph.d3Force("link");
    if (linkForce) wrapVisibleLinks(linkForce).links(this.host.data.links);
    if (this.workerActive && !this.startWorker(0)) this.applyLayout(false);
    this.cleanupRemovedVisuals();
    this.rebuild();
  }

  /** Recreate visual objects without restarting the current simulation. */
  rebuild(fontsLoaded = false) {
    if (fontsLoaded) this.clearLabelTextures();
    this.labelRevision += 1;
    this.refreshGraphObjects(!!this.host.config.modeConfig.threeD.linkDashPattern);
    this.restyle();
  }

  private refreshGraphObjects(refreshDashPatterns: boolean) {
    this.refreshingDashPatterns = refreshDashPatterns;
    try {
      this.graph.refresh();
    } finally {
      this.refreshingDashPatterns = false;
    }
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
    // A data-dependent pattern can change a link between native and custom objects.
    const refreshedObjects = !!this.host.config.modeConfig.threeD.linkDashPattern;
    if (refreshedObjects) this.refreshGraphObjects(true);
    this.cleanupRemovedVisuals();
    this.restyle(!refreshedObjects);
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

  getCameraState(): CameraState {
    const position = this.graph.cameraPosition();
    const target = this.cameraTarget();
    const up = this.graph.camera().up;
    return {
      position: { x: position.x, y: position.y, z: position.z },
      target: { ...target },
      up: { x: up.x, y: up.y, z: up.z },
    };
  }

  setCameraState(state: CameraState) {
    const camera = this.graph.camera();
    camera.up.set(state.up.x, state.up.y, state.up.z);
    this.graph.cameraPosition(
      { ...state.position },
      { ...state.target },
      0,
    );
    this.updateDetailVisibility();
    this.requestRender();
  }

  getCullingStats(): ThreeDCullingStats {
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    camera.updateMatrixWorld(true);
    const scene = this.graph.scene();
    scene.updateMatrixWorld(true);
    const viewProjection = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const frustum = new THREE.Frustum().setFromProjectionMatrix(viewProjection);

    const visibleNodes = this.host.data.nodes.filter((node) => node.visible);
    let frustumVisibleNodeBodies = 0;
    let totalNodeCaptions = 0;
    let frustumVisibleNodeCaptions = 0;
    const largeGraph = this.host.config.modeConfig.threeD.largeGraph;
    for (const node of visibleNodes) {
      const parts = this.nodeParts.get(node);
      const body = parts?.customVisual ?? parts?.body;
      const instancedBody = !!parts
        && !parts.customVisual
        && largeGraph.enabled
        && largeGraph.nodeInstancing
        && visibleNodes.length >= LARGE_GRAPH_NODE_THRESHOLD
        && !parts.outline.visible
        && parts.body.material.opacity === 1;
      const bodyInFrustum = body && (parts && instancedBody
        ? this.drawableBoundsInFrustum(frustum, parts.body)
        : this.drawableTreeInFrustum(frustum, body));
      if (bodyInFrustum) {
        frustumVisibleNodeBodies++;
      }
      if (parts?.label) {
        totalNodeCaptions++;
        if (this.intersectsFrustum(frustum, parts.label)) frustumVisibleNodeCaptions++;
      }
    }

    const linkRoots = new Map<GraphLink, THREE.Object3D>();
    scene.traverse((object) => {
      const graphObject = object as GraphSceneObject;
      if (graphObject.__graphObjType === "link" && graphObject.__data) {
        linkRoots.set(graphObject.__data as GraphLink, graphObject);
      }
    });

    const visibleLinks = this.host.data.links.filter((link) => link.visible);
    let frustumVisibleLinks = 0;
    let totalLinkLabels = 0;
    let frustumVisibleLinkLabels = 0;
    for (const link of visibleLinks) {
      const root = linkRoots.get(link);
      const label = this.linkParts.get(link)?.label ?? null;
      if (label) {
        totalLinkLabels++;
        if (this.intersectsFrustum(frustum, label)) frustumVisibleLinkLabels++;
      }
      if (!root) continue;

      let bodyInFrustum = false;
      root.traverse((object) => {
        if (object === root || object === label || bodyInFrustum) return;
        if (this.intersectsFrustum(frustum, object)) bodyInFrustum = true;
      });
      if (bodyInFrustum) frustumVisibleLinks++;
    }

    return {
      frustumVisibleNodeBodies,
      totalNodeBodies: visibleNodes.length,
      frustumVisibleNodeCaptions,
      totalNodeCaptions,
      frustumVisibleLinks,
      totalLinks: visibleLinks.length,
      frustumVisibleLinkLabels,
      totalLinkLabels,
      captionLimitEnabled: this.host.config.modeConfig.threeD.largeGraph.enabled,
    };
  }

  private intersectsFrustum(frustum: THREE.Frustum, object: THREE.Object3D): boolean {
    if (!this.isEffectivelyVisible(object)) return false;
    if ((object as THREE.Sprite).isSprite) {
      return frustum.intersectsSprite(object as THREE.Sprite);
    }
    return this.isDrawableInFrustum(frustum, object);
  }

  private drawableTreeInFrustum(frustum: THREE.Frustum, root: THREE.Object3D): boolean {
    let intersects = false;
    root.traverse((object) => {
      if (!intersects && this.intersectsFrustum(frustum, object)) intersects = true;
    });
    return intersects;
  }

  private isDrawableInFrustum(frustum: THREE.Frustum, object: THREE.Object3D): boolean {
    const drawable = object as THREE.Object3D & { geometry?: THREE.BufferGeometry };
    return this.isEffectivelyVisible(object) && !!drawable.geometry && frustum.intersectsObject(object as THREE.Mesh);
  }

  private drawableBoundsInFrustum(frustum: THREE.Frustum, object: THREE.Object3D): boolean {
    const drawable = object as THREE.Object3D & { geometry?: THREE.BufferGeometry };
    return !!drawable.geometry && frustum.intersectsObject(object as THREE.Mesh);
  }

  private isEffectivelyVisible(object: THREE.Object3D): boolean {
    let ancestor: THREE.Object3D | null = object;
    while (ancestor) {
      if (!ancestor.visible) return false;
      ancestor = ancestor.parent;
    }
    return true;
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
    for (const parts of this.nodeParts.values()) this.disposeNodeParts(parts);
    for (const parts of this.linkParts.values()) this.disposeLinkParts(parts);
    this.nodeParts.clear();
    this.linkParts.clear();
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
    const unselectedWidth = this.host.config.modeConfig.threeD.linkWidth;
    if (
      !force
      && selection === this.linkSelection
      && unselectedWidth === this.appliedUnselectedLinkWidth
    ) return;
    this.linkSelection = selection;
    this.appliedUnselectedLinkWidth = unselectedWidth;

    this.graph
      .linkWidth((link) => (
        this.isLinkSelected(link)
          ? Math.max(link.width ?? LINK_WIDTH, unselectedWidth) * SELECTED_LINK_WIDTH
          : unselectedWidth
      ));
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

  private nodeRenderState(node: GraphNode): ThreeDRenderState {
    const dimmed = this.host.config.dimmed === true && (this.host.config.isNodeDimmed?.(node) ?? false);
    return {
      selected: this.host.config.isNodeSelected?.(node) ?? false,
      dimmed,
      opacity: dimmed ? this.host.config.dimOpacity ?? 0.15 : 1,
    };
  }

  private linkRenderState(link: GraphLink): ThreeDRenderState {
    const dimmed = this.host.config.dimmed === true && (this.host.config.isLinkDimmed?.(link) ?? false);
    return {
      selected: this.isLinkSelected(link),
      dimmed,
      opacity: dimmed ? this.host.config.dimOpacity ?? 0.15 : 1,
    };
  }

  private createNodeObject(node: GraphNode): THREE.Object3D {
    const previous = this.nodeParts.get(node);
    const geometry = node.shape === "square"
      ? this.boxGeometry
      : this.sphereGeometry;

    const body = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
    const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
    body.scale.setScalar(node.size);
    outline.scale.setScalar(node.size * SELECTED_OUTLINE_SCALE);

    const group = new THREE.Group();
    group.add(body, outline);

    const parts: NodeParts = {
      group,
      body,
      outline,
      label: null,
      labelText: "",
      labelRevision: -1,
      labelStyle: "",
      dirty: true,
      customVisual: null,
      releaseCustomVisual: null,
      renderState: { selected: false, dimmed: false, opacity: 1 },
      factory: undefined,
      refreshCustomVisual: false,
    };
    this.nodeParts.set(node, parts);
    this.updateFrustum();
    this.syncNode(node, parts);
    if (previous) this.disposeNodeParts(previous, parts);

    return group;
  }

  private replaceNodeCustomVisual(node: GraphNode, parts: NodeParts, state: ThreeDRenderState) {
    const factory = this.host.config.modeConfig.threeD.nodeObject;
    const previousVisual = parts.customVisual;
    const previousRelease = parts.releaseCustomVisual;

    if (factory) {
      const visual = factory(node, state);
      if (!isThreeObject(visual)) {
        throw new TypeError("[FalkorDBCanvas] threeD.nodeObject must return a Three.js Object3D");
      }
      const release = this.resourceTracker.acquire(visual);
      parts.group.add(visual);
      if (previousVisual && previousVisual !== visual) previousVisual.removeFromParent();
      previousRelease?.();
      parts.customVisual = visual;
      parts.releaseCustomVisual = release;
      parts.body.visible = false;
    } else {
      if (previousVisual) previousVisual.removeFromParent();
      previousRelease?.();
      parts.customVisual = null;
      parts.releaseCustomVisual = null;
      parts.body.visible = true;
    }

    parts.renderState = state;
    parts.factory = factory;
  }

  private styleNode(node: GraphNode, parts: NodeParts, state: ThreeDRenderState) {
    const { config } = this.host;
    const { body, outline } = parts;

    const opacity = state.opacity;
    if (parts.color !== node.color) {
      body.material.color.set(node.color);
      parts.color = node.color;
    }

    outline.visible = state.selected;
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
    const largeGraph = config.modeConfig.threeD.largeGraph;
    const showCaption = !largeGraph.enabled || this.host.data.nodes.length <= largeGraph.maxLabeledElements;
    const text = showCaption
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
        parts.group.add(parts.label);
        parts.label.visible = this.details.nodes;
      }
    }
    if (parts.label) parts.label.material.opacity = state.opacity;
  }

  private createLinkObject(link: GraphLink): THREE.Object3D {
    const previous = this.linkParts.get(link);
    const state = this.linkRenderState(link);
    const factory = this.host.config.modeConfig.threeD.linkObject;
    const dashPattern = factory ? [] : this.getDashPattern(link);
    const customVisual = factory?.(link, state) ?? null;
    if (factory && !isThreeObject(customVisual)) {
      throw new TypeError("[FalkorDBCanvas] threeD.linkObject must return a Three.js Object3D");
    }

    const dashedLine = !factory && dashPattern.length ? this.createDashedLine(link) : null;
    const labelObject = this.createLinkLabel(link);
    const label = labelObject instanceof THREE.Sprite ? labelObject : null;
    const width = state.selected
      ? Math.max(link.width ?? LINK_WIDTH, this.host.config.modeConfig.threeD.linkWidth) * SELECTED_LINK_WIDTH
      : this.host.config.modeConfig.threeD.linkWidth;
    const shaft = new LinkShaft(labelObject, width, this.shaftMaterial(link));
    const releaseCustomVisual = customVisual ? this.resourceTracker.acquire(customVisual) : null;
    if (customVisual) shaft.add(customVisual);
    if (dashedLine) shaft.add(dashedLine);
    shaft.setShaftVisible(!customVisual && !dashedLine);

    const parts: LinkParts = {
      root: shaft,
      label,
      customVisual,
      dashedLine,
      releaseCustomVisual,
      renderState: state,
      factory,
      dashPatternFactory: this.host.config.modeConfig.threeD.linkDashPattern,
      dashPattern,
      shaft,
    };
    if (previous) this.disposeLinkParts(previous, parts);
    if (shaft) this.linkShafts.set(link, shaft);
    else this.linkShafts.delete(link);
    this.linkParts.set(link, parts);
    return shaft;
  }

  private createLinkLabel(link: GraphLink): THREE.Object3D {
    const { config } = this.host;
    const largeGraph = config.modeConfig.threeD.largeGraph;
    if (largeGraph.enabled && this.host.data.links.length > largeGraph.maxLabeledElements) {
      return new THREE.Object3D();
    }

    const sprite = this.createTextSprite(link.relationship, {
      height: (link.fontSize ?? LINK_FONT_SIZE) * 0.6,
      font: `${config.linkStyle.fontWeightUnselected} ${LABEL_TEXTURE_HEIGHT * 0.8}px ${config.linkStyle.fontFamily}`,
      color: getContrastTextColor(config.backgroundColor, config.interaction.contrastThreshold),
      background: config.backgroundColor,
    });
    if (!sprite) return new THREE.Object3D();

    sprite.material.opacity = this.linkOpacity(link);
    sprite.visible = this.details.links;
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

  private getDashPattern(link: GraphLink): number[] {
    const factory = this.host.config.modeConfig.threeD.linkDashPattern;
    const parts = this.linkParts.get(link);
    if (!this.refreshingDashPatterns && parts && parts.dashPatternFactory === factory) return parts.dashPattern;
    return this.computeDashPattern(link);
  }

  private computeDashPattern(link: GraphLink): number[] {
    const pattern = this.host.config.modeConfig.threeD.linkDashPattern?.(link) ?? [];
    if (pattern.length === 0) return [];
    if (pattern.some((length) => !Number.isFinite(length) || length <= 0)) {
      throw new TypeError("[FalkorDBCanvas] threeD.linkDashPattern must return positive finite lengths or an empty array");
    }
    return pattern.length % 2 === 0 ? [...pattern] : [...pattern, ...pattern];
  }

  private createDashedLine(link: GraphLink): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    const material = new THREE.LineBasicMaterial({
      color: this.linkColor(link),
      opacity: 0.9,
      transparent: true,
    });
    return new THREE.LineSegments(geometry, material);
  }

  private updateLinkObjectPosition(
    object: THREE.Object3D,
    coordinates: { start: CanvasVector3; end: CanvasVector3 },
    link: GraphLink,
  ): boolean {
    const parts = this.linkParts.get(link);
    const curve = (link as GraphLink & { __curve?: THREE.Curve<THREE.Vector3> | null }).__curve;
    const midpoint = curve
      ? curve.getPoint(0.5)
      : new THREE.Vector3(
        (coordinates.start.x + coordinates.end.x) / 2,
        (coordinates.start.y + coordinates.end.y) / 2,
        (coordinates.start.z + coordinates.end.z) / 2,
      );

    const shaft = parts?.shaft ?? (object instanceof LinkShaft ? object : null);
    if (shaft) {
      if (parts?.dashedLine) {
        updateDashedLine(parts.dashedLine, parts.dashPattern, coordinates, curve);
        const material = parts.dashedLine.material as THREE.LineBasicMaterial;
        material.color.set(this.linkColor(link));
        material.opacity = 0.9;
        material.transparent = true;
        if (parts.label) parts.label.position.copy(midpoint);
        object.position.set(0, 0, 0);
        return true;
      }

      if (parts?.customVisual) {
        const update = this.host.config.modeConfig.threeD.linkObjectPositionUpdate;
        if (update) {
          object.position.set(0, 0, 0);
          update(parts.customVisual, coordinates, link);
          if (parts.label) parts.label.position.copy(midpoint);
        } else {
          object.position.set(0, 0, 0);
          parts.customVisual.position.copy(midpoint);
          if (parts.label) parts.label.position.copy(midpoint);
        }
        return true;
      }

      shaft.label.position.copy(midpoint);
      shaft.update(
        new THREE.Vector3(coordinates.start.x, coordinates.start.y, coordinates.start.z ?? 0),
        new THREE.Vector3(coordinates.end.x, coordinates.end.y, coordinates.end.z ?? 0),
        curve ?? null,
        typeof link.target === "number" ? 0 : link.target.size,
        this.arrowLength(link),
      );
      if (parts?.label) this.syncLinkLabel(link, parts.label);
      object.position.set(0, 0, 0);
      return true;
    }

    object.position.copy(midpoint);
    return false;
  }

  private replaceLinkVisual(link: GraphLink, parts: LinkParts, state: ThreeDRenderState) {
    const factory = this.host.config.modeConfig.threeD.linkObject;
    const dashPattern = factory ? [] : this.getDashPattern(link);
    if (!factory && dashPattern.length === 0 && !parts.customVisual && !parts.dashedLine && parts.shaft) {
      parts.renderState = state;
      const width = state.selected
        ? Math.max(link.width ?? LINK_WIDTH, this.host.config.modeConfig.threeD.linkWidth) * SELECTED_LINK_WIDTH
        : this.host.config.modeConfig.threeD.linkWidth;
      parts.shaft.setStyle(width, this.shaftMaterial(link));
      if (parts.label?.visible) parts.label.material.opacity = state.opacity;
      return;
    }

    const customVisual = factory?.(link, state) ?? null;
    if (factory && !isThreeObject(customVisual)) {
      throw new TypeError("[FalkorDBCanvas] threeD.linkObject must return a Three.js Object3D");
    }
    const dashedLine = !factory && dashPattern.length ? this.createDashedLine(link) : null;
    const shaft = parts.shaft;
    if (!shaft) throw new Error("[FalkorDBCanvas] Missing 3D link shaft while replacing its visual");
    const releaseCustomVisual = customVisual ? this.resourceTracker.acquire(customVisual) : null;
    if (customVisual) shaft.add(customVisual);
    if (dashedLine) shaft.add(dashedLine);
    const width = state.selected
      ? Math.max(link.width ?? LINK_WIDTH, this.host.config.modeConfig.threeD.linkWidth) * SELECTED_LINK_WIDTH
      : this.host.config.modeConfig.threeD.linkWidth;
    shaft.setStyle(width, this.shaftMaterial(link));
    shaft.setShaftVisible(!customVisual && !dashedLine);

    const next: LinkParts = {
      root: parts.root,
      label: parts.label,
      customVisual,
      dashedLine,
      releaseCustomVisual,
      renderState: state,
      factory,
      dashPatternFactory: this.host.config.modeConfig.threeD.linkDashPattern,
      dashPattern,
      shaft,
    };
    this.disposeLinkParts(parts, next);
    this.linkParts.set(link, next);
    if (shaft) this.linkShafts.set(link, shaft);
    else this.linkShafts.delete(link);
  }

  private cleanupRemovedVisuals() {
    const nodes = new Set(this.host.data.nodes);
    for (const [node, parts] of this.nodeParts) {
      if (nodes.has(node)) continue;
      this.disposeNodeParts(parts);
      this.nodeParts.delete(node);
    }

    const links = new Set(this.host.data.links);
    for (const [link, parts] of this.linkParts) {
      if (links.has(link)) continue;
      this.disposeLinkParts(parts);
      this.linkParts.delete(link);
      this.linkShafts.delete(link);
    }
  }

  private disposeNodeParts(parts: NodeParts, replacement?: NodeParts) {
    if (parts.customVisual && parts.customVisual !== replacement?.customVisual) {
      parts.customVisual.removeFromParent();
    }
    parts.releaseCustomVisual?.();
    parts.group.removeFromParent();
  }

  private disposeLinkParts(parts: LinkParts, replacement?: LinkParts) {
    if (parts.customVisual && parts.customVisual !== replacement?.customVisual) {
      parts.customVisual.removeFromParent();
    }
    parts.releaseCustomVisual?.();
    if (parts.shaft && parts.shaft !== replacement?.shaft) {
      parts.shaft.dispose();
      parts.shaft.removeFromParent();
    }
    if (parts.dashedLine && parts.dashedLine !== replacement?.dashedLine) {
      parts.dashedLine.geometry.dispose();
      (parts.dashedLine.material as THREE.Material).dispose();
      parts.dashedLine.removeFromParent();
    }
    if (!parts.shaft && parts.label && parts.label !== replacement?.label) {
      parts.label.removeFromParent();
      parts.label.material.dispose();
    }
    if (parts.root !== replacement?.root) parts.root.removeFromParent();
  }
}

function sameRenderState(left: ThreeDRenderState, right: ThreeDRenderState): boolean {
  return left.selected === right.selected && left.dimmed === right.dimmed && left.opacity === right.opacity;
}

function isThreeObject(value: unknown): value is THREE.Object3D {
  return !!value
    && typeof value === "object"
    && "isObject3D" in value
    && value.isObject3D === true
    && "traverse" in value
    && typeof value.traverse === "function";
}

function updateDashedLine(
  line: THREE.LineSegments,
  pattern: number[],
  coordinates: { start: CanvasVector3; end: CanvasVector3 },
  curve?: THREE.Curve<THREE.Vector3> | null,
) {
  const maxLineSegments = 4096;
  const start = new THREE.Vector3(coordinates.start.x, coordinates.start.y, coordinates.start.z);
  const end = new THREE.Vector3(coordinates.end.x, coordinates.end.y, coordinates.end.z);
  curve?.updateArcLengths();
  const length = curve?.getLength() ?? start.distanceTo(end);
  const positions: number[] = [];
  let distance = 0;
  let patternIndex = 0;
  let patternSteps = 0;
  let generatedSegments = 0;

  while (distance < length && length > 0) {
    if (patternSteps >= maxLineSegments * 2) {
      throw new RangeError(`[FalkorDBCanvas] threeD.linkDashPattern exceeds ${maxLineSegments} line segments for a link`);
    }
    patternSteps++;
    const span = Math.min(pattern[patternIndex], length - distance);
    if (patternIndex % 2 === 0) {
      const segments = curve ? Math.max(1, Math.ceil(span / 2)) : 1;
      if (generatedSegments + segments > maxLineSegments) {
        throw new RangeError(`[FalkorDBCanvas] threeD.linkDashPattern exceeds ${maxLineSegments} line segments for a link`);
      }
      generatedSegments += segments;
      for (let segment = 0; segment < segments; segment++) {
        const segmentStart = distance + (span * segment) / segments;
        const segmentEnd = distance + (span * (segment + 1)) / segments;
        const from = curve ? curve.getPointAt(segmentStart / length) : start.clone().lerp(end, segmentStart / length);
        const to = curve ? curve.getPointAt(segmentEnd / length) : start.clone().lerp(end, segmentEnd / length);
        positions.push(from.x, from.y, from.z, to.x, to.y, to.z);
      }
    }
    distance += span;
    patternIndex = (patternIndex + 1) % pattern.length;
  }

  const current = line.geometry.getAttribute("position");
  if (current && current.array.length === positions.length) {
    for (let index = 0; index < positions.length; index++) current.array[index] = positions[index];
    current.needsUpdate = true;
  } else {
    line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  }
  line.geometry.computeBoundingSphere();

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
  node.x ??= 0;
  node.y ??= 0;
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
