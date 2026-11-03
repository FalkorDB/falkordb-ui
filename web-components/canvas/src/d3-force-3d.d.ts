declare module "d3-force-3d" {
  import type { Simulation, SimulationNodeDatum, SimulationLinkDatum, ForceCenter, ForceLink, ForceManyBody } from "d3";
  export function forceSimulation<N extends SimulationNodeDatum>(nodes: N[], dimensions: 3): Simulation<N, SimulationLinkDatum<N>>;
  export function forceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(links: L[]): ForceLink<N, L>;
  export function forceManyBody<N extends SimulationNodeDatum>(): ForceManyBody<N>;
  export function forceCenter<N extends SimulationNodeDatum>(): ForceCenter<N>;
}
