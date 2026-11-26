import { BufferGeometry, Material, Object3D, Texture } from "three";

type DisposableResource = BufferGeometry | Material | Texture;

type ResourceOwnership = {
  referenceCount: number;
  disposed: boolean;
  disposeOriginal: () => void;
};

const resourceOwnership = new WeakMap<DisposableResource, ResourceOwnership>();

export class ThreeDResourceTracker {
  acquire(object: Object3D): () => void {
    const resources = collectResources(object);
    for (const resource of resources) {
      if (resourceOwnership.get(resource)?.disposed) {
        throw new Error("[FalkorDBCanvas] Cannot reuse a disposed Three.js resource in a custom visual");
      }
    }
    for (const resource of resources) retainResource(resource);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const resource of resources) releaseResource(resource);
    };
  }
}

function retainResource(resource: DisposableResource) {
  let ownership = resourceOwnership.get(resource);
  if (!ownership) {
    ownership = {
      referenceCount: 0,
      disposed: false,
      disposeOriginal: resource.dispose.bind(resource),
    };
    // 3d-force-graph disposes custom objects on removal, even when resources are shared.
    resource.dispose = () => {};
    resourceOwnership.set(resource, ownership);
  }
  if (ownership.disposed) {
    throw new Error("[FalkorDBCanvas] Cannot reuse a disposed Three.js resource in a custom visual");
  }
  ownership.referenceCount++;
}

function releaseResource(resource: DisposableResource) {
  const ownership = resourceOwnership.get(resource);
  if (!ownership || ownership.disposed) return;
  ownership.referenceCount--;
  if (ownership.referenceCount !== 0) return;

  ownership.disposed = true;
  ownership.disposeOriginal();
}

function collectResources(root: Object3D): Set<DisposableResource> {
  const resources = new Set<DisposableResource>();

  root.traverse((object) => {
    const renderable = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (isBufferGeometry(renderable.geometry)) resources.add(renderable.geometry);
    if (renderable.material) {
      const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
      for (const material of materials) {
        if (!isMaterial(material)) continue;
        resources.add(material);
        collectTextures(Object.values(material), resources, new Set());
      }
    }
  });

  return resources;
}

function collectTextures(
  value: unknown,
  resources: Set<DisposableResource>,
  visited: Set<object>,
): void {
  if (isTexture(value)) {
    resources.add(value);
    return;
  }
  if (!value || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);

  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    for (const item of value) collectTextures(item, resources, visited);
  } else if (prototype === Object.prototype || prototype === null) {
    for (const item of Object.values(value)) collectTextures(item, resources, visited);
  }
}

function isBufferGeometry(value: unknown): value is BufferGeometry {
  return hasThreeMarker(value, "isBufferGeometry");
}

function isMaterial(value: unknown): value is Material {
  return hasThreeMarker(value, "isMaterial");
}

function isTexture(value: unknown): value is Texture {
  return hasThreeMarker(value, "isTexture");
}

function hasThreeMarker(value: unknown, marker: string): value is Record<string, unknown> & DisposableResource {
  return !!value
    && typeof value === "object"
    && marker in value
    && (value as Record<string, unknown>)[marker] === true
    && typeof (value as { dispose?: unknown }).dispose === "function";
}
