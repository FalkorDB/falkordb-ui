import { afterEach, describe, expect, it, vi } from "vitest";
import { PointerHitFallback, pixelReadsAreNoisy, type HitTestLayer } from "../src/pointer-hit-fallback";

type Item = { id: string };

const TRANSFORM = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 } as DOMMatrix;

const FAITHFUL = { detectNoise: () => false };
const NOISY = { detectNoise: () => true };

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

/**
 * A scratch canvas whose point-in-path answer is "the item being traced is in
 * `hits`". It keeps the transform it is given, so rectangle tests can map the
 * pixel back into user space.
 */
function mockScratch(hits: Set<Item>) {
  let tracing: Item | null = null;
  let transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const scratch = {
    lineWidth: 1,
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
      transform = { a, b, c, d, e, f };
    }),
    getTransform: vi.fn(() => transform as DOMMatrix),
    beginPath: vi.fn(),
    isPointInPath: vi.fn(() => tracing !== null && hits.has(tracing)),
    isPointInStroke: vi.fn(() => tracing !== null && hits.has(tracing)),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    /** A painter that fills (or strokes) the item's hit area. */
    painter: (how: "fill" | "stroke" = "fill") =>
      vi.fn((item: Item, _color: string, ctx: CanvasRenderingContext2D) => {
        tracing = item;
        if (how === "fill") ctx.fill();
        else ctx.stroke();
      }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(scratch as unknown as RenderingContext);
  return scratch;
}

function layer(items: Item[], paint: HitTestLayer<Item>["paint"] = vi.fn(), extra: Partial<HitTestLayer<Item>> = {}): HitTestLayer {
  return { items: () => items, paint, ...extra } as HitTestLayer;
}

/** Reads the pointer pixel the way force-graph does. */
const readPixel = (ctx: CanvasRenderingContext2D, x = 5.5, y = 7.25) =>
  Array.from(ctx.getImageData(x, y, 1, 1).data);

describe("PointerHitFallback where pixel reads are faithful", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes a colour it painted through untouched", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], paint)], FAITHFUL);
    const ctx = createShadowCtx([0x12, 0x34, 0x56, 255]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([0x12, 0x34, 0x56, 255]);
    expect(paint).not.toHaveBeenCalled();
  });

  it("matches painted colours case-insensitively", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], paint)], FAITHFUL);
    const ctx = createShadowCtx([0xab, 0xcd, 0xef, 255]);

    fallback.track(node, "#ABCDEF", ctx);
    readPixel(ctx);

    expect(paint).not.toHaveBeenCalled();
  });

  it("passes transparent background through untouched", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], paint)], FAITHFUL);
    const ctx = createShadowCtx([3, 0, 1, 0]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([3, 0, 1, 0]);
    expect(paint).not.toHaveBeenCalled();
  });

  it("resolves an unknown colour, such as an antialiased edge, by geometry", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const fallback = new PointerHitFallback([layer([node], scratch.painter())], FAITHFUL);
    const ctx = createShadowCtx([0x12, 0x34, 0x57, 254]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([0x12, 0x34, 0x56, 255]);
    // The hidden canvas's transform, shifted so the read pixel is the scratch's only pixel.
    expect(scratch.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 10 - 5, 20 - 7);
    expect(scratch.isPointInPath).toHaveBeenCalledWith(0.5, 0.5);
  });

  it("clears an unknown colour when nothing is under the pointer", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set());
    const fallback = new PointerHitFallback([layer([node], scratch.painter())], FAITHFUL);
    const ctx = createShadowCtx([0x12, 0x34, 0x57, 255]);

    fallback.track(node, "#123456", ctx);

    expect(readPixel(ctx)).toEqual([0, 0, 0, 0]);
  });

  it("stops trusting the colour of an object that was removed", () => {
    const kept = { id: "kept" };
    const removed = { id: "removed" };
    const items = [kept, removed];
    const scratch = mockScratch(new Set());
    const paint = scratch.painter();
    const fallback = new PointerHitFallback([{ items: () => items, paint } as HitTestLayer], FAITHFUL);
    const ctx = createShadowCtx([0, 0, 2, 255]);
    fallback.track(kept, "#000001", ctx);
    fallback.track(removed, "#000002", ctx);

    items.pop();
    fallback.track(kept, "#000001", ctx); // the next repaint

    // The stale colour is re-checked by geometry, which finds nothing there.
    expect(readPixel(ctx)).toEqual([0, 0, 0, 0]);
    expect(paint).toHaveBeenCalledWith(kept, "#000001", expect.anything());
  });

  it("stops trusting a colour once force-graph gives it to another object", () => {
    const first = { id: "first" };
    const second = { id: "second" };
    const scratch = mockScratch(new Set([second]));
    const fallback = new PointerHitFallback([layer([first, second], scratch.painter())], FAITHFUL);
    const ctx = createShadowCtx([0, 0, 1, 255]);

    fallback.track(first, "#000001", ctx);
    fallback.track(first, "#000009", ctx);
    fallback.track(second, "#000002", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 2]);
  });
});

describe("PointerHitFallback where pixel reads carry noise", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not trust a pixel that noise turned into another object's colour", () => {
    const under = { id: "under the pointer" };
    const other = { id: "elsewhere" };
    const scratch = mockScratch(new Set([under]));
    const fallback = new PointerHitFallback([layer([under, other], scratch.painter())], NOISY);
    // Noise flipped one bit of `under`'s colour (#000002) into `other`'s (#000003).
    const ctx = createShadowCtx([0, 0, 3, 255]);

    fallback.track(under, "#000002", ctx);
    fallback.track(other, "#000003", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 2]);
  });

  it("clears a painted colour when geometry finds nothing there", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set());
    const fallback = new PointerHitFallback([layer([node], scratch.painter())], NOISY);
    const ctx = createShadowCtx([0, 0, 1, 255]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx)).toEqual([0, 0, 0, 0]);
  });

  it("finds an object even where noise made the pixel look like background", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const fallback = new PointerHitFallback([layer([node], scratch.painter())], NOISY);
    const ctx = createShadowCtx([1, 0, 0, 0]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx)).toEqual([0, 0, 1, 255]);
  });

  it("checks for noise once, on the first pointer read", () => {
    const node = { id: "n" };
    mockScratch(new Set([node]));
    const detectNoise = vi.fn(() => true);
    const fallback = new PointerHitFallback([layer([node])], { detectNoise });
    const ctx = createShadowCtx([0, 0, 1, 255]);

    fallback.track(node, "#000001", ctx);
    expect(detectNoise).not.toHaveBeenCalled();
    readPixel(ctx);
    readPixel(ctx, 9, 9);

    expect(detectNoise).toHaveBeenCalledTimes(1);
  });
});

describe("PointerHitFallback geometry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers earlier layers, and later items within a layer", () => {
    const bottomNode = { id: "bottom" };
    const topNode = { id: "top" };
    const link = { id: "link" };
    const scratch = mockScratch(new Set([bottomNode, topNode, link]));
    const fallback = new PointerHitFallback([
      layer([bottomNode, topNode], scratch.painter()),
      layer([link], scratch.painter("stroke")),
    ], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(link, "#000003", ctx);
    fallback.track(bottomNode, "#000001", ctx);
    fallback.track(topNode, "#000002", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 2]);
  });

  it("tests a stroked hit area with isPointInStroke", () => {
    const link = { id: "link" };
    const scratch = mockScratch(new Set([link]));
    const fallback = new PointerHitFallback([layer([link], scratch.painter("stroke"))], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(link, "#000003", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 3]);
    expect(scratch.isPointInStroke).toHaveBeenCalledWith(0.5, 0.5);
    expect(scratch.isPointInPath).not.toHaveBeenCalled();
  });

  it("counts every shape a painter fills, not only the last path", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set());
    const answers = [true, false];
    scratch.isPointInPath.mockImplementation(() => answers.shift() ?? false);
    const paint = vi.fn((_item: Item, _color: string, ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.fill(); // covers the pixel
      ctx.beginPath();
      ctx.fill(); // does not
    });
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 1]);
  });

  it("tests a fill with an explicit path and fill rule", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const path = {} as Path2D;
    const paint = vi.fn((_item: Item, _color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fill(path, "evenodd");
    });
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);
    readPixel(ctx);

    expect(scratch.isPointInPath).toHaveBeenCalledWith(path, 0.5, 0.5, "evenodd");
  });

  // The pointer pixel (5, 7) sits at graph point (-2.25, -6.25) under TRANSFORM.
  it("hits a custom hit area painted with fillRect", () => {
    const node = { id: "n" };
    mockScratch(new Set());
    const paint = vi.fn((_item: Item, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      ctx.fillRect(-5, -10, 10, 10);
    });
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 1]);
  });

  it("misses a fillRect that does not cover the pointer", () => {
    const node = { id: "n" };
    mockScratch(new Set());
    const paint = vi.fn((_item: Item, _color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillRect(10, 10, 5, 5);
    });
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx)).toEqual([0, 0, 0, 0]);
  });

  it("hits the outline of a strokeRect but not its inside", () => {
    const outline = { id: "outline" };
    const ring = { id: "ring" };
    const scratch = mockScratch(new Set());
    scratch.lineWidth = 2;
    // Pointer at (-2.25, -6.25): on the left edge of the first rect, deep inside the second.
    const fallback = new PointerHitFallback([
      layer([ring], vi.fn((_item: Item, _color: string, ctx: CanvasRenderingContext2D) => ctx.strokeRect(-20, -20, 40, 40))),
      layer([outline], vi.fn((_item: Item, _color: string, ctx: CanvasRenderingContext2D) => ctx.strokeRect(-2, -10, 10, 10))),
    ], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(ring, "#000001", ctx);
    fallback.track(outline, "#000002", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 2]);
  });

  it("skips objects whose bounds do not contain the pointer, without tracing them", () => {
    const near = { id: "near" };
    const far = { id: "far" };
    const scratch = mockScratch(new Set([near, far]));
    const paint = scratch.painter();
    const fallback = new PointerHitFallback([
      layer([near, far], paint, {
        bounds: (item) => (item === far
          ? { minX: 100, maxX: 110, minY: 100, maxY: 110 }
          : { minX: -3, maxX: -2, minY: -7, maxY: -6 }),
      }),
    ], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(near, "#000001", ctx);
    fallback.track(far, "#000002", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 1]);
    expect(paint).toHaveBeenCalledTimes(1);
    expect(paint).toHaveBeenCalledWith(near, "#000001", expect.anything());
  });

  it("grows bounds by the layer's screen-pixel padding", () => {
    const link = { id: "link" };
    const scratch = mockScratch(new Set([link]));
    const paint = scratch.painter("stroke");
    // The box ends 1 graph unit (2 screen pixels) left of the pointer.
    const bounds = () => ({ minX: -10, maxX: -3.25, minY: -10, maxY: 0 });
    const tight = new PointerHitFallback([layer([link], paint, { bounds })], NOISY);
    const padded = new PointerHitFallback([layer([link], paint, { bounds, padding: () => 4 })], NOISY);
    const tightCtx = createShadowCtx([9, 9, 9, 255]);
    const paddedCtx = createShadowCtx([9, 9, 9, 255]);

    tight.track(link, "#000003", tightCtx);
    padded.track(link, "#000003", paddedCtx);

    expect(readPixel(tightCtx)).toEqual([0, 0, 0, 0]);
    expect(readPixel(paddedCtx).slice(0, 3)).toEqual([0, 0, 3]);
  });

  it("traces each object inside save/restore so painters cannot leak state", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const fallback = new PointerHitFallback([layer([node], scratch.painter())], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);
    readPixel(ctx);

    expect(scratch.save).toHaveBeenCalledTimes(1);
    expect(scratch.restore).toHaveBeenCalledTimes(1);
  });

  it("skips objects the hidden canvas has not painted", () => {
    const painted = { id: "painted" };
    const unpainted = { id: "unpainted" };
    const scratch = mockScratch(new Set([painted, unpainted]));
    const fallback = new PointerHitFallback([layer([painted, unpainted], scratch.painter())], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(painted, "#000001", ctx);

    expect(readPixel(ctx).slice(0, 3)).toEqual([0, 0, 1]);
  });

  it("reuses its answer until the pointer moves or the hidden canvas repaints", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const paint = scratch.painter();
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
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
});

describe("PointerHitFallback plumbing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only touches the single-pixel pointer read", () => {
    const node = { id: "n" };
    const paint = vi.fn();
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(Array.from(ctx.getImageData(0, 0, 2, 1).data)).toEqual(new Array(8).fill(1));
    expect(paint).not.toHaveBeenCalled();
  });

  it("hooks each hidden canvas once", () => {
    const node = { id: "n" };
    const scratch = mockScratch(new Set([node]));
    const paint = scratch.painter();
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
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
    const fallback = new PointerHitFallback([layer([node], paint)], NOISY);
    const ctx = createShadowCtx([9, 9, 9, 255]);

    fallback.track(node, "#000001", ctx);

    expect(readPixel(ctx)).toEqual([9, 9, 9, 255]);
    expect(paint).not.toHaveBeenCalled();
  });
});

describe("pixelReadsAreNoisy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A probe canvas whose reads return what was written, after `distort`. */
  function mockProbe(distort: (data: Uint8ClampedArray) => void) {
    let written: Uint8ClampedArray = new Uint8ClampedArray();
    const probe = {
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image: ImageData) => { written = new Uint8ClampedArray(image.data); },
      getImageData: () => {
        const data = new Uint8ClampedArray(written);
        distort(data);
        return { data };
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(probe as unknown as RenderingContext);
  }

  it("is false when the probe reads back exactly what was written", () => {
    mockProbe(() => {});
    expect(pixelReadsAreNoisy()).toBe(false);
  });

  it("is true when even one channel of one pixel comes back changed", () => {
    mockProbe((data) => { data[4 * 500 + 2] ^= 1; });
    expect(pixelReadsAreNoisy()).toBe(true);
  });

  it("is true when the read is refused", () => {
    mockProbe(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(pixelReadsAreNoisy()).toBe(true);
  });

  it("is false when there is no 2D context to probe", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(pixelReadsAreNoisy()).toBe(false);
  });
});
