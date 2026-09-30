import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const theme = (file: string) =>
	readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/theme", file), "utf8");

describe("default styles", () => {
	it("turn the focus outline off on everything", () => {
		expect(theme("base.css").replace(/\s+/g, " ")).toContain("*:focus, *:focus-visible { outline: none; }");
	});

	it("are part of the theme, and so of the prebuilt stylesheet", () => {
		expect(theme("theme.css")).toContain('@import "./base.css";');
	});
});
