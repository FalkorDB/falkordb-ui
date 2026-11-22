import { afterEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, ShaderMaterial, Texture, type BufferGeometry, type Material } from "three";
import { ThreeDResourceTracker } from "../src/three-d-resource-tracker";

describe("ThreeDResourceTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("intercepts explicit disposal through every reference until the last visual releases shared resources", () => {
    const tracker = new ThreeDResourceTracker();
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const originalGeometryDispose = geometry.dispose;
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    const disposeTexture = vi.spyOn(texture, "dispose");
    const first = tracker.acquire(new Group().add(new Mesh(geometry, material)));
    const second = tracker.acquire(new Group().add(new Mesh(geometry, material)));
    const externalGeometryReference = geometry;

    expect(externalGeometryReference.dispose).not.toBe(originalGeometryDispose);
    externalGeometryReference.dispose();
    material.dispose();
    texture.dispose();

    expect(disposeGeometry).not.toHaveBeenCalled();
    expect(disposeMaterial).not.toHaveBeenCalled();
    expect(disposeTexture).not.toHaveBeenCalled();

    first();

    expect(disposeGeometry).not.toHaveBeenCalled();
    expect(disposeMaterial).not.toHaveBeenCalled();
    expect(disposeTexture).not.toHaveBeenCalled();

    second();

    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);

    expect(externalGeometryReference.dispose).not.toBe(originalGeometryDispose);
    externalGeometryReference.dispose();
    material.dispose();
    texture.dispose();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
  });

  it("allows a replacement to acquire shared resources before the previous visual releases them", () => {
    const tracker = new ThreeDResourceTracker();
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial();
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const oldVisual = tracker.acquire(new Group().add(new Mesh(geometry, material)));
    const replacement = tracker.acquire(new Group().add(new Mesh(geometry, material)));

    oldVisual();

    expect(disposeGeometry).not.toHaveBeenCalled();
    replacement();

    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  });

  it("counts duplicate resources once per visual and finds textures in shader uniforms", () => {
    const tracker = new ThreeDResourceTracker();
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new ShaderMaterial({
      uniforms: {
        first: { value: texture },
        second: { value: { nested: texture } },
      },
    });
    const cycle: Record<string, unknown> = { texture };
    cycle.self = cycle;
    material.userData.cycle = cycle;
    const disposeGeometry = vi.spyOn(geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    const disposeTexture = vi.spyOn(texture, "dispose");
    const group = new Group().add(
      new Mesh(geometry, material),
      new Mesh(geometry, material),
    );
    const release = tracker.acquire(group);

    release();
    release();

    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
  });

  it("recognizes Three.js resources from another module instance by their public markers", () => {
    const tracker = new ThreeDResourceTracker();
    const disposeGeometry = vi.fn();
    const disposeMaterial = vi.fn();
    const disposeTexture = vi.fn();
    const geometry = { isBufferGeometry: true, dispose: disposeGeometry } as unknown as BufferGeometry;
    const texture = { isTexture: true, dispose: disposeTexture } as unknown as Texture;
    const material = { isMaterial: true, map: texture, dispose: disposeMaterial } as unknown as Material;
    const mesh = new Mesh();
    mesh.geometry = geometry;
    mesh.material = material;
    const release = tracker.acquire(new Group().add(mesh));

    release();

    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
  });
});
