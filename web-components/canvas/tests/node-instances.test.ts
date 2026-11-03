import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { NodeInstances } from "../src/node-instances";

function item(geometry = new THREE.SphereGeometry(1, 12, 8), x = 1) {
  return {
    body: new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: "#ff0000" })),
    x, y: 2, z: 3, size: 4,
  };
}

describe("opaque node instances", () => {
  it("shares one draw object per geometry with independent matrices and colors", () => {
    const scene = new THREE.Scene();
    const instances = new NodeInstances(scene);
    const first = item();
    const second = item(first.body.geometry, 8);
    second.body.material.color.set("#00ff00");
    const cube = item(new THREE.BoxGeometry(2, 2, 2));
    instances.update([first, second, cube]);

    expect(scene.children).toHaveLength(2);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    expect(mesh.count).toBe(2);
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(1, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix)).toEqual(new THREE.Vector3(8, 2, 3));
    expect(new THREE.Vector3().setFromMatrixScale(matrix)).toEqual(new THREE.Vector3(4, 4, 4));
    const color = new THREE.Color();
    mesh.getColorAt(1, color);
    expect(color.getHexString()).toBe("00ff00");
    expect(first.body.visible).toBe(false);
    expect(second.body.visible).toBe(false);
    expect(mesh.frustumCulled).toBe(false);
    const hits: THREE.Intersection[] = [];
    mesh.raycast(new THREE.Raycaster(), hits);
    expect(hits).toEqual([]);
    instances.dispose();
  });

  it("does not reupload unchanged transforms or colors", () => {
    const scene = new THREE.Scene();
    const instances = new NodeInstances(scene);
    const node = item();
    instances.update([node]);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    const matrixVersion = mesh.instanceMatrix.version;
    const colorVersion = mesh.instanceColor!.version;
    instances.update([node]);
    expect(mesh.instanceMatrix.version).toBe(matrixVersion);
    expect(mesh.instanceColor!.version).toBe(colorVersion);
    node.x = 9;
    instances.update([node]);
    expect(mesh.instanceMatrix.version).toBe(matrixVersion + 1);
    expect(mesh.instanceColor!.version).toBe(colorVersion);
    node.body.material.color.set("#0000ff");
    instances.update([node]);
    expect(mesh.instanceColor!.version).toBe(colorVersion + 1);
    instances.dispose();
  });

  it("restores normal bodies when removed and disposes batches without disposing shared geometry", () => {
    const scene = new THREE.Scene();
    const instances = new NodeInstances(scene);
    const first = item();
    const second = item(first.body.geometry);
    instances.update([first, second]);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    const disposed = vi.spyOn(mesh, "dispose");
    const geometryDisposed = vi.spyOn(first.body.geometry, "dispose");
    instances.update([second]);
    expect(first.body.visible).toBe(true);
    expect(mesh.count).toBe(1);
    instances.dispose();
    expect(second.body.visible).toBe(true);
    expect(disposed).toHaveBeenCalledOnce();
    expect(geometryDisposed).not.toHaveBeenCalled();
    expect(scene.children).toHaveLength(0);
  });

  it("grows capacity, releases old instance buffers and supports repeated disposal", () => {
    const scene = new THREE.Scene();
    const instances = new NodeInstances(scene);
    const first = item();
    instances.update([first]);
    const mesh = scene.children[0] as THREE.InstancedMesh;
    const disposed = vi.spyOn(mesh, "dispose");
    instances.update([first, item(first.body.geometry), item(first.body.geometry)]);
    expect(disposed).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(1);
    expect((scene.children[0] as THREE.InstancedMesh).instanceMatrix.count).toBe(4);
    instances.update([]);
    expect(first.body.visible).toBe(true);
    expect(scene.children).toHaveLength(0);
    instances.dispose();
    instances.dispose();
  });

  it("invisible proxy meshes remain raycast targets for existing node interactions", () => {
    const scene = new THREE.Scene();
    const instances = new NodeInstances(scene);
    const node = item();
    node.body.position.set(0, 0, 0);
    node.body.updateMatrixWorld();
    instances.update([node]);
    expect(node.body.visible).toBe(false);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
    expect(raycaster.intersectObject(node.body).length).toBeGreaterThan(0);
    instances.dispose();
  });
});
