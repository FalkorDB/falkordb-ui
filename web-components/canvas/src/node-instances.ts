import * as THREE from "three";

type Body = THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
type Outline = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial | THREE.ShaderMaterial>;
type SourceMaterial = THREE.MeshLambertMaterial | THREE.MeshBasicMaterial | THREE.ShaderMaterial;
type SourceMesh = THREE.Mesh<THREE.BufferGeometry, SourceMaterial>;
type Item = { body: Body; outline?: Outline; x: number; y: number; z: number; size: number };
type BatchItem = { mesh: SourceMesh; x: number; y: number; z: number; scale: number };
type Slot = { x: number; y: number; z: number; size: number; color: number };
type Batch = {
  mesh: THREE.InstancedMesh<THREE.BufferGeometry, SourceMaterial>;
  slots: Slot[];
};

/** Opaque bodies and borders are batched; their original meshes remain interaction targets. */
export class NodeInstances {
  private readonly bodyBatches = new Map<THREE.BufferGeometry, Batch>();

  private readonly outlineBatches = new Map<THREE.BufferGeometry, Batch>();

  private readonly matrix = new THREE.Matrix4();

  private readonly hidden = new Set<SourceMesh>();

  constructor(private readonly scene: THREE.Scene) {}

  update(items: Item[]) {
    for (const mesh of this.hidden) mesh.visible = true;
    this.hidden.clear();

    this.updateBatches(
      this.bodyBatches,
      items.map(item => ({
        mesh: item.body,
        x: item.x,
        y: item.y,
        z: item.z,
        scale: item.size,
      })),
      () => new THREE.MeshLambertMaterial(),
    );
    this.updateBatches(
      this.outlineBatches,
      items.flatMap(item => item.outline ? [{
        mesh: item.outline,
        x: item.x,
        y: item.y,
        z: item.z,
        scale: item.size * 1.05,
      }] : []),
      () => new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        opacity: 1,
        depthWrite: false,
      }),
    );
  }

  private updateBatches(
    batches: Map<THREE.BufferGeometry, Batch>,
    items: BatchItem[],
    createMaterial: () => SourceMaterial,
  ) {
    const groups = new Map<THREE.BufferGeometry, BatchItem[]>();
    for (const item of items) {
      let group = groups.get(item.mesh.geometry);
      if (!group) groups.set(item.mesh.geometry, group = []);
      group.push(item);
    }

    for (const [geometry, group] of groups) {
      let batch = batches.get(geometry);
      if (!batch || batch.mesh.instanceMatrix.count < group.length) {
        if (batch) this.release(batch);
        const mesh = new THREE.InstancedMesh(
          geometry, createMaterial(), 2 ** Math.ceil(Math.log2(group.length)),
        );
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        mesh.raycast = () => {};
        batch = { mesh, slots: [] };
        batches.set(geometry, batch);
        this.scene.add(mesh);
      }

      let matricesChanged = false;
      let colorsChanged = false;
      group.forEach((item, index) => {
        const previous = batch.slots[index];
        const materialColor = item.mesh.material instanceof THREE.ShaderMaterial
          ? item.mesh.material.uniforms.borderColor?.value
          : item.mesh.material.color;
        if (!(materialColor instanceof THREE.Color)) {
          throw new TypeError("[FalkorDBCanvas] Instanced node outlines require a color uniform");
        }
        const color = materialColor.getHex();
        if (!previous || previous.x !== item.x || previous.y !== item.y ||
          previous.z !== item.z || previous.size !== item.scale) {
          this.matrix.makeScale(item.scale, item.scale, item.scale).setPosition(item.x, item.y, item.z);
          batch.mesh.setMatrixAt(index, this.matrix);
          matricesChanged = true;
        }
        if (!previous || previous.color !== color) {
          batch.mesh.setColorAt(index, materialColor);
          colorsChanged = true;
        }
        const slot = previous ?? (batch.slots[index] = { x: 0, y: 0, z: 0, size: 0, color: 0 });
        slot.x = item.x;
        slot.y = item.y;
        slot.z = item.z;
        slot.size = item.scale;
        slot.color = color;
        item.mesh.visible = false;
        this.hidden.add(item.mesh);
      });
      batch.slots.length = group.length;
      batch.mesh.count = group.length;
      if (matricesChanged) batch.mesh.instanceMatrix.needsUpdate = true;
      if (colorsChanged && batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
    for (const [geometry, batch] of batches) {
      if (!groups.has(geometry)) {
        this.release(batch);
        batches.delete(geometry);
      }
    }
  }

  private release(batch: Batch) {
    batch.mesh.removeFromParent();
    batch.mesh.dispose();
    batch.mesh.material.dispose();
  }

  dispose() {
    for (const mesh of this.hidden) mesh.visible = true;
    this.hidden.clear();
    for (const batch of this.bodyBatches.values()) this.release(batch);
    for (const batch of this.outlineBatches.values()) this.release(batch);
    this.bodyBatches.clear();
    this.outlineBatches.clear();
  }
}
