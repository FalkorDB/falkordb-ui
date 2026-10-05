/**
 * Geometric fallback for force-graph's colour-picking hit detection.
 *
 * force-graph finds the object under the pointer by painting every node and
 * link in a unique colour on a hidden canvas and reading back one pixel with
 * `getImageData`. Browsers with canvas fingerprinting protection (Brave
 * Shields, Firefox's resistFingerprinting) add noise to that read, so the
 * colour no longer maps to its object and random nodes stop responding to
 * hover, click and drag (FalkorDB/falkordb-browser#1084).
 *
 * The fallback wraps the hidden canvas's `getImageData`. A pixel that is
 * background or a colour we painted passes through untouched, so browsers that
 * read pixels faithfully behave as before. Any other pixel is resolved by
 * re-tracing the hit areas on a 1×1 scratch canvas and asking
 * `isPointInPath` / `isPointInStroke` — pure geometry, which the noise does
 * not touch — and the pixel is rewritten to the hit object's colour.
 */

export type HitTestMode = "fill" | "stroke";

export interface HitTestLayer<T extends object = object> {
  /** The layer's objects in paint order; later ones are drawn on top. */
  items: () => readonly T[];
  /** Traces `item`'s hit area — the same painter the hidden canvas uses. */
  paint: (item: T, color: string, ctx: CanvasRenderingContext2D) => void;
  /** Whether the hit area is the traced path's fill or its stroke. */
  mode: HitTestMode;
}

type CachedHit = { x: number; y: number; color: string | null };

const toHex = (r: number, g: number, b: number) =>
  `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;

export class PointerHitFallback {
  private readonly colors = new WeakMap<object, string>();

  private readonly knownColors = new Set<string>();

  private readonly hooked = new WeakSet<CanvasRenderingContext2D>();

  private scratch: CanvasRenderingContext2D | null | undefined;

  // force-graph reads the pointer pixel every animation frame, so a geometric
  // answer is reused until the pointer moves or the hidden canvas repaints.
  private cached: CachedHit | null = null;

  /**
   * @param layers - Hit-test layers, topmost first (force-graph paints links
   *   first and nodes over them, so nodes come first here).
   */
  constructor(private readonly layers: HitTestLayer[]) {}

  /**
   * Call from every pointer-area painter: records the colour force-graph gave
   * `item` and hooks the hidden canvas's pixel read the first time it is seen.
   */
  track(item: object, color: string, ctx: CanvasRenderingContext2D) {
    this.colors.set(item, color);
    this.knownColors.add(color.toLowerCase());
    this.cached = null;
    this.hook(ctx);
  }

  private hook(ctx: CanvasRenderingContext2D) {
    if (this.hooked.has(ctx) || typeof ctx.getImageData !== "function") return;
    this.hooked.add(ctx);

    const read = ctx.getImageData.bind(ctx);
    ctx.getImageData = (...args: Parameters<CanvasRenderingContext2D["getImageData"]>) => {
      const image = read(...args);
      const [sx, sy, sw, sh] = args;
      if (sw === 1 && sh === 1) this.repair(image, ctx, sx, sy);
      return image;
    };
  }

  private repair(image: ImageData, ctx: CanvasRenderingContext2D, sx: number, sy: number) {
    const { data } = image;
    if (data[3] === 0) return; // background
    if (this.knownColors.has(toHex(data[0], data[1], data[2]))) return;

    const color = this.resolve(ctx, sx, sy);
    if (!color) return;

    const rgb = parseInt(color.slice(1), 16);
    data[0] = (rgb >> 16) & 0xff;
    data[1] = (rgb >> 8) & 0xff;
    data[2] = rgb & 0xff;
    data[3] = 0xff;
  }

  private resolve(ctx: CanvasRenderingContext2D, sx: number, sy: number): string | null {
    if (this.cached && this.cached.x === sx && this.cached.y === sy) return this.cached.color;

    const color = this.hitTest(ctx.getTransform(), Math.floor(sx), Math.floor(sy));
    this.cached = { x: sx, y: sy, color };
    return color;
  }

  /** The colour of the topmost object whose hit area covers device pixel (px, py). */
  private hitTest(transform: DOMMatrix, px: number, py: number): string | null {
    const scratch = this.getScratch();
    if (!scratch) return null;

    for (const layer of this.layers) {
      const items = layer.items();
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        const color = this.colors.get(item);
        if (!color) continue;

        // The hidden canvas's transform, shifted so pixel (px, py) lands on the
        // scratch canvas's only pixel.
        const { a, b, c, d, e, f } = transform;
        scratch.setTransform(a, b, c, d, e - px, f - py);
        scratch.beginPath();
        layer.paint(item, color, scratch);

        const hit = layer.mode === "fill"
          ? scratch.isPointInPath(0.5, 0.5)
          : scratch.isPointInStroke(0.5, 0.5);
        if (hit) return color;
      }
    }

    return null;
  }

  private getScratch(): CanvasRenderingContext2D | null {
    if (this.scratch === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      this.scratch = canvas.getContext("2d");
    }
    return this.scratch;
  }
}
