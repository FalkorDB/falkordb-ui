import { PerspectiveCamera, Scene, Vector2, Vector3 } from "three";

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

  private controlChanges = new Set<() => void>();

  public controlsState = {
    target: new Vector3(),
    enabled: true,
    noPan: false,
    noRotate: false,
    noZoom: false,
    state: -1,
    keyState: -1,
    _movePrev: new Vector2(),
    _moveCurr: new Vector2(),
    _zoomStart: new Vector2(),
    _zoomEnd: new Vector2(),
    _panStart: new Vector2(),
    _panEnd: new Vector2(),
    _lastAngle: 0,
    _lastRollAngle: 0,
    _touchRollAngle: 0,
    _touchRollPointerIds: "",
    mouseButtons: {} as Record<string, number | null>,
    update: () => {
      const { x, y, z } = this.controlsState.target;
      this.cameraObject.position.copy(this.cameraPos);
      this.cameraObject.lookAt(x, y, z);
      this.cameraObject.updateMatrixWorld(true);
    },
    addEventListener: (_name: string, callback: () => void) => { this.controlChanges.add(callback); },
    removeEventListener: (_name: string, callback: () => void) => { this.controlChanges.delete(callback); },
  };

  controlsChanged() {
    for (const callback of this.controlChanges) callback();
  }

  public sceneObject = new Scene();

  public destroyed = false;

  public contextLost = false;

  scene() { return this.sceneObject; }

  renderer() {
    return { forceContextLoss: () => { this.contextLost = true; } };
  }

  public linkForce = {
    distanceAccessor: undefined as unknown,
    /** The links last bound to the force, as d3 would simulate them. */
    linkSet: undefined as { id: number }[] | undefined,
    distance: (accessor: unknown) => {
      this.linkForce.distanceAccessor = accessor;
      return this.linkForce;
    },
    links(links?: { id: number }[]) {
      if (links === undefined) return this.linkSet;
      this.linkSet = links;
      return this;
    },
  };

  public chargeForce = { strength: (_value: number) => this.chargeForce };

  constructor(public readonly container: HTMLElement) {
    this.cameraObject.position.set(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
    this.cameraObject.lookAt(0, 0, 0);
    this.cameraObject.updateMatrixWorld(true);
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
    this.cameraObject.aspect = value / (this.height() || 1);
    this.cameraObject.updateProjectionMatrix();
    return this;
  }

  height(value?: number) {
    if (value === undefined) return (this.props.get("height") as number) ?? 0;
    this.props.set("height", value);
    this.cameraObject.aspect = (this.width() || 1) / value;
    this.cameraObject.updateProjectionMatrix();
    return this;
  }

  graphData(value?: { nodes: unknown[]; links: unknown[] }) {
    if (value === undefined) return this.data;
    this.calls.push(["graphData", [value]]);
    this.data = value;
    // The real library binds every link to the link force on each data update.
    this.linkForce.links(value.links as { id: number }[]);
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

  /** The perspective camera: field of view, aspect, and the up vector dragging can roll. */
  public cameraObject = new PerspectiveCamera(40, 1.5, 0.1, 100000);

  camera() {
    this.cameraObject.position.copy(this.cameraPos);
    this.cameraObject.aspect = this.width() / this.height();
    this.cameraObject.updateProjectionMatrix();
    this.cameraObject.updateMatrixWorld();
    return this.cameraObject;
  }

  /** Moves the camera as a user's drag would, without it counting as a call. */
  simulateDrag(position: Vec3, target: Vec3) {
    this.cameraPos = { ...position };
    if (this.controlsState.target instanceof Vector3) {
      this.controlsState.target.set(target.x, target.y, target.z);
    } else {
      this.controlsState.target = { ...target };
    }
    this.cameraObject.position.set(position.x, position.y, position.z);
    this.cameraObject.lookAt(target.x, target.y, target.z);
    this.cameraObject.updateMatrixWorld(true);
  }

  cameraPosition(position?: Partial<Vec3>, lookAt?: Vec3, transitionMs?: number) {
    if (position === undefined) return this.cameraPos;
    this.calls.push(["cameraPosition", [position, lookAt, transitionMs]]);
    this.cameraPos = { ...this.cameraPos, ...position };
    this.cameraObject.position.set(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
    if (lookAt) {
      if (this.controlsState.enabled && this.controlsState.target instanceof Vector3) {
        this.controlsState.target.set(lookAt.x, lookAt.y, lookAt.z);
      } else {
        this.cameraObject.lookAt(lookAt.x, lookAt.y, lookAt.z);
      }
    }
    this.cameraObject.updateMatrixWorld(true);
    return this;
  }

  enableNavigationControls(enabled: boolean) {
    this.controlsState.enabled = enabled;
    return this;
  }

  _destructor() {
    this.destroyed = true;
  }
}

export const forceGraph3DMockState: {
  instances: MockForceGraph3DInstance[];
  lastInstance: MockForceGraph3DInstance | undefined;
  /** Makes the next construction throw, as the real one does without WebGL. */
  failNext: boolean;
} = {
  instances: [],
  lastInstance: undefined,
  failNext: false,
};

export function resetForceGraph3DMockState() {
  forceGraph3DMockState.instances = [];
  forceGraph3DMockState.lastInstance = undefined;
  forceGraph3DMockState.failNext = false;
}

// Constructed with `new`, like the real Kapsule component.
function ForceGraph3DMock(this: unknown, container: HTMLElement) {
  if (forceGraph3DMockState.failNext) {
    forceGraph3DMockState.failNext = false;
    throw new Error("Error creating WebGL context.");
  }
  const instance = new MockForceGraph3DInstance(container);
  forceGraph3DMockState.instances.push(instance);
  forceGraph3DMockState.lastInstance = instance;
  return instance;
}

export default ForceGraph3DMock;
