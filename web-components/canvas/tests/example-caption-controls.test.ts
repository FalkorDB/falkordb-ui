import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("example caption controls", () => {
  it("enables outside captions above nodes by default", () => {
    const html = readFileSync(resolve("examples/falkordb-canvas.example.html"), "utf8");
    const example = new DOMParser().parseFromString(html, "text/html");
    const toggle = example.querySelector<HTMLInputElement>("#caption-position-toggle");
    const side = example.querySelector<HTMLSelectElement>("#caption-side");

    expect(toggle?.checked).toBe(true);
    expect(side?.disabled).toBe(false);
    expect(side?.value).toBe("above");
    expect(example.querySelector<HTMLInputElement>("#caption-gap")?.disabled).toBe(false);
  });

  it("rejects an empty or negative caption gap when outside captions are enabled", () => {
    const html = readFileSync(resolve("examples/falkordb-canvas.example.html"), "utf8");
    const example = new DOMParser().parseFromString(html, "text/html");
    const gap = example.querySelector<HTMLInputElement>("#caption-gap")!;
    gap.disabled = false;

    gap.value = "";
    expect(gap.checkValidity()).toBe(false);
    gap.value = "-1";
    expect(gap.checkValidity()).toBe(false);
    gap.value = "0";
    expect(gap.checkValidity()).toBe(true);
  });
});
