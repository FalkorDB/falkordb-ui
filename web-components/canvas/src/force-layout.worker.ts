import { createForceLayout, encodePositions, type LayoutInput, type LayoutOutput, type LayoutRequest } from "./force-layout.js";

function send(message: LayoutOutput, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}
let current: LayoutRequest | undefined;
let simulation: ReturnType<typeof createForceLayout> | undefined;
let warmup = 0;
let liveStarted: number | undefined;
let timer: ReturnType<typeof setTimeout>;

function run(positions?: Float64Array<ArrayBuffer>) {
  if (!current || !simulation) return;
  try {
    const deadline = performance.now() + 8;
    let ticks = 0;
    while (warmup > 0) {
      if (current.alphaMin > 0 && simulation.alpha() < current.alphaMin) {
        warmup = 0;
        break;
      }
      warmup -= 1;
      simulation.tick();
      if (++ticks >= 8 || performance.now() >= deadline) break;
    }
    if (warmup > 0) {
      timer = setTimeout(() => run(positions), 0);
      return;
    }
    if (liveStarted === undefined) liveStarted = performance.now();
    else if (current.animate) simulation.tick();
    // Match three-forcegraph's default live cooldown; warmup is not included.
    const done = !current.animate || (current.alphaMin > 0 && simulation.alpha() < current.alphaMin) ||
      performance.now() - liveStarted >= 15000;
    const output = encodePositions(current.nodes, positions);
    send({ type: "positions", revision: current.revision, positions: output, done }, [output.buffer]);
  } catch (error) {
    send({ type: "error", revision: current.revision, message: error instanceof Error ? error.message : String(error) });
  }
}

self.onmessage = ({ data }: MessageEvent<LayoutInput>) => {
  if (data.type === "start") {
    clearTimeout(timer);
    current = data.request;
    try {
      simulation?.stop();
      simulation = createForceLayout(current);
      warmup = Math.max(0, Math.floor(current.warmupTicks));
      liveStarted = undefined;
      timer = setTimeout(() => run(), 0);
    } catch (error) {
      send({ type: "error", revision: current.revision, message: error instanceof Error ? error.message : String(error) });
    }
  } else if (current?.revision === data.revision) {
    clearTimeout(timer);
    timer = setTimeout(() => run(data.positions), 16);
  }
};
