type Vec3 = { x: number; y: number; z: number };

type Callback = (...args: unknown[]) => unknown;

/**
 * Stands in for 3d-force-graph, which needs WebGL. Every chainable setter is
 * recorded in `calls`; the getters the canvas reads return tracked state.
 */
export class MockForceGraph3DInstance {
  public calls: Array<[string, unknown[]]> = [];

  public props = new Map<string, unknown>();

  public data: { nodes: unknown[]; links: unknown[] } = { nodes: [], links: [] };

  public cameraPos: Vec3 = { x: 0, y: 0, z: 1000 };

  public controlsState = { target: { x: 0, y: 0, z: 0 } };

  public destroyed = false;

  public linkForce = { distance: (_accessor: unknown) => this.linkForce, distanceAccessor: undefined as unknown };

  public chargeForce = { strength: (_value: number) => this.chargeForce };

  constructor(public readonly container: HTMLElement) {
    // The real one renders into a canvas of its own.
    container.appendChild(document.createElement("canvas"));

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && !(prop in target)) {
          // Generic accessor: a call with arguments sets, without gets.
          return (...args: unknown[]) => {
            target.calls.push([prop, args]);
            if (args.length === 0) return target.props.get(prop);
            target.props.set(prop, args[0]);
            return receiver;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  callsTo(name: string) {
    return this.calls.filter(([n]) => n === name);
  }

  callback(name: string) {
    return this.props.get(name) as Callback;
  }

  width(value?: number) {
    if (value === undefined) return (this.props.get("width") as number) ?? 0;
    this.props.set("width", value);
    return this;
  }

  height(value?: number) {
    if (value === undefined) return (this.props.get("height") as number) ?? 0;
    this.props.set("height", value);
    return this;
  }

  graphData(value?: { nodes: unknown[]; links: unknown[] }) {
    if (value === undefined) return this.data;
    this.calls.push(["graphData", [value]]);
    this.data = value;
    return this;
  }

  d3Force(name: string) {
    if (name === "link") return this.linkForce;
    if (name === "charge") return this.chargeForce;
    return undefined;
  }

  controls() {
    return this.controlsState;
  }

  camera() {
    return { fov: 40, aspect: 1.5 };
  }

  cameraPosition(position?: Partial<Vec3>, lookAt?: Vec3, transitionMs?: number) {
    if (position === undefined) return this.cameraPos;
    this.calls.push(["cameraPosition", [position, lookAt, transitionMs]]);
    this.cameraPos = { ...this.cameraPos, ...position };
    if (lookAt) this.controlsState.target = { ...lookAt };
    return this;
  }

  _destructor() {
    this.destroyed = true;
  }
}

export const forceGraph3DMockState: {
  instances: MockForceGraph3DInstance[];
  lastInstance: MockForceGraph3DInstance | undefined;
} = {
  instances: [],
  lastInstance: undefined,
};

export function resetForceGraph3DMockState() {
  forceGraph3DMockState.instances = [];
  forceGraph3DMockState.lastInstance = undefined;
}

// Constructed with `new`, like the real Kapsule component.
function ForceGraph3DMock(this: unknown, container: HTMLElement) {
  const instance = new MockForceGraph3DInstance(container);
  forceGraph3DMockState.instances.push(instance);
  forceGraph3DMockState.lastInstance = instance;
  return instance;
}

export default ForceGraph3DMock;
