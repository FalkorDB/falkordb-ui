import { afterEach, describe, expect, it, vi } from "vitest";
import { PointerHitFallback, type HitTestLayer } from "../src/pointer-hit-fallback";

type Item = { id: string };

const TRANSFORM = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 } as DOMMatrix;

/** A hidden canvas whose pointer pixel is whatever `pixel` holds. */
function createShadowCtx(pixel: number[]) {
  const ctx = {
    getImageData: vi.fn((_sx: number, _sy: number, sw: number, sh: number) => ({
      data: new Uint8ClampedArray(sw * sh === 1 ? pixel : new Array(sw * sh * 4).fill(1)),
    })),
    getTransform: vi.fn(() => TRANSFORM),
  };
  return ctx as typeof ctx & CanvasRenderingContext2D;
}

/** A scratch canvas whose point-in-path answer is "the last item painted is in `hits`". */
function mockScratch(hits: Set<Item>) {
  let painted: Item | null = null;
  const scratch = {
    setTransform: vi.fn(),
    beginPath: vi.fn(() => { painted = null; }),
    isPointInPath: vi.fn(() => painted !== null && hits.has(painted)),
    isPointInStroke: vi.fn(() => painted !== null && hits.has(painted)),
    paint: (item: Item) => { painted = item; },
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(scratch as unknown as RenderingContext);
  return scratch;
}

function layer(items: Item[], mode: HitTestLayer["mode"], paint = vi.fn()): HitTestLayer<Item> {
  return { items: () => items, paint, mode };
}

/** Reads the pointer pixel the way force-graph does. */
const readPixel = (ctx: CanvasRenderingContext2D, x = 5.5, y = 7.25) =>
  Array.from(ctx.getImageData(x, y, 1, 1).data);

describe("PointerHitFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes a colour it painted through untouched", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([0x12, 0x34, 0x56, 255]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([0x12, 0x34, 0x56, 255]);
    expect(paint).not.toHaveBeenCalled();
  });

  it("matches painted colours case-insensitively", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([0xab, 0xcd, 0xef, 255]);

    fallback.track(node, "#ABCDEF", ctx);
    readPixel(ctx);

    expect(paint).not.toHaveBeenCalled();
  });

  it("passes transparent background through untouched", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([3, 0, 1, 0]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([3, 0, 1, 0]);
    expect(paint).not.toHaveBeenCalled();
  });

  it("rewrites a scrambled pixel to the colour of the object under the pointer", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const fallback = new PointerHitFallback([layer([node], "fill", scratch.paint) as HitTestLayer]);
    const ctx = createShadowCtx([0x12, 0x34, 0x57, 254]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([0x12, 0x34, 0x56, 255]);
    // The hidden canvas's transform, shifted so the read pixel is the scratch's only pixel.
    expect(scratch.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 10 - 5, 20 - 7);
    expect(scratch.isPointInPath).toHaveBeenCalledWith(0.5, 0.5);
  });

  it("leaves a scrambled pixel alone when nothing is under the pointer", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set());
    const fallback = new PointerHitFallback([layer([node], "fill", scratch.paint) as HitTestLayer]);
    const ctx = createShadowCtx([0x12, 0x34, 0x57, 255]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([0x12, 0x34, 0x57, 255]);
  });

  it("prefers earlier layers, and later items within a layer", () => {
    const bottomNode = { id: "bottom" };
    const topNode = { id: "top" };
    const link = { id: "link" };
    const scratch = mockScratch(new Set([bottomNode, topNode, link]));
    const fallback = new PointerHitFallback([
      layer([bottomNode, topNode], "fill", scratch.paint) as HitTestLayer,
      layer([link], "stroke", scratch.paint) as HitTestLayer,
    ]);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(link, "#000003", ctx);
    fallback.track(bottomNode, "#000001", ctx);
    fallback.track(topNode, "#000002", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 2]);
  });

  it("tests stroke layers with isPointInStroke", () => {
    const link = { id: "link" };
    const scratch = mockScratch(new Set([link]));
    const fallback = new PointerHitFallback([layer([link], "stroke", scratch.paint) as HitTestLayer]);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(link, "#000003", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 3]);
    expect(scratch.isPointInStroke).toHaveBeenCalledWith(0.5, 0.5);
    expect(scratch.isPointInPath).not.toHaveBeenCalled();
  });

  it("skips objects the hidden canvas has not painted", () => {
    const painted = { id: "painted" };
    const unpainted = { id: "unpainted" };
    const scratch = mockScratch(new Set([painted, unpainted]));
    const fallback = new PointerHitFallback([layer([painted, unpainted], "fill", scratch.paint) as HitTestLayer]);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(painted, "#000001", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 1]);
  });

  it("reuses its answer until the pointer moves or the hidden canvas repaints", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const paint = vi.fn(scratch.paint);
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([9, 9, 9, 255]);
    fallback.track(node, "#000001", ctx);

    readPixel(ctx);
    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 1]);
    expect(paint).toHaveBeenCalledTimes(1);

    readPixel(ctx, 6, 7);
    expect(paint).toHaveBeenCalledTimes(2);

    fallback.track(node, "#000001", ctx);
    readPixel(ctx, 6, 7);
    expect(paint).toHaveBeenCalledTimes(3);
  });

  it("only touches the single-pixel pointer read", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(Array.from(ctx.getImageData(0, 0, 2, 1).data)).toEqual(new Array(8).fill(1));
    expect(paint).not.toHaveBeenCalled();
  });

  it("hooks each hidden canvas once", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const paint = vi.fn(scratch.paint);
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([9, 9, 9, 255]);
    const original = ctx.getImageData;

    fallback.track(node, "#000001", ctx);
    const hooked = ctx.getImageData;
    fallback.track(node, "#000001", ctx);

    expect(hooked).not.toBe(original);
    expect(ctx.getImageData).toBe(hooked);
    readPixel(ctx);
    expect(paint).toHaveBeenCalledTimes(1);
  });

  it("ignores contexts that cannot read pixels", () => {
    const fallback = new PointerHitFallback([]);
    const ctx = {} as CanvasRenderingContext2D;

    expect(() => fallback.track({ id: "n" }, "#000001", ctx)).not.toThrow();
    expect(ctx.getImageData).toBeUndefined();
  });

  it("gives up quietly when no scratch canvas is available", () => {
    const node = { id: "n" };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], "fill", paint) as HitTestLayer]);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx)).toEqual([9, 9, 9, 255]);
    expect(paint).not.toHaveBeenCalled();
  });
});
