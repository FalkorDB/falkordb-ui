import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LayoutInput, LayoutOutput, LayoutRequest } from "../src/force-layout";

const original = self.onmessage;
let outputs: LayoutOutput[] = [];

function request(revision = 1): LayoutRequest {
  return {
    revision, nodes: [{ id: 1, size: 5 }, { id: 2, size: 5 }],
    links: [{ source: 1, target: 2 }],
    chargeStrength: -400, velocityDecay: 0.4, alphaMin: 0.05,
    linkDistance: 30, warmupTicks: 30, animate: false,
  };
}

function send(data: LayoutInput) {
  self.dispatchEvent(new MessageEvent("message", { data }));
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  outputs = [];
  vi.spyOn(self, "postMessage").mockImplementation(message => { outputs.push(message); });
  await import("../src/force-layout.worker");
});

afterEach(() => {
  self.onmessage = original;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("3D layout worker scheduling", () => {
  it("yields between warmup batches and emits finite final positions", async () => {
    send({ type: "start", request: request() });
    expect(outputs).toHaveLength(0);
    await vi.advanceTimersToNextTimerAsync();
    expect(outputs).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs).toHaveLength(1);
    const output = outputs[0];
    if (output.type !== "positions") throw new Error("Missing positions");
    expect(output.done).toBe(true);
    expect(output.positions.length).toBe(12);
    expect(output.positions.every(Number.isFinite)).toBe(true);
    expect(self.postMessage).toHaveBeenLastCalledWith(output, { transfer: [output.positions.buffer] });
  });

  it("waits for the returned buffer before advancing live physics", async () => {
    send({ type: "start", request: { ...request(), warmupTicks: 0, animate: true } });
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs).toHaveLength(1);
    const first = outputs[0];
    if (first.type !== "positions") throw new Error("Missing positions");
    expect(first.done).toBe(false);
    const previous = [...first.positions];
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs).toHaveLength(1);
    send({ type: "next", revision: first.revision, positions: first.positions });
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs).toHaveLength(2);
    const next = outputs[1];
    if (next.type !== "positions") throw new Error("Missing positions");
    expect(next.positions).toBe(first.positions);
    expect([...next.positions]).not.toEqual(previous);
  });

  it("cancels a superseded warmup and ignores old acknowledgements", async () => {
    send({ type: "start", request: request(1) });
    await vi.advanceTimersToNextTimerAsync();
    send({ type: "start", request: { ...request(2), warmupTicks: 0 } });
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs.map(output => output.revision)).toEqual([2]);
    send({ type: "next", revision: 1, positions: new Float64Array(12) });
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs).toHaveLength(1);
  });

  it("reports simulation errors and settles when the alpha threshold is reached", async () => {
    const invalid = request();
    invalid.links[0].target = 99;
    send({ type: "start", request: invalid });
    expect(outputs[0]).toMatchObject({ type: "error", revision: 1, message: expect.stringContaining("node not found") });
    outputs = [];
    send({ type: "start", request: { ...request(2), alphaMin: 0.99, animate: true } });
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs[0]).toMatchObject({ type: "positions", revision: 2, done: true });
  });

  it("observes the existing live cooldown even when alpha stopping is disabled", async () => {
    send({ type: "start", request: { ...request(), warmupTicks: 0, animate: true, alphaMin: 0 } });
    await vi.advanceTimersByTimeAsync(100);
    const first = outputs[0];
    if (first.type !== "positions") throw new Error("Missing positions");
    expect(first.done).toBe(false);
    await vi.advanceTimersByTimeAsync(15000);
    send({ type: "next", revision: first.revision, positions: first.positions });
    await vi.advanceTimersByTimeAsync(100);
    expect(outputs.at(-1)).toMatchObject({ type: "positions", done: true });
  });
});
