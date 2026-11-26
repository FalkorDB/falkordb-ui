/**
 * Shared test type definitions that use the actual source types
 * so TypeScript catches type mismatches at compile time.
 */
import type { CanvasConfig, Data, GraphData, GraphNode, GraphLink, TwoDViewportState, CameraState, LayoutMode, LayoutOptions, CanvasDimension, TwoDGraphInstance, ThreeDGraphInstance } from "../src/canvas-types";
import type { TwoDWorldBounds } from "../src/canvas";

/**
 * Base canvas element type matching the public API of FalkorDBCanvas.
 * Tests should use this (or a subset via Pick) instead of ad-hoc Record types.
 */
export type CanvasTestElement = HTMLElement & {
  setConfig: (config: Partial<CanvasConfig>) => void;
  setData: (data: Data) => void;
  setGraphData: (data: Data) => void;
  getData: () => Data;
  getGraphData: () => GraphData;
  setWidth: (w: number) => void;
  setHeight: (h: number) => void;
  setBackgroundColor: (color: string) => void;
  setForegroundColor: (color: string) => void;
  setAnimation: (enabled: boolean) => void;
  setPinOnDragEnd: (pin: boolean) => void;
  setLayout: (mode: LayoutMode) => void;
  setLayoutOptions: (options: Partial<LayoutOptions>) => void;
  setDimension: (dimension: CanvasDimension) => Promise<void>;
  getDimension: () => CanvasDimension;
  setDebug: (enabled: boolean) => void;
  refresh: () => void;
  twoD: {
    getGraph: () => TwoDGraphInstance;
    getViewport: () => TwoDViewportState;
    setViewport: (viewport: TwoDViewportState) => void;
    getCullingStats: () => CullingStats;
  };
  threeD: {
    getGraph: () => ThreeDGraphInstance;
    getCameraState: () => CameraState;
    setCameraState: (state: CameraState) => void;
    getCullingStats: () => import("../src/index").ThreeDCullingStats;
  };
  getZoom: () => number;
  zoom: (zoomLevel: number) => unknown;
  zoomToFit: (paddingMultiplier?: number, filter?: (node: GraphNode) => boolean) => void;
  centerAt: (x: number, y: number, duration?: number) => void;
};

export interface CullingStats {
  enabled: boolean;
  bounds: TwoDWorldBounds | null;
  zoom: number;
  visibleNodes: number;
  totalNodes: number;
  visibleLinks: number;
  totalLinks: number;
}

export function read3DNodeDepth(graph: ThreeDGraphInstance): number | undefined {
  return graph.graphData().nodes[0]?.z;
}

// Re-export source types for convenience
export type { CanvasConfig, Data, GraphData, GraphNode, GraphLink, TwoDViewportState, LayoutMode, LayoutOptions, CanvasDimension, TwoDWorldBounds };
