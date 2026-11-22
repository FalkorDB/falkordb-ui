import { NodeObject } from "force-graph";
import type { Object3D } from "three";

// ─── Style & Behavior Sub-Configs ────────────────────────────────────────────

/** Node style fields shared by the 2D and 3D renderers. */
export interface NodeStyleConfig {
  /** Font family for node labels. Default: 'SofiaSans' */
  fontFamily?: string;
  /** Font weight when node is not selected. Default: 400 */
  fontWeightUnselected?: number;
  /** Font weight when node is selected. Default: 700 */
  fontWeightSelected?: number;
}

/** Canvas-specific node style fields. */
export interface TwoDNodeStyleConfig {
  /**
   * Fixed font size for node labels (world units). Default: 6.
   * When set, text uses this exact size (no auto-scaling).
   * For inside captions, textFillRatio takes precedence when positive.
   */
  fontSize?: number;
  /**
   * Fraction of node radius that text fills (0–1). Default: 0.85.
   * Inside captions auto-scale on one line to fit within this fraction of the node radius.
   * Takes precedence over fontSize when set.
   * Set to 0 and provide fontSize for fixed-size text.
   */
  textFillRatio?: number;
  /** 2D caption placement. Default: 'inside'. In 3D captions are always below the node. */
  captionPosition?: 'inside' | 'above' | 'below' | 'left' | 'right';
  /** Gap between the node border and an outside 2D caption, in world units. Must be non-negative and finite. Default: 1. */
  captionGap?: number;
  /** Stroke width when node is selected. Default: 1 */
  strokeWidthSelected?: number;
  /** Stroke width when node is not selected. Default: 0.5 */
  strokeWidthUnselected?: number;
  /** Glow effect duration in ms after expand/collapse. Default: 10000 */
  glowDuration?: number;
  /** Glow spread radius in px. Default: 12 */
  glowSpread?: number;
  /** Number of gradient rings in glow. Default: 16 */
  glowSteps?: number;
  /** Glow color as [r, g, b]. Default: [59, 130, 246] (blue) */
  glowColor?: [number, number, number];
  /** Glow maximum opacity (0–1). Default: 0.6 */
  glowMaxOpacity?: number;
}

/** Link style fields shared by the 2D and 3D renderers. */
export interface LinkStyleConfig {
  /** Font family for link labels. Default: 'SofiaSans' */
  fontFamily?: string;
  /** Default link label font size in world units. Per-link fontSize takes precedence. Default: 6 */
  fontSize?: number;
  /** Font weight when link is not selected. Default: 400 */
  fontWeightUnselected?: number;
  /** Font weight when link is selected. Default: 700 */
  fontWeightSelected?: number;
}

/** Canvas-specific link style fields. */
export interface TwoDLinkStyleConfig {
  /** Arrow width-to-height ratio. Default: 1.6 */
  arrowWidthRatio?: number;
  /** Arrow notch depth ratio. Default: 0.2 */
  arrowNotchRatio?: number;
  /** Self-loop curve factor. Default: 11.67 */
  selfLoopCurveFactor?: number;
  /** Parallel edge curve multiplier. Default: 0.4 */
  parallelEdgeCurveMultiplier?: number;
  /** Label background padding (world units). Default: 0.3 */
  labelBackgroundPadding?: number;
  /** Gap between edge tip and visible node border (in px). Default: 2 */
  edgeGap?: number;
}

/** Force simulation parameters */
export interface SimulationConfig {
  /** Center force strength (X and Y). Default: 0.03 */
  centerStrength?: number;
  /** Charge strength for node repulsion. Default: -400 */
  chargeStrength?: number;
  /** Velocity decay (damping). Default: 0.4 */
  velocityDecay?: number;
  /** Alpha min (convergence stop threshold). Default: 0.05 */
  alphaMin?: number;
  /** Number of warmup ticks for force simulation. Default: 300 */
  warmupTicks?: number;
  /**
   * Run 3D force physics in a module worker at 1,000+ nodes. Tree/radial and
   * 2D layouts are unchanged. Unsupported browsers use local physics; load or
   * runtime errors log and fall back to local physics for the mounted renderer.
   * Default: `true`.
   */
  workerLayout?: boolean;
  /**
   * Maximum distance for charge force interaction. Nodes beyond this distance don't repel.
   * - `number`: fixed value (e.g. 1500)
   * - `"auto"`: automatically calculated based on node count (sqrt(nodeCount) * 30)
   * - `undefined` / not set: disabled (Infinity — no limit)
   * Default: disabled.
   */
  chargeDistanceMax?: number | "auto";
  /**
   * Node count above which collision force is disabled for performance.
   * - `number`: threshold (e.g. 3000 — disable collide when nodes > 3000)
   * - `0` or `undefined` / not set: never disable
   * Default: disabled (0).
   */
  disableCollisionAbove?: number;
}

/** Interaction fields shared by the 2D and 3D renderers. */
export interface InteractionConfig {
  /** Tooltip font size in px. Default: 12 */
  tooltipFontSize?: number;
  /** Tooltip padding CSS value. Default: '4px 8px' */
  tooltipPadding?: string;
  /** Tooltip border radius CSS value. Default: '4px' */
  tooltipBorderRadius?: string;
  /** Tooltip z-index. Default: 1000 */
  tooltipZIndex?: number;
  /** Zoom-to-fit padding as fraction of smallest dimension. Default: 0.1 */
  zoomToFitPadding?: number;
  /** Maximum zoom level after zoomToFit (prevents over-zoom on few nodes). Default: 8 */
  zoomToFitMaxZoom?: number;
  /** Luminance threshold for switching to dark text on light nodes. Default: 0.5 */
  contrastThreshold?: number;
}

/** Canvas-specific interaction fields. */
export interface TwoDInteractionConfig {
  /** Delay (ms) before zoom-to-fit after layout change. Default: 50 */
  zoomToFitDelay?: number;
  /** Link pointer hit-test width in screen px. Default: 10 */
  linkHitWidth?: number;
}

/**
 * Configuration for large-graph rendering optimisations.
 * All options are optional; the feature is enabled by default (`enabled: true`).
 */
export interface TwoDLargeGraphConfig {
  /**
   * Master switch. When `true` (default) viewport culling and low-zoom
   * optimisations are active in the Canvas 2D renderer.
   */
  enabled?: boolean;

  /**
   * Extra padding added around the visible viewport (in world-space units) when
   * deciding whether a node or link is offscreen.  Increase this to pre-render
   * elements just outside the visible area and avoid pop-in during fast panning.
   * Default: `0`.
   */
  viewportPadding?: number;

  /**
   * Zoom level below which expensive per-element details are skipped.
   * When the current zoom (k) drops to or below this value, labels and arrows
   * are hidden to improve rendering performance.
   * `0.5` = skip at half zoom, `0.3` = skip only when very zoomed out.
   * Default: `1`.
   */
  lowZoomThreshold?: number;

  /**
   * Skip drawing node labels when zoomed out beyond `lowZoomThreshold`.
   * Node circles are still drawn so the graph shape remains visible.
   * Default: `true`.
   */
  skipLabelsAtLowZoom?: boolean;

  /**
   * Skip drawing link arrowheads when zoomed out beyond `lowZoomThreshold`.
   * Default: `true`.
   */
  skipArrowsAtLowZoom?: boolean;

  /**
   * Skip drawing link relationship labels when zoomed out beyond `lowZoomThreshold`.
   * Default: `true`.
   */
  skipLinkLabelsAtLowZoom?: boolean;
}

/** Event handler callbacks for user interactions with the graph */
export interface EventHandlers {
  /** Fired when a node is left-clicked */
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Fired when a link/edge is left-clicked */
  onLinkClick?: (link: GraphLink, event: MouseEvent) => void;
  /** Fired when a node is right-clicked */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Fired when a link/edge is right-clicked */
  onLinkRightClick?: (link: GraphLink, event: MouseEvent) => void;
  /** Fired when a node is hovered (null when hover leaves) */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Fired when a node drag ends */
  onNodeDragEnd?: (node: GraphNode) => void;
  /** Fired when pin state changes (nodes pinned/unpinned) */
  onPinChange?: (pinned: boolean) => void;
  /** Fired when a link is hovered (null when hover leaves) */
  onLinkHover?: (link: GraphLink | null) => void;
  /** Fired when the canvas background is left-clicked */
  onBackgroundClick?: (event: MouseEvent) => void;
  /** Fired when the canvas background is right-clicked */
  onBackgroundRightClick?: (event: MouseEvent) => void;
  /** Fired on zoom/pan with the current transform */
  onZoom?: (transform: Transform) => void;
  /** Fired when the force simulation finishes (engine stops) */
  onEngineStop?: () => void;
  /** Fired when the layout mode changes */
  onLayoutChange?: (layout: LayoutMode) => void;
  /** Fired once the canvas is showing the graph in a new dimension (after the 3D renderer has loaded) */
  onDimensionChange?: (dimension: CanvasDimension) => void;
}

/**
 * Shared configuration for the FalkorDB Canvas graph visualization.
 * All properties are optional — unset values use sensible defaults.
 */
export interface CanvasConfig {
  // ─── Dimensions & Colors ─────────────────────────────────────────────────────
  /** Canvas width in pixels. Auto-detected from container if not set. */
  width?: number;
  /** Canvas height in pixels. Auto-detected from container if not set. */
  height?: number;
  /** Canvas background color (CSS color string). Default: '#222222' */
  backgroundColor?: string;
  /** Foreground color for strokes and labels (CSS color string). Default: '#f0f0f0' */
  foregroundColor?: string;

  // ─── Layout ──────────────────────────────────────────────────────────────────
  /**
   * Render the graph flat on a 2D canvas or in 3D with WebGL. Default: '2d'.
   * The 3D renderer (three.js) is loaded on first use.
   */
  dimension?: CanvasDimension;
  /** Active layout algorithm: 'force' (physics), 'tree' (hierarchical), or 'radial' (circular rings). Default: 'force' */
  layoutMode?: LayoutMode;
  /** Per-layout-mode options (tree direction/spacing, radial direction/spacing, force link distance). */
  layoutOptions?: LayoutOptions;

  // ─── Style Sub-Configs ───────────────────────────────────────────────────────
  /** Node label style shared by both renderers */
  nodeStyle?: NodeStyleConfig;
  /** Link label style shared by both renderers */
  linkStyle?: LinkStyleConfig;
  /** Force simulation tuning */
  simulation?: SimulationConfig;
  /** Interaction / UX fields shared by both renderers */
  interaction?: InteractionConfig;

  // ─── Display Options ─────────────────────────────────────────────────────────
  /** Enable/disable force simulation animation. When false, nodes are pinned in place. */
  animation?: boolean;
  /**
   * Ordered list of data property keys to use as node label text.
   * Each entry is either a plain string (fuzzy match, case-insensitive) or a
   * `[key, exactMatch]` tuple. The first matching non-empty property is used.
   * Falls back to `node.id` if no keys match.
   * @example ["name", "title"] — tries 'name' first, then 'title'
   * @example [["Name", true]] — exact match only for 'Name'
   */
  captionsKeys?: Array<string | [string, boolean?]>;
  /** When true, display the property key prefix before the value in labels (e.g. "name: Foo"). Default: false */
  showPropertyKeyPrefix?: boolean;
  /** When true, nodes stay pinned at their position after being dragged. Default: false */
  pinOnDragEnd?: boolean;

  // ─── Selection ───────────────────────────────────────────────────────────────
  /** Predicate that returns true if a link should be rendered in its "selected" style */
  isLinkSelected?: (link: GraphLink) => boolean;
  /** Predicate that returns true if a node should be rendered in its "selected" style */
  isNodeSelected?: (node: GraphNode) => boolean;
  /**
   * Predicate that returns true if a node should be rendered dimmed (reduced opacity).
   * Used to implement focus mode — all elements not in the focused set are dimmed.
   */
  isNodeDimmed?: (node: GraphNode) => boolean;
  /**
   * Predicate that returns true if a link should be rendered dimmed (reduced opacity).
   * Used to implement focus mode — all elements not in the focused set are dimmed.
   */
  isLinkDimmed?: (link: GraphLink) => boolean;
  /**
   * Opacity multiplier applied to dimmed nodes and links (0–1). Default: 0.15.
   */
  dimOpacity?: number;
  /**
   * Master switch for the dim/focus effect. When `false` (default), `isNodeDimmed`
   * and `isLinkDimmed` are never evaluated — the canvas renders at full opacity.
   * Set to `true` to activate focus mode dimming.
   */
  dimmed?: boolean;

  /** Canvas-only settings; retained while the 3D renderer is active. */
  twoD?: TwoDConfig;
  /** WebGL-only settings; retained while the 2D renderer is active. */
  threeD?: ThreeDConfig;

  // ─── Event Handlers ──────────────────────────────────────────────────────────
  /** Event handler callbacks */
  eventHandlers?: EventHandlers;
}

/** Settings used only by the Canvas 2D renderer. */
export interface TwoDConfig {
  nodeStyle?: TwoDNodeStyleConfig;
  linkStyle?: TwoDLinkStyleConfig;
  interaction?: TwoDInteractionConfig;
  largeGraph?: TwoDLargeGraphConfig;
  /** Returns a dash pattern array for a given link (use [] for solid lines). */
  linkLineDash?: (link: GraphLink) => number[];
  /** Custom draw and pointer-area callbacks; replaces the built-in renderer. */
  node?: {
    nodeCanvasObject: (node: GraphNode, ctx: CanvasRenderingContext2D) => void;
    nodePointerAreaPaint: (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => void;
  };
  /** Custom draw and pointer-area callbacks; replaces the built-in renderer. */
  link?: {
    linkCanvasObject: (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    linkPointerAreaPaint: (link: GraphLink, color: string, ctx: CanvasRenderingContext2D) => void;
  };
}

/** Large-graph controls for the 3D renderer. */
export interface ThreeDLargeGraphConfig {
  /**
   * Enables CPU-side frustum checks, caption limits, low-zoom optimisations,
   * and node instancing. Three.js native frustum culling remains active.
   * Default: `true`.
   */
  enabled?: boolean;
  /** Maximum node or link count for which individual captions are created. Default: 1000. */
  maxLabeledElements?: number;
  /** Batch opaque node bodies for graphs with at least 1,000 nodes. Default: `true`. */
  nodeInstancing?: boolean;
  /** World-unit padding for CPU-side offscreen bounds. Default: `0`. */
  viewportPadding?: number;
  /** Zoom level below which optional labels/arrows are hidden. Default: `1`. */
  lowZoomThreshold?: number;
  /** Skip node captions at low zoom. Default: `true`. */
  skipLabelsAtLowZoom?: boolean;
  /** Skip link arrowheads at low zoom. Default: `true`. */
  skipArrowsAtLowZoom?: boolean;
  /** Skip link captions at low zoom. Default: `true`. */
  skipLinkLabelsAtLowZoom?: boolean;
}

/** Visual state supplied to custom 3D node and link factories. */
export interface ThreeDRenderState {
  selected: boolean;
  dimmed: boolean;
  opacity: number;
}

/** Settings used only by the Three.js renderer. */
export interface ThreeDConfig {
  largeGraph?: ThreeDLargeGraphConfig;
  /** Unselected tube width in world units. Zero retains the current hairline default. */
  linkWidth?: number;
  /** Replaces a node's built-in body while retaining its caption and selection outline. */
  nodeObject?: (node: GraphNode, state: ThreeDRenderState) => Object3D;
  /** Replaces a link's built-in line while retaining its relationship label. */
  linkObject?: (link: GraphLink, state: ThreeDRenderState) => Object3D;
  /**
   * Dash and gap lengths in world units; an empty pattern keeps the native solid link.
   * A link-position update that would exceed 4096 rendered segments throws a RangeError.
   */
  linkDashPattern?: (link: GraphLink) => number[];
  /** Updates a custom link visual with its current endpoints. */
  linkObjectPositionUpdate?: (
    object: Object3D,
    coordinates: { start: CanvasVector3; end: CanvasVector3 },
    link: GraphLink,
  ) => void;
}

export interface InternalTwoDConfig {
  nodeStyle: Required<TwoDNodeStyleConfig>;
  linkStyle: Required<TwoDLinkStyleConfig>;
  interaction: Required<TwoDInteractionConfig>;
  largeGraph: Required<TwoDLargeGraphConfig>;
  linkLineDash?: (link: GraphLink) => number[];
  node?: TwoDConfig["node"];
  link?: TwoDConfig["link"];
}

export interface InternalThreeDConfig {
  largeGraph: Required<ThreeDLargeGraphConfig>;
  linkWidth: number;
  nodeObject?: ThreeDConfig["nodeObject"];
  linkObject?: ThreeDConfig["linkObject"];
  linkDashPattern?: ThreeDConfig["linkDashPattern"];
  linkObjectPositionUpdate?: ThreeDConfig["linkObjectPositionUpdate"];
}

export interface InternalCanvasConfig extends Omit<CanvasConfig, 'backgroundColor' | 'foregroundColor' | 'captionsKeys' | 'showPropertyKeyPrefix' | 'dimension' | 'layoutMode' | 'layoutOptions' | 'pinOnDragEnd' | 'nodeStyle' | 'linkStyle' | 'simulation' | 'interaction' | 'twoD' | 'threeD'> {
  backgroundColor: string;
  foregroundColor: string;
  /** Normalized from `CanvasConfig.captionsKeys` — bare strings become `[key, false]`. */
  captionsKeys: [string, boolean][];
  showPropertyKeyPrefix: boolean;
  dimension: CanvasDimension;
  layoutMode: LayoutMode;
  layoutOptions: LayoutOptions;
  pinOnDragEnd: boolean;
  nodeStyle: Required<NodeStyleConfig & TwoDNodeStyleConfig>;
  linkStyle: Required<LinkStyleConfig & TwoDLinkStyleConfig>;
  simulation: Required<SimulationConfig>;
  interaction: Required<InteractionConfig & TwoDInteractionConfig>;
  largeGraph: Required<TwoDLargeGraphConfig>;
  linkLineDash?: TwoDConfig["linkLineDash"];
  node?: TwoDConfig["node"];
  link?: TwoDConfig["link"];
  modeConfig: {
    twoD: InternalTwoDConfig;
    threeD: InternalThreeDConfig;
  };
}

/** How the graph is drawn: flat on a 2D canvas, or in 3D with WebGL */
export type CanvasDimension = '2d' | '3d';

/** Layout algorithm mode: 'force' (physics-based), 'tree' (hierarchical DAG), or 'radial' (concentric rings) */
export type LayoutMode = 'force' | 'tree' | 'radial';

/** Directions for tree layout */
export type HierarchyDirection = 'td' | 'bu' | 'lr' | 'rl';

/** Directions for radial layout */
export type RadialDirection = 'out' | 'in';

/** All possible layout directions */
export type LayoutDirection = HierarchyDirection | RadialDirection;

/** Options for tree layout */
export interface HierarchyLayoutOptions {
  /** Direction of the hierarchy. Default: 'td' */
  direction?: HierarchyDirection;
  /** Distance between levels (inter-layer spacing). Default: 80 */
  levelDistance?: number;
  /** Minimum gap between sibling nodes (world-space units). Default: 60 */
  nodeSpacing?: number;
}

/** Options specific to radial layout */
export interface RadialLayoutOptions {
  /** Direction of the radial expansion. Default: 'out' */
  direction?: RadialDirection;
  /** Minimum distance between rings (inter-level spacing). Default: 80 */
  levelDistance?: number;
  /** Minimum gap between sibling nodes on the same ring (world-space units). Default: 10 */
  nodeSpacing?: number;
  /** Inner-radius minimum multiplier for 'in' direction. Default: 2 */
  innerRadiusMultiplier?: number;
  /** Inter-ring gap multiplier for 'in' direction. Default: 1.5 */
  innerGapMultiplier?: number;
}

/** Options specific to force layout */
export interface ForceLayoutOptions {
  /** Base link distance (added to node sizes). Default: 45 */
  linkDistance?: number;
  /** Extra padding around nodes for collision detection. Default: 25 */
  collisionPadding?: number;
}

/** Combined layout options with per-layout sections */
export interface LayoutOptions {
  tree?: HierarchyLayoutOptions;
  radial?: RadialLayoutOptions;
  force?: ForceLayoutOptions;
}

/**
 * The outline a node is drawn with. A square uses the circle's bounding box,
 * so a caption laid out for the default circle keeps fitting.
 */
export type NodeShape = "circle" | "square";

/**
 * Internal graph node representation used by the canvas during rendering.
 * Extends force-graph's NodeObject with graph-specific properties.
 */
export type GraphNode = NodeObject & {
  /** Unique numeric identifier for the node */
  id: number;
  /** Node labels/categories (e.g. ['Person', 'Employee']) */
  labels: string[];
  /** Whether this node is currently visible on the canvas */
  visible: boolean;
  /** Expand state: [isExpanded, timestampOfLastToggle] — used for glow animation */
  expand: [boolean, Date];
  /** Cached two-line display text computed from captionsKeys */
  displayName: [string, string];
  /** Fill color for the node circle (CSS color string) */
  color: string;
  /** Border stroke color for the node (CSS color string, optional — overrides config.foregroundColor if set) */
  borderColor?: string;
  /** Radius of the node circle in world units */
  size: number;
  /** The outline this node is drawn with. Defaults to "circle" */
  shape?: NodeShape;
  /** Arbitrary key-value properties on the node (used for label resolution via captionsKeys) */
  data: {
    [key: string]: any;
  };
  /** Current x position (world coordinates) */
  x?: number;
  /** Current y position (world coordinates) */
  y?: number;
  /** Target x position for animated layout transitions */
  layoutTargetX?: number;
  /** Target y position for animated layout transitions */
  layoutTargetY?: number;
  /** x velocity (force simulation) */
  vx?: number;
  /** y velocity (force simulation) */
  vy?: number;
  /** Fixed x position (pinned node) — set to pin, undefined to unpin */
  fx?: number;
  /** Fixed y position (pinned node) — set to pin, undefined to unpin */
  fy?: number;
  /** Whether this node has already been positioned by the initial layout pass */
  initialPositionCalculated?: boolean;
};

/**
 * Internal graph link/edge representation used by the canvas during rendering.
 */
export type GraphLink = {
  /** Unique numeric identifier for the link */
  id: number;
  /** Relationship type label (e.g. 'CALLS', 'DEFINES') */
  relationship: string;
  /** Source node (resolved reference) */
  source: GraphNode;
  /** Target node (resolved reference) */
  target: GraphNode;
  /** Whether this link is currently visible on the canvas */
  visible: boolean;
  /** Stroke color for the link line (CSS color string) */
  color: string;
  /** Line width in screen pixels (divided by globalScale, so it stays constant while zooming). Default: LINK_WIDTH. Doubled while the link is selected */
  width?: number;
  /** Label font size in world units (scales with zoom). Overrides linkStyle.fontSize. */
  fontSize?: number;
  /** Arrowhead length in world units (scales with zoom). Default: ARROW_SIZE. Doubled while the link is selected */
  arrowSize?: number;
  /** Curvature value for parallel edges and self-loops */
  curve: number;
  /** Arbitrary key-value properties on the link */
  data: {
    [key: string]: any;
  };
};

/** Internal graph data structure with resolved node/link references (used during rendering) */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Public node type for input data. Contains user-supplied properties
 * without the internal rendering state (positions, velocities, etc.).
 */
export type Node = Omit<
  GraphNode,
  "x" | "y" | "layoutTargetX" | "layoutTargetY" | "vx" | "vy" | "fx" | "fy" | "initialPositionCalculated" | "displayName" | "size" | "expand"
> & {
  /** Optional node radius override (defaults to built-in NODE_SIZE) */
  size?: number;
  /** Whether the node is in an expanded state (triggers glow animation on change) */
  expand?: boolean;
}

/**
 * Public link type for input data. References nodes by numeric ID
 * rather than resolved object references.
 */
export type Link = Omit<GraphLink, "curve" | "source" | "target"> & {
  /** Source node ID */
  source: number;
  /** Target node ID */
  target: number;
};

/** Public graph data structure passed to setData/setGraphData. Nodes reference each other by ID. */
export interface Data {
  nodes: Node[];
  links: Link[];
}

/** Captured viewport state (zoom level and center position) for save/restore */
export type TwoDViewportState = {
  /** Current zoom level */
  zoom: number;
  /** X coordinate of the viewport center (world units) */
  centerX: number;
  /** Y coordinate of the viewport center (world units) */
  centerY: number;
} | undefined;

/** A 3D vector used in camera snapshots. */
export type CanvasVector3 = { x: number; y: number; z: number };

/** Saved 3D camera position and orientation. */
export interface CameraState {
  position: CanvasVector3;
  target: CanvasVector3;
  up: CanvasVector3;
}

/** Camera-frustum counts for the actual 3D drawable objects. */
export interface ThreeDCullingStats {
  frustumVisibleNodeBodies: number;
  totalNodeBodies: number;
  frustumVisibleNodeCaptions: number;
  totalNodeCaptions: number;
  frustumVisibleLinks: number;
  totalLinks: number;
  frustumVisibleLinkLabels: number;
  totalLinkLabels: number;
  captionLimitEnabled: boolean;
}

/** D3 zoom transform: k = zoom scale, x/y = translation offset */
export type Transform = { k: number, x: number, y: number };

/** Custom rendering mode relative to the built-in drawing: 'before' (draw under), 'after' (draw over), or 'replace' (skip built-in) */
export type CanvasRenderMode = 'before' | 'after' | 'replace';

/** Initialized 2D renderer instance exposed for advanced customization. */
export type TwoDGraphInstance = Exclude<import("force-graph").default<GraphNode, GraphLink>, undefined>;

/** Initialized 3D renderer instance exposed for advanced customization. */
export type ThreeDGraphInstance = import("3d-force-graph").ForceGraph3DInstance<GraphNode, GraphLink>;
