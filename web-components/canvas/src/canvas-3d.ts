import ForceGraph3D, { type ForceGraph3DInstance } from "3d-force-graph";
import * as THREE from "three";
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
} from "./canvas-utils.js";
import { computeRadialPositions } from "./layouts.js";

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

/**
 * `getZoom()`/`zoom()` express camera distance as a zoom factor, so callers
 * that scale the current zoom (`zoom(getZoom() * 1.1)`) work in both
 * dimensions: zoom `k` puts the camera `ZOOM_REFERENCE_DISTANCE / k` away
 * from what it looks at.
 */
const ZOOM_REFERENCE_DISTANCE = 500;

/**
 * The radial layout is a cone in 3D: each ring keeps its 2D radius and sits
 * this far back per unit of it, so rings stay readable face-on and rotating
 * the view shows the levels in depth. (Nested spheres, the library's own
 * radial mode, collapse into one ball on screen.)
 */
const RADIAL_CONE_SLOPE = 0.6;

type Instance = ForceGraph3DInstance<GraphNode, GraphLink>;

type Vec3 = { x: number; y: number; z: number };

type Node3D = GraphNode & { z?: number; vz?: number; fz?: number };

/** The scene objects of one node, kept so a restyle can update them in place. */
type NodeParts = {
  body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  outline: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  label: THREE.Sprite | null;
  labelText: string;
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

  /** Selected link ids, as last applied — link widths only change with the selection. */
  private linkSelection = "";

  /**
   * The library lays data out on a debounced update, so until the engine next
   * reports, node positions are still the starting cluster. A fit asked for in
   * that window waits for the layout, or it frames the wrong extent.
   */
  private layoutPending = false;

  private pendingFit: { filter?: (node: GraphNode) => boolean } | null = null;

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
      .linkThreeObjectExtend(true)
      .linkThreeObject((link) => this.createLinkLabel(link))
      .linkPositionUpdate((obj, { start, end }, link) => {
        const curve = (link as GraphLink & { __curve?: THREE.Curve<THREE.Vector3> | null }).__curve;
        const mid = curve
          ? curve.getPoint(0.5)
          : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, z: (start.z + end.z) / 2 };
        obj.position.set(mid.x, mid.y, mid.z);
      })
      .enableNodeDrag(true)
      // Graphs with cycles are the norm: level them as well as possible
      // instead of throwing.
      .onDagError(() => {});

    this.applyLinkSelection(true);
    this.bindEventHandlers();
  }

  /**
   * Bring every object in line with the current config: colours, selection
   * and dimming. Cheap enough to run on every hover.
   */
  restyle() {
    for (const node of this.host.data.nodes) {
      const parts = this.nodeParts.get(node);
      if (parts) this.styleNode(node, parts);
    }

    for (const link of this.host.data.links) {
      const label = this.linkLabels.get(link);
      if (label) label.material.opacity = this.linkOpacity(link);
    }

    // Colours are re-read when the accessors are set; that keeps the objects.
    this.graph
      .linkColor((link) => this.linkColor(link))
      .linkDirectionalArrowColor((link) => this.linkColor(link));
    this.applyLinkSelection();
  }

  /** Recreate every object, for changes restyle() does not cover (sizes, shapes, captions' colours). */
  rebuild() {
    this.graph.refresh();
    this.restyle();
  }

  setBackgroundColor(color: string) {
    this.graph.backgroundColor(color);
    // Captions are coloured against the background.
    this.rebuild();
  }

  setSize(width: number, height: number) {
    this.graph.width(width).height(height);
  }

  /**
   * Lay the host's data out again under `config.layoutMode`. Force runs
   * freely; tree and radial constrain each node to its DAG level.
   */
  applyLayout(fit = false) {
    const { layoutMode, layoutOptions, simulation, animation, pinOnDragEnd } = this.host.config;
    this.layoutPending = true;
    if (fit) this.pendingFit = {};
    const running = !!animation && !pinOnDragEnd;

    this.setupForces();
    for (const node of this.host.data.nodes) unpin3D(node);

    if (layoutMode === "tree") {
      this.graph.dagMode(layoutOptions.tree?.direction ?? "td");
      this.graph.dagLevelDistance(layoutOptions.tree?.levelDistance ?? 80);
    } else if (layoutMode === "radial") {
      // Cleared first: turning DAG mode off unpins every node.
      this.graph.dagMode(null as never);
      this.placeOnCone();
    } else {
      this.graph.dagMode(null as never);
    }

    // As in 2D: the layout is settled up front, then either keeps running with
    // animation on or is held still.
    this.graph.warmupTicks(simulation.warmupTicks);
    this.graph.cooldownTicks(running ? Infinity : 0);
    this.host.setEngineStatus(running);

    // Handing the data over again is what re-runs the warmup; a fresh wrapper
    // so it is never taken for the data already shown.
    const { nodes, links } = this.host.data;
    this.graph.graphData({ nodes, links });
    this.restyle();
  }

  /** Show the host's data as it changed, keeping the nodes that stayed where they are. */
  updateData() {
    const { nodes, links } = this.host.data;
    this.graph.graphData({ nodes, links });
    this.restyle();
  }

  /*
   * Pausing and pinning stop the engine rather than fixing every node, as 2D
   * does: the library lays data out on a debounced update, so nodes pinned
   * right after a layout change would be frozen where the old layout left them.
   */

  /** Pin every node to the 2D radial layout's rings, laid out along a cone; see RADIAL_CONE_SLOPE. */
  private placeOnCone() {
    computeRadialPositions(this.host.data, this.host.config.layoutOptions);

    for (const node of this.host.data.nodes as Node3D[]) {
      const x = node.x ?? 0;
      // The 2D canvas's y axis points down, three.js's up.
      const y = -(node.y ?? 0);
      const z = -Math.hypot(x, y) * RADIAL_CONE_SLOPE;
      node.x = node.fx = x;
      node.y = node.fy = y;
      node.z = node.fz = z;
      node.vx = node.vy = node.vz = 0;
    }
  }

  setAnimation(enabled: boolean) {
    if (enabled && !this.host.config.pinOnDragEnd) {
      this.graph.cooldownTicks(Infinity).d3ReheatSimulation();
      this.host.setEngineStatus(true);
    } else if (!enabled) {
      this.graph.cooldownTicks(0);
      this.host.setEngineStatus(false);
    }
  }

  setPinned(pinned: boolean) {
    if (pinned) {
      this.graph.cooldownTicks(0);
      this.host.setEngineStatus(false);
      return;
    }

    for (const node of this.host.data.nodes) unpin3D(node);
    if (this.host.config.animation) {
      this.graph.cooldownTicks(Infinity).d3ReheatSimulation();
      this.host.setEngineStatus(true);
    }
  }

  setupForces() {
    const { layoutOptions, simulation } = this.host.config;
    const linkDist = layoutOptions.force?.linkDistance ?? LINK_DISTANCE;

    this.graph.d3Force("link")?.distance?.((link: GraphLink) => link.source.size + link.target.size + linkDist * 2);
    this.graph.d3Force("charge")?.strength?.(simulation.chargeStrength);
    this.graph.d3VelocityDecay(simulation.velocityDecay);
    this.graph.d3AlphaMin(simulation.alphaMin);
  }

  /**
   * Frame the visible nodes, or those `filter` keeps, once any layout in
   * progress has landed. Keeps the camera's viewing angle.
   *
   * Measured from the node data rather than with the library's own zoomToFit,
   * which reads the scene objects — and those only catch up with a new layout
   * a frame or more after it has landed.
   */
  zoomToFit(filter?: (node: GraphNode) => boolean, durationMs = 0) {
    if (this.layoutPending) {
      this.pendingFit = { filter };
      return;
    }

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
    const distance = radius / Math.sin(Math.atan(halfView));

    const direction = this.cameraOffset();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    direction.setLength(distance);

    this.graph.cameraPosition(
      { x: center.x + direction.x, y: center.y + direction.y, z: center.z + direction.z },
      { x: center.x, y: center.y, z: center.z },
      durationMs,
    );
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
  }

  destroy() {
    this.graph._destructor();
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
      .onNodeDragEnd((node) => {
        // The library has released the drag's own pin by now.
        if (this.host.config.pinOnDragEnd) pin3D(node);
        handlers()?.onNodeDragEnd?.(node);
      })
      // The engine first ticks, or stops, right after a layout has been applied.
      .onEngineTick(() => this.layoutLanded())
      .onEngineStop(() => {
        this.host.log("3D engine stopped");
        this.layoutLanded();
        this.host.setEngineStatus(false);
        handlers()?.onEngineStop?.();
      });
  }

  private layoutLanded() {
    if (!this.layoutPending) return;
    this.layoutPending = false;
    const fit = this.pendingFit;
    this.pendingFit = null;
    if (fit) this.zoomToFit(fit.filter);
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
      .linkWidth((link) => (this.isLinkSelected(link) ? (link.width ?? LINK_WIDTH) * SELECTED_LINK_WIDTH : 0))
      .linkDirectionalArrowLength((link) => (link.arrowSize ?? ARROW_SIZE) * (this.isLinkSelected(link) ? SELECTED_LINK_WIDTH : 1));
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
    if (opacity === 1) return link.color;
    return d3.interpolateRgb(this.host.config.backgroundColor, link.color)(opacity);
  }

  private createNodeObject(node: GraphNode): THREE.Object3D {
    const geometry = node.shape === "square"
      ? new THREE.BoxGeometry(node.size * 2, node.size * 2, node.size * 2)
      : new THREE.SphereGeometry(node.size, 24, 16);

    const body = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
    const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
    outline.scale.setScalar(SELECTED_OUTLINE_SCALE);

    const group = new THREE.Group();
    group.add(body, outline);

    const parts: NodeParts = { body, outline, label: null, labelText: "" };
    this.nodeParts.set(node, parts);
    this.styleNode(node, parts);

    return group;
  }

  private styleNode(node: GraphNode, parts: NodeParts) {
    const { config } = this.host;
    const opacity = this.nodeOpacity(node);
    const { body, outline } = parts;

    body.material.color.set(node.color);
    body.material.opacity = opacity;
    body.material.transparent = opacity < 1;

    outline.visible = config.isNodeSelected?.(node) ?? false;
    outline.material.color.set(node.borderColor ?? config.foregroundColor);
    outline.material.opacity = opacity;
    outline.material.transparent = opacity < 1;

    const text = this.host.data.nodes.length <= MAX_LABELED_ELEMENTS
      ? getNodeDisplayText(node, config.captionsKeys, config.showPropertyKeyPrefix)
      : "";
    if (text !== parts.labelText) {
      if (parts.label) {
        parts.label.removeFromParent();
        disposeSprite(parts.label);
      }
      parts.label = createTextSprite(text, {
        height: Math.max(node.size * 0.6, 3),
        font: `${config.nodeStyle.fontWeightUnselected} ${LABEL_TEXTURE_HEIGHT * 0.8}px ${config.nodeStyle.fontFamily}`,
        color: getContrastTextColor(config.backgroundColor, config.interaction.contrastThreshold),
      });
      parts.labelText = text;
      if (parts.label) {
        // Under the node: inside it, the caption would be hidden by the surface.
        parts.label.position.y = -(node.size * SELECTED_OUTLINE_SCALE + parts.label.scale.y / 2);
        body.parent?.add(parts.label);
      }
    }
    if (parts.label) parts.label.material.opacity = opacity;
  }

  private createLinkLabel(link: GraphLink): THREE.Object3D {
    const { config } = this.host;
    if (this.host.data.links.length > MAX_LABELED_ELEMENTS) return new THREE.Object3D();

    const sprite = createTextSprite(link.relationship, {
      height: (link.fontSize ?? LINK_FONT_SIZE) * 0.6,
      font: `${config.linkStyle.fontWeightUnselected} ${LABEL_TEXTURE_HEIGHT * 0.8}px ${config.linkStyle.fontFamily}`,
      color: getContrastTextColor(config.backgroundColor, config.interaction.contrastThreshold),
      background: config.backgroundColor,
    });
    if (!sprite) return new THREE.Object3D();

    sprite.material.opacity = this.linkOpacity(link);
    this.linkLabels.set(link, sprite);
    return sprite;
  }
}

/** Fix `node` where it is, in all three axes. */
function pin3D(node: Node3D) {
  node.fx = node.x;
  node.fy = node.y;
  node.fz = node.z;
}

function unpin3D(node: Node3D) {
  delete node.fx;
  delete node.fy;
  delete node.fz;
}

/**
 * A camera-facing text label `height` world units tall, or null when there is
 * nothing to draw or no 2D context to draw it with (e.g. a headless browser).
 */
function createTextSprite(
  text: string,
  options: { height: number; font: string; color: string; background?: string },
): THREE.Sprite | null {
  if (!text) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const padding = options.background ? LABEL_TEXTURE_HEIGHT * 0.2 : 0;
  ctx.font = options.font;
  canvas.width = Math.max(Math.ceil(ctx.measureText(text).width + padding * 2), 1);
  canvas.height = LABEL_TEXTURE_HEIGHT;

  // Resizing the canvas reset its state, the font included.
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set((options.height * canvas.width) / canvas.height, options.height, 1);
  return sprite;
}

function disposeSprite(sprite: THREE.Sprite) {
  sprite.material.map?.dispose();
  sprite.material.dispose();
}
