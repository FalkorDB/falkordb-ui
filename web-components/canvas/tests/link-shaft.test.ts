import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { LinkShaft } from "../src/link-shaft";

describe("3D edge shaft", () => {
  const start = new THREE.Vector3(0, 0, 0);
  const end = new THREE.Vector3(200, 0, 0);

  it.each([0, 3])("stops a straight shaft at the arrow's back, width %s", width => {
    const shaft = new LinkShaft(new THREE.Object3D(), width, width ? new THREE.MeshLambertMaterial() : new THREE.LineBasicMaterial());
    shaft.update(start, end, null, 10, 20);
    const body = shaft.children[0] as THREE.Line | THREE.Mesh;
    const positions = body.geometry.getAttribute("position");
    const xs = Array.from({ length: positions.count }, (_, i) => positions.getX(i));
    expect(Math.max(...xs)).toBeCloseTo(170);
    expect(Math.min(...xs)).toBeCloseTo(0);
  });

  it.each([
    new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(100, 150, 30), end),
    new THREE.CubicBezierCurve3(start, new THREE.Vector3(100, 100, 0), new THREE.Vector3(-100, 100, 0), start),
  ])("trims curves and self-loops at the native arrow parameter", curve => {
    const shaft = new LinkShaft(new THREE.Object3D(), 0, new THREE.LineBasicMaterial());
    shaft.update(start, end, curve, 10, 20);
    const body = shaft.children[0] as THREE.Line;
    const positions = body.geometry.getAttribute("position");
    const tail = curve.getPoint(1 - 30 / curve.getLength());
    const endpoint = new THREE.Vector3().fromBufferAttribute(positions, positions.count - 1);
    expect(endpoint.distanceTo(tail)).toBeLessThan(0.00001);
    expect(positions.count).toBe(31);
  });

  it("reuses line buffers and restores the full shaft to the node when arrows hide", () => {
    const shaft = new LinkShaft(new THREE.Object3D(), 0, new THREE.LineBasicMaterial());
    shaft.update(start, end, null, 10, 20);
    const body = shaft.children[0] as THREE.Line;
    const positions = body.geometry.getAttribute("position");
    shaft.update(start, end, null, 10, 0);
    expect(body.geometry.getAttribute("position")).toBe(positions);
    expect(positions.getX(1)).toBe(190);
    shaft.update(start, end, null, 10, 40);
    expect(positions.getX(1)).toBe(150);
  });

  it("hides degenerate/overlapping shafts without invalid vertices", () => {
    const shaft = new LinkShaft(new THREE.Object3D(), 0, new THREE.LineBasicMaterial());
    shaft.update(start, start, null, 10, 20);
    expect(shaft.children[0].visible).toBe(false);
    shaft.update(start, new THREE.Vector3(15, 0, 0), null, 10, 20);
    expect(shaft.children[0].visible).toBe(false);
    shaft.update(start, end, null, 10, 20);
    expect(shaft.children[0].visible).toBe(true);
  });

  it("updates color and releases replaced selected-shaft geometry", () => {
    const shaft = new LinkShaft(new THREE.Object3D(), 3, new THREE.MeshLambertMaterial());
    shaft.update(start, end, null, 10, 20);
    const body = shaft.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
    const disposed = vi.spyOn(body.geometry, "dispose");
    shaft.update(start, end, null, 10, 40);
    expect(disposed).toHaveBeenCalledOnce();
    const material = new THREE.MeshLambertMaterial({ color: "#ff0000" });
    shaft.setMaterial(material);
    expect(body.material).toBe(material);
    expect(body.material.color.getHex()).toBe(0xff0000);
    expect(body.geometry.getAttribute("position").array.every(Number.isFinite)).toBe(true);
  });
});
