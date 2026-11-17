import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildLlms, COMPONENTS, GUIDES, rewriteLinks, stripMdx } from "../scripts/build-llms.ts";

// Vitest runs from the repository root.
const rootDir = process.cwd();
const pages = [...GUIDES, ...COMPONENTS];

describe("build-llms", () => {
	const files = buildLlms(rootDir);

	it("links every page from llms.txt and generates each one", () => {
		const links = [...files["llms.txt"]!.matchAll(/\]\((llms\/[\w-]+\.md)\)/g)].map((match) => match[1]);
		expect(links).toEqual(pages.map((page) => `llms/${page.slug}.md`));
		for (const link of links) expect(files[link!]).toBeTruthy();
	});

	it("leaves no MDX syntax or Storybook-relative links", () => {
		for (const [path, contents] of Object.entries(files)) {
			const prose = contents.replace(/```[\s\S]*?```/g, "");
			expect(prose, path).not.toMatch(/^(import\s|<Meta|<Canvas)/m);
			expect(prose, path).not.toContain("](?path=");
		}
	});

	it("drops MDX-only lines but keeps JSX inside code blocks", () => {
		const mdx = [
			'import { Meta } from "@storybook/addon-docs/blocks";',
			"<Meta title='Primitives/X' />",
			"# X",
			"<Canvas of={Stories.Default} />",
			"```tsx",
			"<X />",
			"```",
		].join("\n");
		expect(stripMdx(mdx, "X.mdx")).toBe("# X\n```tsx\n<X />\n```\n");
	});

	it("fails on JSX it cannot drop", () => {
		expect(() => stripMdx("# X\n\n<ArgTypes of={X} />\n", "stories/X.mdx")).toThrow(
			'stories/X.mdx: unsupported MDX outside a code block: "<ArgTypes of={X} />"',
		);
	});

	it("fails when an MDX page is not registered", () => {
		const dir = mkdtempSync(join(tmpdir(), "llms-"));
		try {
			mkdirSync(join(dir, "stories", "patterns"), { recursive: true });
			writeFileSync(join(dir, "stories", "patterns", "Widget.mdx"), "# Widget\n");
			expect(() => buildLlms(dir)).toThrow("Add stories/patterns/Widget.mdx to COMPONENTS");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("points links at generated pages, sections or absolute URLs", () => {
		const theming = GUIDES.find((page) => page.slug === "theming")!;
		const markdown = [
			"[Button](?path=/docs/primitives-button--docs)",
			"[Card](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-card--docs)",
			"[Tokens](?path=/docs/theme-tokens--docs)",
			"[Setup](./getting-started.md#install)",
			"[Theme](../src/theme/theme.css)",
			"[Fonts](#fonts)",
		].join("\n");

		expect(rewriteLinks(markdown, theming, pages, "page")).toBe(
			[
				"[Button](./button.md)",
				"[Card](./card.md)",
				"[Tokens](https://falkordb.github.io/falkordb-ui/?path=/docs/theme-tokens--docs)",
				"[Setup](./getting-started.md#install)",
				"[Theme](https://github.com/FalkorDB/falkordb-ui/blob/main/src/theme/theme.css)",
				"[Fonts](#fonts)",
			].join("\n"),
		);
		expect(rewriteLinks(markdown, theming, pages, "full")).toMatch(
			/^\[Button\]\(#button\)\n\[Card\]\(#card\)\n.*\n\[Setup\]\(#install\)/,
		);
	});
});
