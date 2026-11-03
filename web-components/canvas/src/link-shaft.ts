import * as THREE from "three";

class TrimmedCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly curve: THREE.Curve<THREE.Vector3>, private readonly end: number) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    return this.curve.getPoint(t * this.end, target);
  }
}

/** Custom shaft only; three-forcegraph still positions and draws the arrow. */
export class LinkShaft extends THREE.Group {
  private shaft: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial | THREE.MeshLambertMaterial> |
    THREE.Mesh<THREE.BufferGeometry, THREE.LineBasicMaterial | THREE.MeshLambertMaterial>;

  private points = new Float64Array(0);

  private readonly point = new THREE.Vector3();

  private disposed = false;

  constructor(public readonly label: THREE.Object3D, private width: number,
    material: THREE.LineBasicMaterial | THREE.MeshLambertMaterial) {
    super();
    this.shaft = width > 0
      ? new THREE.Mesh(new THREE.BufferGeometry(), material)
      : new THREE.Line(new THREE.BufferGeometry(), material);
    this.add(this.shaft, label);
  }

  setMaterial(material: THREE.LineBasicMaterial | THREE.MeshLambertMaterial) {
    this.shaft.material = material;
  }

  get material() {
    return this.shaft.material;
  }

  setStyle(width: number, material: THREE.LineBasicMaterial | THREE.MeshLambertMaterial) {
    if (width !== this.width) {
      this.width = width;
      this.shaft.geometry.dispose();
      this.shaft.removeFromParent();
      this.shaft = width > 0
        ? new THREE.Mesh(new THREE.BufferGeometry(), material)
        : new THREE.Line(new THREE.BufferGeometry(), material);
      this.label.removeFromParent();
      this.add(this.shaft, this.label);
      this.points = new Float64Array(0);
    }
    this.setMaterial(material);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.shaft.geometry.dispose();
    // Caption textures and shaft materials belong to the renderer's caches.
    if (this.label instanceof THREE.Sprite) this.label.material.dispose();
  }

  update(start: THREE.Vector3, end: THREE.Vector3, curve: THREE.Curve<THREE.Vector3> | null, targetRadius: number, arrowLength: number) {
    if (this.disposed) return;
    const path = curve ?? new THREE.LineCurve3(start, end);
    const length = path.getLength();
    // Match the native arrow's parameterization, including curved/self links.
    const t = length > 0 ? THREE.MathUtils.clamp(1 - (targetRadius + arrowLength) / length, 0, 1) : 0;
    this.shaft.visible = t > 0;
    if (t <= 0) return;
    const trimmed = new TrimmedCurve(path, t);
    const count = curve ? 31 : 2;
    let changed = this.points.length !== count * 3;
    if (changed) this.points = new Float64Array(count * 3);
    // Sample the live curve, not its identity: native curves can mutate in place.
    for (let i = 0; i < count; i++) {
      trimmed.getPoint(i / (count - 1), this.point);
      const offset = i * 3;
      if (this.points[offset] !== this.point.x || this.points[offset + 1] !== this.point.y || this.points[offset + 2] !== this.point.z) changed = true;
      this.points[offset] = this.point.x;
      this.points[offset + 1] = this.point.y;
      this.points[offset + 2] = this.point.z;
    }
    if (!changed) return;
    if (this.shaft instanceof THREE.Line) {
      let positions = this.shaft.geometry.getAttribute("position");
      if (!positions || positions.count !== count) {
        positions = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
        this.shaft.geometry.setAttribute("position", positions);
      }
      for (let i = 0; i < count; i++) {
        positions.setXYZ(i, this.points[i * 3], this.points[i * 3 + 1], this.points[i * 3 + 2]);
      }
      positions.needsUpdate = true;
      this.shaft.geometry.computeBoundingSphere();
    } else {
      const geometry = new THREE.TubeGeometry(trimmed, curve ? 30 : 1, Math.ceil(this.width * 10) / 20, 6, false);
      this.shaft.geometry.dispose();
      this.shaft.geometry = geometry;
    }
  }
}
