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
 * The fallback wraps the hidden canvas's `getImageData`:
 *
 * - Where pixel reads are faithful, a background pixel or a colour painted for
 *   a current object passes through untouched, so those browsers behave as
 *   before. Only other pixels (an antialiased edge) are resolved by geometry.
 * - Where pixel reads carry noise, no pixel value is trusted: noise can turn a
 *   colour into background, into nothing, or into another object's colour. Every
 *   read is resolved by geometry.
 *
 * Geometry means re-tracing the hit areas on a 1×1 scratch canvas and asking
 * `isPointInPath` / `isPointInStroke`, which the noise does not touch. The pixel
 * is then rewritten to the hit object's colour, or cleared when nothing is hit.
 */

/** An axis-aligned box in graph coordinates. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface HitTestLayer<T extends object = object> {
  /** The layer's objects in paint order; later ones are drawn on top. */
  items: () => readonly T[];
  /**
   * Traces `item`'s hit area: the same painter the hidden canvas uses. Every
   * region it fills or strokes counts as a hit, including `fillRect` and
   * `strokeRect`, and painters that draw several shapes.
   */
  paint: (item: T, color: string, ctx: CanvasRenderingContext2D) => void;
  /**
   * A box, in graph coordinates, that contains `item`'s whole hit area, or
   * `null` when it is not known (e.g. a custom painter). Lets the fallback skip
   * objects far from the pointer without tracing them.
   */
  bounds?: (item: T) => Bounds | null;
  /** Extra screen pixels around `bounds`, for strokes sized in screen pixels. Read at hit-test time. */
  padding?: () => number;
}

export interface PointerHitFallbackOptions {
  /** Whether this browser adds noise to canvas pixel reads. Probed once by default. */
  detectNoise?: () => boolean;
}

type CachedHit = { x: number; y: number; generation: number; color: string | null };

const toHex = (r: number, g: number, b: number) =>
  `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;

const PROBE_SIZE = 32;

/**
 * Whether canvas pixel reads come back altered, as with fingerprinting
 * protection. Writes a known pattern to a throwaway canvas and reads it back;
 * opaque pixels written with `putImageData` read back exactly when nothing
 * interferes.
 */
export function pixelReadsAreNoisy(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = PROBE_SIZE;
    canvas.height = PROBE_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (
      !ctx ||
      typeof ctx.createImageData !== "function" ||
      typeof ctx.putImageData !== "function" ||
      typeof ctx.getImageData !== "function"
    ) {
      return false;
    }

    const pattern = ctx.createImageData(PROBE_SIZE, PROBE_SIZE);
    for (let i = 0; i < pattern.data.length; i += 4) {
      const n = i / 4;
      pattern.data[i] = (n * 37) & 0xff;
      pattern.data[i + 1] = (n * 91 + 13) & 0xff;
      pattern.data[i + 2] = (n * 151 + 7) & 0xff;
      pattern.data[i + 3] = 0xff;
    }
    ctx.putImageData(pattern, 0, 0);

    const { data } = ctx.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE);
    for (let i = 0; i < pattern.data.length; i += 1) {
      if (data[i] !== pattern.data[i]) return true;
    }
    return false;
  } catch {
    // A browser that refuses the read cannot be trusted either.
    return true;
  }
}

/** A scratch context whose fill and stroke calls record whether they cover its pixel. */
type ScratchContext = CanvasRenderingContext2D & { hit: boolean };

export class PointerHitFallback {
  private readonly colors = new WeakMap<object, string>();

  private readonly owners = new Map<string, object>();

  private readonly hooked = new WeakSet<CanvasRenderingContext2D>();

  // Rebuilt after each repaint, so colours of removed objects stop counting.
  private current: Set<object> | null = null;

  private noisy: boolean | undefined;

  private scratch: ScratchContext | null | undefined;

  // Bumped by every hit-area paint. force-graph reads the pointer pixel every
  // animation frame, so a geometric answer is reused until the pointer moves
  // or the hidden canvas repaints.
  private generation = 0;

  private cached: CachedHit | null = null;

  /**
   * @param layers - Hit-test layers, topmost first (force-graph paints links
   *   first and nodes over them, so nodes come first here).
   */
  constructor(
    private readonly layers: HitTestLayer[],
    private readonly options: PointerHitFallbackOptions = {},
  ) {}

  /**
   * Call from every pointer-area painter: records the colour force-graph gave
   * `item` and hooks the hidden canvas's pixel read the first time it is seen.
   */
  track(item: object, color: string, ctx: CanvasRenderingContext2D) {
    const key = color.toLowerCase();
    this.colors.set(item, key);
    this.owners.set(key, item);
    this.current = null;
    this.generation += 1;
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

  private readsAreNoisy(): boolean {
    if (this.noisy === undefined) this.noisy = (this.options.detectNoise ?? pixelReadsAreNoisy)();
    return this.noisy;
  }

  private repair(image: ImageData, ctx: CanvasRenderingContext2D, sx: number, sy: number) {
    const { data } = image;

    if (!this.readsAreNoisy()) {
      if (data[3] === 0) return; // background
      if (this.isCurrentColor(toHex(data[0], data[1], data[2]))) return;
    }

    if (!this.getScratch()) return;

    const color = this.resolve(ctx, sx, sy);
    if (!color) {
      // Nothing is under the pointer: make sure no stale or noisy colour can
      // still be looked up as an object.
      data[0] = 0;
      data[1] = 0;
      data[2] = 0;
      data[3] = 0;
      return;
    }

    const rgb = parseInt(color.slice(1), 16);
    data[0] = (rgb >> 16) & 0xff;
    data[1] = (rgb >> 8) & 0xff;
    data[2] = rgb & 0xff;
    data[3] = 0xff;
  }

  /** Whether `color` was painted for an object that is still in a layer. */
  private isCurrentColor(color: string): boolean {
    const owner = this.owners.get(color);
    if (!owner || this.colors.get(owner) !== color) return false;

    if (!this.current) {
      this.current = new Set();
      for (const layer of this.layers) for (const item of layer.items()) this.current.add(item);
    }
    return this.current.has(owner);
  }

  private resolve(ctx: CanvasRenderingContext2D, sx: number, sy: number): string | null {
    const { cached, generation } = this;
    if (cached && cached.x === sx && cached.y === sy && cached.generation === generation) return cached.color;

    const color = this.hitTest(ctx.getTransform(), Math.floor(sx), Math.floor(sy));
    this.cached = { x: sx, y: sy, generation, color };
    return color;
  }

  /** The colour of the topmost object whose hit area covers device pixel (px, py). */
  private hitTest(transform: DOMMatrix, px: number, py: number): string | null {
    const scratch = this.getScratch();
    if (!scratch) return null;

    const { a, b, c, d, e, f } = transform;
    // The pixel's centre in graph coordinates, and the screen-to-graph scale,
    // for the bounding-box pre-check.
    const det = a * d - b * c;
    const cx = px + 0.5 - e;
    const cy = py + 0.5 - f;
    const gx = det ? (d * cx - c * cy) / det : NaN;
    const gy = det ? (a * cy - b * cx) / det : NaN;
    const scale = (Math.hypot(a, b) + Math.hypot(c, d)) / 2 || 1;

    for (const layer of this.layers) {
      const items = layer.items();
      const pad = (layer.padding?.() ?? 0) / scale;

      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        const color = this.colors.get(item);
        if (!color) continue;

        const box = layer.bounds?.(item);
        if (
          box &&
          Number.isFinite(gx) &&
          (gx < box.minX - pad || gx > box.maxX + pad || gy < box.minY - pad || gy > box.maxY + pad)
        ) {
          continue;
        }

        // The hidden canvas's transform, shifted so pixel (px, py) lands on the
        // scratch canvas's only pixel. save/restore keeps one painter's line
        // state from leaking into the next.
        scratch.save();
        scratch.setTransform(a, b, c, d, e - px, f - py);
        scratch.beginPath();
        scratch.hit = false;
        layer.paint(item, color, scratch);
        const { hit } = scratch;
        scratch.restore();

        if (hit) return color;
      }
    }

    return null;
  }

  private getScratch(): ScratchContext | null {
    if (this.scratch === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      this.scratch = ctx && typeof ctx.isPointInPath === "function" ? PointerHitFallback.instrument(ctx) : null;
    }
    return this.scratch;
  }

  /**
   * Turns a context's drawing calls into hit tests against its single pixel
   * (0.5, 0.5): a painter's `fill`, `stroke`, `fillRect` and `strokeRect` each
   * record whether they cover it, instead of drawing.
   */
  private static instrument(ctx: CanvasRenderingContext2D): ScratchContext {
    const scratch = ctx as ScratchContext;
    const inPath = ctx.isPointInPath.bind(ctx) as (...args: unknown[]) => boolean;
    const inStroke = typeof ctx.isPointInStroke === "function"
      ? (ctx.isPointInStroke.bind(ctx) as (...args: unknown[]) => boolean)
      : () => false;
    scratch.hit = false;

    scratch.fill = ((...args: unknown[]) => {
      const hit = typeof args[0] === "object" && args[0] !== null
        ? inPath(args[0], 0.5, 0.5, ...args.slice(1))
        : inPath(0.5, 0.5, ...args);
      if (hit) scratch.hit = true;
    }) as CanvasRenderingContext2D["fill"];

    scratch.stroke = ((path?: Path2D) => {
      if (path ? inStroke(path, 0.5, 0.5) : inStroke(0.5, 0.5)) scratch.hit = true;
    }) as CanvasRenderingContext2D["stroke"];

    // fillRect and strokeRect draw without touching the current path, so they
    // are tested against the rectangle directly, in the context's user space.
    const pixelInUserSpace = () => {
      const { a, b, c, d, e, f } = ctx.getTransform();
      const det = a * d - b * c;
      if (!det) return null;
      const x = 0.5 - e;
      const y = 0.5 - f;
      return { x: (d * x - c * y) / det, y: (a * y - b * x) / det };
    };

    scratch.fillRect = (x: number, y: number, w: number, h: number) => {
      const p = pixelInUserSpace();
      if (!p) return;
      if (p.x >= Math.min(x, x + w) && p.x <= Math.max(x, x + w) && p.y >= Math.min(y, y + h) && p.y <= Math.max(y, y + h)) {
        scratch.hit = true;
      }
    };

    scratch.strokeRect = (x: number, y: number, w: number, h: number) => {
      const p = pixelInUserSpace();
      if (!p) return;
      const half = ctx.lineWidth / 2;
      const left = Math.min(x, x + w);
      const right = Math.max(x, x + w);
      const top = Math.min(y, y + h);
      const bottom = Math.max(y, y + h);
      const inOuter = p.x >= left - half && p.x <= right + half && p.y >= top - half && p.y <= bottom + half;
      const inInner = p.x > left + half && p.x < right - half && p.y > top + half && p.y < bottom - half;
      if (inOuter && !inInner) scratch.hit = true;
    };

    return scratch;
  }
}
