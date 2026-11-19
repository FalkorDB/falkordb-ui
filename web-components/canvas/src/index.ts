import FalkorDBCanvas from "./canvas.js";
import type React from "react";
import type {
  CanvasDimension,
  CanvasRenderMode,
  LayoutMode,
  LayoutDirection,
  HierarchyDirection,
  RadialDirection,
  LayoutOptions,
  HierarchyLayoutOptions,
  RadialLayoutOptions,
  ForceLayoutOptions,
  NodeStyleConfig,
  TwoDNodeStyleConfig,
  LinkStyleConfig,
  TwoDLinkStyleConfig,
  SimulationConfig,
  InteractionConfig,
  TwoDInteractionConfig,
  EventHandlers,
} from "./canvas-types.js";

declare global {
  interface HTMLElementTagNameMap {
    "falkordb-canvas": FalkorDBCanvas;
  }

  namespace JSX {
    interface IntrinsicElements {
      "falkordb-canvas": React.DetailedHTMLProps<
        React.HTMLAttributes<FalkorDBCanvas> & {
          'node-mode'?: CanvasRenderMode;
          'link-mode'?: CanvasRenderMode;
        },
        FalkorDBCanvas
      >;
    }
  }
}

// Main canvas class
export { FalkorDBCanvas as default, FalkorDBCanvas };

// Types
export type {
  CanvasDimension,
  CanvasRenderMode,
  LayoutMode,
  LayoutDirection,
  HierarchyDirection,
  RadialDirection,
  LayoutOptions,
  HierarchyLayoutOptions,
  RadialLayoutOptions,
  ForceLayoutOptions,
  NodeStyleConfig,
  TwoDNodeStyleConfig,
  LinkStyleConfig,
  TwoDLinkStyleConfig,
  SimulationConfig,
  InteractionConfig,
  TwoDInteractionConfig,
  EventHandlers,
}

export type {
  CanvasConfig,
  TwoDConfig,
  ThreeDConfig,
  TwoDLargeGraphConfig,
  ThreeDLargeGraphConfig,
  ThreeDRenderState,
  GraphNode,
  GraphLink,
  GraphData,
  Node,
  NodeShape,
  Link,
  Data,
  TwoDViewportState,
  CameraState,
  CanvasVector3,
  ThreeDCullingStats,
  TwoDGraphInstance,
  ThreeDGraphInstance,
  Transform,
} from "./canvas-types.js";

export type { TwoDWorldBounds } from "./canvas.js";

// Utils
export {
  NODE_SIZE,
  LINK_WIDTH,
  LINK_FONT_SIZE,
  ARROW_SIZE,
  dataToGraphData,
  graphDataToData,
  getContrastTextColor,
  getNodeDisplayText,
  getNodeDisplayKey,
  wrapTextForCircularNode,
} from "./canvas-utils.js";

// Layouts
export {
  getDagMode,
  isForceLayout,
  getDagLevelDistance,
  pinAllNodes,
  unpinAllNodes,
} from "./layouts.js";
