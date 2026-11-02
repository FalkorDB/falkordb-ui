import * as THREE from "three";

type Body = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
type Item = { body: Body; x: number; y: number; z: number; size: number };
type Slot = { x: number; y: number; z: number; size: number; color: number };
type Batch = {
  mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  slots: Slot[];
};

/** Opaque bodies only; existing meshes remain the interaction targets. */
export class NodeInstances {
  private readonly batches = new Map<THREE.BufferGeometry, Batch>();

  private readonly matrix = new THREE.Matrix4();

  private readonly hidden = new Set<Body>();

  constructor(private readonly scene: THREE.Scene) {}

  update(items: Item[]) {
    for (const body of this.hidden) body.visible = true;
    this.hidden.clear();
    const groups = new Map<THREE.BufferGeometry, Item[]>();
    for (const item of items) {
      let group = groups.get(item.body.geometry);
      if (!group) groups.set(item.body.geometry, group = []);
      group.push(item);
    }

    for (const [geometry, group] of groups) {
      let batch = this.batches.get(geometry);
      if (!batch || batch.mesh.instanceMatrix.count < group.length) {
        if (batch) this.release(batch);
        const mesh = new THREE.InstancedMesh(
          geometry, new THREE.MeshLambertMaterial(), 2 ** Math.ceil(Math.log2(group.length)),
        );
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // Per-node bounds are checked before batching; picking uses the proxies.
        mesh.frustumCulled = false;
        mesh.raycast = () => {};
        batch = { mesh, slots: [] };
        this.batches.set(geometry, batch);
        this.scene.add(mesh);
      }

      let matricesChanged = false;
      let colorsChanged = false;
      group.forEach((item, index) => {
        const previous = batch.slots[index];
        const color = item.body.material.color.getHex();
        if (!previous || previous.x !== item.x || previous.y !== item.y ||
          previous.z !== item.z || previous.size !== item.size) {
          this.matrix.makeScale(item.size, item.size, item.size).setPosition(item.x, item.y, item.z);
          batch.mesh.setMatrixAt(index, this.matrix);
          matricesChanged = true;
        }
        if (!previous || previous.color !== color) {
          batch.mesh.setColorAt(index, item.body.material.color);
          colorsChanged = true;
        }
        const slot = previous ?? (batch.slots[index] = { x: 0, y: 0, z: 0, size: 0, color: 0 });
        slot.x = item.x;
        slot.y = item.y;
        slot.z = item.z;
        slot.size = item.size;
        slot.color = color;
        item.body.visible = false;
        this.hidden.add(item.body);
      });
      batch.slots.length = group.length;
      batch.mesh.count = group.length;
      if (matricesChanged) batch.mesh.instanceMatrix.needsUpdate = true;
      if (colorsChanged && batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
    for (const [geometry, batch] of this.batches) {
      if (!groups.has(geometry)) {
        this.release(batch);
        this.batches.delete(geometry);
      }
    }
  }

  private release(batch: Batch) {
    batch.mesh.removeFromParent();
    batch.mesh.dispose();
    batch.mesh.material.dispose();
  }

  dispose() {
    for (const body of this.hidden) body.visible = true;
    this.hidden.clear();
    for (const batch of this.batches.values()) this.release(batch);
    this.batches.clear();
  }
}
