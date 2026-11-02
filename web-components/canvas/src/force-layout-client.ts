import type { LayoutInput, LayoutOutput, LayoutRequest } from "./force-layout.js";

interface LayoutWorker {
  onmessage: ((event: MessageEvent<LayoutOutput>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: LayoutInput, transfer?: Transferable[]): void;
  terminate(): void;
}

/** One outstanding transferable buffer; cancellation invalidates late replies. */
export class ForceLayoutClient {
  private revision = 0;

  private worker: LayoutWorker | undefined;

  constructor(
    private readonly apply: (positions: Float64Array, done: boolean) => void,
    private readonly failed: (error: Error) => void,
    private readonly createWorker: () => LayoutWorker = () => new Worker(new URL("./force-layout.worker.js", import.meta.url), { type: "module" }),
  ) {}

  start(request: Omit<LayoutRequest, "revision">) {
    this.stop();
    const revision = this.revision;
    try {
      const worker = this.worker = this.createWorker();
      const fail = (error: Error) => {
        if (this.worker !== worker) return;
        this.stop();
        this.failed(error);
      };
      worker.onerror = event => {
        event.preventDefault();
        fail(new Error(event.message || "3D layout worker could not start"));
      };
      worker.onmessageerror = () => fail(new Error("Could not read the 3D layout worker response"));
      worker.onmessage = ({ data }: MessageEvent<LayoutOutput>) => {
        if (this.worker !== worker || data.revision !== revision) return;
        if (data.type === "error") {
          fail(new Error(data.message));
          return;
        }
        if (data.positions.length !== request.nodes.length * 6 || !data.positions.every(Number.isFinite)) {
          fail(new Error("Invalid 3D layout worker positions"));
          return;
        }
        try {
          this.apply(data.positions, data.done);
          if (this.worker !== worker) return;
          if (data.done) this.stop();
          else {
            const next: LayoutInput = { type: "next", revision, positions: data.positions };
            worker.postMessage(next, [data.positions.buffer]);
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      };
      const message: LayoutInput = { type: "start", request: { ...request, revision } };
      worker.postMessage(message);
      return true;
    } catch (error) {
      this.stop();
      this.failed(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  stop() {
    this.revision += 1;
    this.worker?.terminate();
    this.worker = undefined;
  }
}
