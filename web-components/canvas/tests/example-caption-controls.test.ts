import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("example caption controls", () => {
  it("defaults the outside caption side to above while captions remain inside", () => {
    const html = readFileSync(resolve("examples/falkordb-canvas.example.html"), "utf8");
    const example = new DOMParser().parseFromString(html, "text/html");
    const toggle = example.querySelector<HTMLInputElement>("#caption-position-toggle");
    const side = example.querySelector<HTMLSelectElement>("#caption-side");

    expect(toggle?.checked).toBe(false);
    expect(side?.disabled).toBe(true);
    expect(side?.value).toBe("above");
  });
});
