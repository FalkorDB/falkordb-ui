import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const example = new DOMParser().parseFromString(
  readFileSync(resolve("examples/falkordb-canvas.example.html"), "utf8"),
  "text/html",
);

describe("interactive example dimensions and hover", () => {
  it("offers 2D and 3D switching with browser import mappings", () => {
    const dimension = example.querySelector<HTMLSelectElement>("#dimension-select");
    const importMap = JSON.parse(example.querySelector('script[type="importmap"]')?.textContent ?? "{}");
    const moduleScript = [...example.querySelectorAll('script[type="module"]')]
      .map((script) => script.textContent ?? "")
      .join("\n");

    expect([...dimension?.options ?? []].map((option) => option.value)).toEqual(["2d", "3d"]);
    expect(importMap.imports).toMatchObject({
      "3d-force-graph": expect.any(String),
      three: expect.any(String),
      "three/webgpu": expect.any(String),
      "three/tsl": expect.any(String),
      "three/addons/": expect.any(String),
      "three/examples/": expect.any(String),
    });
    expect(moduleScript).toContain("await canvas.setDimension(dimension)");
  });

  it("visually emphasizes nodes and links while they are hovered", () => {
    const moduleScript = [...example.querySelectorAll('script[type="module"]')]
      .map((script) => script.textContent ?? "")
      .join("\n");

    expect(moduleScript).toContain("hoveredNode = node");
    expect(moduleScript).toContain("hoveredLink = link");
    expect(moduleScript).toContain("isNodeSelected: (node)");
    expect(moduleScript).toContain("isLinkSelected: (link)");
  });

  it("keeps caption side controls disabled when outside captions are off", () => {
    const moduleScript = [...example.querySelectorAll('script[type="module"]')]
      .map((script) => script.textContent ?? "")
      .join("\n");

    expect(moduleScript).toContain("const captionOptionsEnabled = isTwoD && captionPositionToggle.checked");
    expect(moduleScript).toContain("control.disabled = !captionOptionsEnabled");
  });

  it("places user controls over the graph and groups configuration by scope", () => {
    const graphControls = example.querySelector(".graph-container .canvas-controls");
    const sidebar = example.querySelector(".sidebar");
    const scopeLabels = [...(sidebar?.querySelectorAll(".sidebar-scope-label") ?? [])]
      .map((label) => label.textContent?.trim());

    expect(graphControls?.querySelector("#dimension-select")).not.toBeNull();
    expect(graphControls?.querySelector("#layout-select")).not.toBeNull();
    expect(graphControls?.querySelector("#animation-toggle")).not.toBeNull();
    expect(graphControls?.querySelector("#caption-position-toggle")).not.toBeNull();
    expect(graphControls?.querySelector("#caption-side")).not.toBeNull();
    expect(graphControls?.querySelector("#caption-gap")).not.toBeNull();
    expect(example.querySelector<HTMLInputElement>("#caption-position-toggle")?.checked).toBe(true);
    expect(sidebar?.querySelector("#dimension-select")).toBeNull();
    expect(sidebar?.querySelector("#layout-select")).toBeNull();
    expect(sidebar?.querySelector("#query-input")).not.toBeNull();
    expect(sidebar?.querySelector("#node-shape")).not.toBeNull();
    expect(scopeLabels).toEqual(["Shared / Root", "2D", "3D"]);
    expect(sidebar?.querySelector("#ns-selectedGlowColor")).not.toBeNull();
    expect(sidebar?.querySelector("#td-linkWidth")).not.toBeNull();
    expect(sidebar?.querySelector("#lg-enabled")).not.toBeNull();
  });
});
