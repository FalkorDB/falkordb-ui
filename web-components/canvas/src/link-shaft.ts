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
  private readonly shaft: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial | THREE.MeshLambertMaterial> |
    THREE.Mesh<THREE.BufferGeometry, THREE.LineBasicMaterial | THREE.MeshLambertMaterial>;

  constructor(public readonly label: THREE.Object3D, private readonly width: number,
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

  update(start: THREE.Vector3, end: THREE.Vector3, curve: THREE.Curve<THREE.Vector3> | null, targetRadius: number, arrowLength: number) {
    const path = curve ?? new THREE.LineCurve3(start, end);
    const length = path.getLength();
    // Match the native arrow's parameterization, including curved/self links.
    const t = length > 0 ? THREE.MathUtils.clamp(1 - (targetRadius + arrowLength) / length, 0, 1) : 0;
    this.shaft.visible = t > 0;
    if (t <= 0) return;
    const trimmed = new TrimmedCurve(path, t);
    if (this.shaft instanceof THREE.Line) {
      const count = curve ? 31 : 2;
      let positions = this.shaft.geometry.getAttribute("position");
      if (!positions || positions.count !== count) {
        positions = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
        this.shaft.geometry.setAttribute("position", positions);
      }
      const point = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        trimmed.getPoint(i / (count - 1), point);
        positions.setXYZ(i, point.x, point.y, point.z);
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
