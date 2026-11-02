import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force-3d";
import type { SimulationNodeDatum } from "d3";

export interface LayoutNode extends SimulationNodeDatum {
  id: number;
  size: number;
  z?: number;
  vz?: number;
  fz?: number | null;
}

export interface LayoutRequest {
  revision: number;
  nodes: LayoutNode[];
  links: { source: number; target: number }[];
  chargeStrength: number;
  velocityDecay: number;
  alphaMin: number;
  linkDistance: number;
  warmupTicks: number;
  animate: boolean;
}

export type LayoutInput =
  | { type: "start"; request: LayoutRequest }
  | { type: "next"; revision: number; positions: Float64Array<ArrayBuffer> };

export type LayoutOutput =
  | { type: "positions"; revision: number; positions: Float64Array<ArrayBuffer>; done: boolean }
  | { type: "error"; revision: number; message: string };

/** Match three-forcegraph's default 3D forces; hidden links are filtered by the caller. */
export function createForceLayout(request: LayoutRequest) {
  const links = forceLink<LayoutNode, { source: number | LayoutNode; target: number | LayoutNode }>(request.links)
    .id(node => node.id)
    .distance(link => {
      const source = link.source;
      const target = link.target;
      if (typeof source === "number" || typeof target === "number") throw new Error("Unresolved force link");
      return source.size + target.size + request.linkDistance * 2;
    });
  return forceSimulation(request.nodes, 3).stop()
    .force("link", links)
    .force("charge", forceManyBody<LayoutNode>().strength(request.chargeStrength))
    .force("center", forceCenter<LayoutNode>())
    .alphaDecay(0.0228)
    .velocityDecay(request.velocityDecay)
    .alphaMin(request.alphaMin);
}

export function encodePositions(nodes: LayoutNode[], positions = new Float64Array(nodes.length * 6)) {
  nodes.forEach((node, index) => {
    positions.set([node.x ?? 0, node.y ?? 0, node.z ?? 0, node.vx ?? 0, node.vy ?? 0, node.vz ?? 0], index * 6);
  });
  return positions;
}
