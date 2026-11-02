import { describe, expect, it, vi } from "vitest";
import { createForceLayout, encodePositions, type LayoutInput, type LayoutOutput, type LayoutRequest } from "../src/force-layout";
import { ForceLayoutClient } from "../src/force-layout-client";

function request(): Omit<LayoutRequest, "revision"> {
  return {
    nodes: [{ id: 1, size: 5 }, { id: 2, size: 8 }],
    links: [{ source: 1, target: 2 }],
    chargeStrength: -400, velocityDecay: 0.4, alphaMin: 0.05,
    linkDistance: 30, warmupTicks: 30, animate: false,
  };
}

class MockWorker {
  onmessage: ((event: MessageEvent<LayoutOutput>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage = vi.fn<(message: LayoutInput, transfer?: Transferable[]) => void>();
  terminate = vi.fn();
  reply(data: LayoutOutput) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}

function harness() {
  const workers: MockWorker[] = [];
  const applied = vi.fn();
  const failed = vi.fn();
  const client = new ForceLayoutClient(applied, failed, () => {
    const worker = new MockWorker();
    workers.push(worker);
    return worker;
  });
  return { workers, applied, failed, client };
}

describe("3D worker force layout", () => {
  it("uses deterministic finite 3D positions with pinned nodes and matching force parameters", () => {
    const input = { ...request(), revision: 1 };
    input.nodes[0] = { ...input.nodes[0], fx: 5, fy: 6, fz: 7 };
    const first = createForceLayout(structuredClone(input));
    const second = createForceLayout(structuredClone(input));
    first.tick(30);
    second.tick(30);
    const positions = encodePositions(first.nodes());
    expect(positions.every(Number.isFinite)).toBe(true);
    expect(positions).toEqual(encodePositions(second.nodes()));
    expect([...positions.slice(0, 3)]).toEqual([5, 6, 7]);
    expect(first.velocityDecay()).toBe(0.4);
    expect(first.alphaMin()).toBe(0.05);
    expect(first.alphaDecay()).toBe(0.0228);
    first.stop();
    second.stop();
  });

  it("reports unresolved endpoints rather than silently dropping invalid links", () => {
    const input = { ...request(), revision: 1 };
    input.links[0].target = 99;
    expect(() => createForceLayout(input)).toThrow("node not found");
  });

  it("does not mutate links or pin fields outside the supplied layout snapshot", () => {
    const original = { ...request(), revision: 1 };
    const snapshot = structuredClone(original);
    const simulation = createForceLayout(snapshot);
    simulation.tick(10);
    expect(original.links).toEqual([{ source: 1, target: 2 }]);
    expect(original.nodes[0].x).toBeUndefined();
    const buffer = new Float64Array(12);
    expect(encodePositions(simulation.nodes(), buffer)).toBe(buffer);
    simulation.stop();
  });

  it("applies a matching packet, returns its transferable buffer, and terminates on completion", () => {
    const { client, workers, applied, failed } = harness();
    expect(client.start(request())).toBe(true);
    const worker = workers[0];
    const start = worker.postMessage.mock.calls[0][0];
    if (start.type !== "start") throw new Error("Missing start request");
    const positions = new Float64Array(12);
    worker.reply({ type: "positions", revision: start.request.revision, positions, done: false });
    expect(applied).toHaveBeenCalledWith(positions, false);
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      type: "next", revision: start.request.revision, positions,
    }, [positions.buffer]);
    worker.reply({ type: "positions", revision: start.request.revision, positions, done: true });
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(failed).not.toHaveBeenCalled();
  });

  it("ignores stale replies after replacement or teardown", () => {
    const { client, workers, applied } = harness();
    client.start(request());
    const old = workers[0];
    const start = old.postMessage.mock.calls[0][0];
    if (start.type !== "start") throw new Error("Missing start request");
    client.start(request());
    old.reply({ type: "positions", revision: start.request.revision, positions: new Float64Array(12), done: true });
    expect(applied).not.toHaveBeenCalled();
    expect(old.terminate).toHaveBeenCalledOnce();
    client.stop();
    expect(workers[1].terminate).toHaveBeenCalledOnce();
  });

  it("reports startup, runtime, decode and malformed-position failures explicitly", () => {
    const failure = vi.fn();
    const startup = new ForceLayoutClient(vi.fn(), failure, () => { throw new Error("CSP"); });
    expect(startup.start(request())).toBe(false);
    expect(failure).toHaveBeenCalledWith(expect.objectContaining({ message: "CSP" }));
    for (const kind of ["runtime", "decode", "size", "nan", "worker"]) {
      const { client, workers, failed, applied } = harness();
      client.start(request());
      const worker = workers[0];
      const start = worker.postMessage.mock.calls[0][0];
      if (start.type !== "start") throw new Error("Missing start request");
      if (kind === "runtime") worker.onerror?.(new ErrorEvent("error", { message: "worker failed" }));
      else if (kind === "decode") worker.onmessageerror?.();
      else if (kind === "worker") worker.reply({ type: "error", revision: start.request.revision, message: "bad graph" });
      else worker.reply({
        type: "positions", revision: start.request.revision,
        positions: kind === "nan" ? new Float64Array(12).fill(NaN) : new Float64Array(1), done: true,
      });
      expect(failed).toHaveBeenCalledOnce();
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(applied).not.toHaveBeenCalled();
    }
  });
});
