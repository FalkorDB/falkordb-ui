// Builds the docs for AI agents (llms.txt, llms-full.txt and one Markdown page per guide
// and component) from docs/*.md and the Storybook MDX pages, so the two cannot drift.
//
// Usage: node --experimental-strip-types scripts/build-llms.ts <outDir>

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_URL = "https://github.com/FalkorDB/falkordb-ui";
const STORYBOOK_URL = "https://falkordb.github.io/falkordb-ui/";

export interface Page {
	/** Name, without extension, of the generated page in llms/. */
	slug: string;
	/** Source file, relative to the repository root. */
	source: string;
	title: string;
	/** Storybook docs id, for resolving `?path=/docs/<id>--docs` links. */
	storybookId?: string;
	/** Replaces the description taken from the page's first paragraph. */
	description?: string;
}

const guide = (slug: string, title: string, description: string): Page => ({
	slug,
	source: `docs/${slug}.md`,
	title,
	description,
});

const component = (name: string, group = "primitives"): Page => ({
	slug: name.toLowerCase(),
	source: `stories/${name}.mdx`,
	title: name,
	storybookId: `${group}-${name.toLowerCase()}`,
});

export const GUIDES: Page[] = [
	guide(
		"getting-started",
		"Getting started",
		"Install the package, load the styles, turn on dark mode, and the conventions every component shares.",
	),
	guide(
		"theming",
		"Theming",
		"Design tokens, dark mode, `ThemeProvider`, `useTheme()`, `ThemeToggle` and `cn()`.",
	),
];

// Not for apps using the package: the docs index, and how maintainers publish it.
export const EXCLUDED_DOCS = ["docs/README.md", "docs/releasing.md"];

// Same order as the component table in README.md. Every stories/*.mdx page must be listed.
export const COMPONENTS: Page[] = [
	component("Button"),
	component("Input"),
	component("Textarea"),
	component("Label"),
	component("Select"),
	component("Checkbox"),
	component("Switch"),
	component("RadioGroup"),
	component("Slider"),
	component("Form"),
	component("Badge"),
	component("Card"),
	component("Table"),
	component("Progress"),
	component("Skeleton"),
	component("Tooltip"),
	component("HintTip"),
	component("Popover"),
	component("DropdownMenu"),
	component("Dialog"),
	component("AlertDialog"),
	component("Drawer"),
	component("Toast"),
	component("Tabs"),
	component("Resizable"),
	component("Chat", "patterns"),
];

const TITLE = `# @falkordb/ui

> FalkorDB's React component library: accessible, themeable components built on Radix UI and Tailwind CSS v4, in the shadcn/ui style. FalkorDB products share it so they look and behave the same.`;

const ABOUT_INDEX = `This index is for AI coding agents. It ships in the npm package as \`node_modules/@falkordb/ui/dist/llms.txt\` and is online at ${STORYBOOK_URL}llms.txt. Links are relative to this file. \`llms-full.txt\`, next to it, holds every page below in one file.`;

const ABOUT_FULL = `This is the complete reference for AI coding agents, in one file. It ships in the npm package as \`node_modules/@falkordb/ui/dist/llms-full.txt\` and is online at ${STORYBOOK_URL}llms-full.txt. \`llms.txt\`, next to it, is a short index with one Markdown file per page.`;

const RULES = `## Rules for using this package

- Install with \`npm install @falkordb/ui\`. React 18.3+ or 19 is a peer dependency.
- Import components, hooks and helpers from the package root, for example \`import { Button } from "@falkordb/ui"\`. Deep imports such as \`@falkordb/ui/dist/...\` are not supported.
- Import the styles once, at the app's entry point: \`import "@falkordb/ui/styles.css";\`. No Tailwind setup is needed. It holds only the utility classes the components use, so Tailwind classes you add yourself may not exist. To write your own Tailwind classes, set up Tailwind v4 and import \`@falkordb/ui/theme.css\` instead; see Getting started.
- Build multi-part components from their exported parts, as each page's Usage section shows, for example \`Dialog\` with \`DialogTrigger\` and \`DialogContent\`.
- Some components need one provider near the app root: \`TooltipProvider\` for \`Tooltip\`, and \`Toaster\` for \`toast()\`. Each component's page says so.
- Style a component that renders a DOM element with \`className\`. It is merged with \`cn()\`, so your Tailwind classes override the defaults. Root and provider components such as \`Dialog\`, \`TooltipProvider\` and \`ThemeProvider\` render no element and take no \`className\`; style their parts instead. Rebrand with the theme's CSS custom properties instead of copying components.
- Dark mode follows a \`dark\` class on an ancestor. \`ThemeProvider\` can manage it; \`ThemeToggle\` and \`useTheme()\` must render inside it.
- The package exports no icons. Examples use [lucide-react](https://lucide.dev); add it to your own dependencies (\`npm install lucide-react\`) rather than relying on the copy installed with this package.
- Give icon-only buttons an \`aria-label\`; a tooltip does not name a button.
- FalkorDB products draw no focus outline. This is deliberate, so do not add focus rings.`;

const RELATED = `## Related packages

- [@falkordb/canvas](${REPO_URL}/blob/main/web-components/canvas/README.md): \`<falkordb-canvas>\`, a force-directed graph web component for any framework, or none. Its README ships in its own npm package.`;

const FENCE = /^\s*(```|~~~)/;
// Storybook blocks that render live examples; the Usage sections already show the code.
const STORYBOOK_BLOCK = /^<(Meta|Canvas)\b[^>]*\/>\s*$/;
// An MDX import can span lines; it ends at its module specifier, with or without a semicolon.
const IMPORT_START = /^import\b/;
const IMPORT_END = /(^import|\bfrom)\s*["'][^"']+["']\s*;?\s*$/;
// Code spans and Markdown autolinks such as <https://example.com> or <team@example.com>.
const SAFE_INLINE = /(`+)[\s\S]*?\1|<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*>|<[^\s<>@]+@[^\s<>]+>/g;
// Exports, MDX expressions, and JSX or HTML tags and fragments, once SAFE_INLINE is removed.
const UNSUPPORTED = /^\s*export\s|\{|<\/?[A-Za-z>]/;

/** Splits Markdown into lines, flagging those inside fenced code blocks. */
function scan(markdown: string): { line: string; code: boolean }[] {
	let inFence = false;
	return markdown.split("\n").map((line) => {
		if (FENCE.test(line)) {
			inFence = !inFence;
			return { line, code: true };
		}
		return { line, code: inFence };
	});
}

/** Turns an MDX page into plain Markdown, failing on any MDX syntax it does not know how to drop. */
export function stripMdx(mdx: string, source: string): string {
	const kept: string[] = [];
	let inImport = false;
	for (const { line, code } of scan(mdx)) {
		if (code) {
			kept.push(line);
			continue;
		}
		if (inImport || IMPORT_START.test(line)) {
			inImport = !IMPORT_END.test(line);
			continue;
		}
		if (STORYBOOK_BLOCK.test(line)) continue;
		if (UNSUPPORTED.test(line.replace(SAFE_INLINE, ""))) {
			throw new Error(
				`${source}: unsupported MDX: "${line.trim()}". Use plain Markdown, or teach scripts/build-llms.ts to drop it.`,
			);
		}
		kept.push(line);
	}
	if (inImport) throw new Error(`${source}: an import never reaches its module specifier.`);
	return tidy(kept.join("\n"));
}

function tidy(markdown: string): string {
	return `${markdown.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** The first paragraph after the page's title. */
export function firstParagraph(markdown: string): string {
	const body = markdown.replace(/^#[^\n]*\n/, "").trim();
	return (body.split(/\n\s*\n/)[0] ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Rewrites links so they resolve outside Storybook and the repository: links to another page
 * point at its generated Markdown (`page`) or its section of llms-full.txt (`full`), whether
 * written as a Storybook or a relative link; other relative links point at GitHub, and other
 * Storybook links at the live site.
 */
export function rewriteLinks(markdown: string, page: Page, pages: Page[], target: "page" | "full"): string {
	const bySource = new Map(pages.map((other) => [other.source, other]));
	const byStorybookId = new Map(
		pages.flatMap((other) => (other.storybookId ? [[other.storybookId, other] as const] : [])),
	);
	const linkTo = (other: Page, hash: string) =>
		target === "full" ? hash || `#${other.slug}` : `./${other.slug}.md${hash}`;

	return scan(markdown)
		.map(({ line, code }) =>
			code
				? line
				: line.replace(/\]\(([^)\s]+)\)/g, (match, href: string) => {
						const query = href.startsWith(STORYBOOK_URL) ? href.slice(STORYBOOK_URL.length) : href;
						const storybook = /^\?path=\/docs\/([\w-]+)--docs(#.*)?$/.exec(query);
						if (storybook) {
							const other = byStorybookId.get(storybook[1] ?? "");
							return `](${other ? linkTo(other, storybook[2] ?? "") : `${STORYBOOK_URL}${query}`})`;
						}
						if (/^([a-z]+:|#)/i.test(href)) return match;

						const hashAt = href.indexOf("#");
						const path = hashAt === -1 ? href : href.slice(0, hashAt);
						const hash = hashAt === -1 ? "" : href.slice(hashAt);
						const resolved = posix.normalize(posix.join(posix.dirname(page.source), path));
						const other = bySource.get(resolved);
						return `](${other ? linkTo(other, hash) : `${REPO_URL}/blob/main/${resolved}${hash}`})`;
					}),
		)
		.join("\n");
}

/** Moves every heading one level down, so each page's title becomes a section. */
function demoteHeadings(markdown: string): string {
	return scan(markdown)
		.map(({ line, code }) => (!code && /^#{1,5}\s/.test(line) ? `#${line}` : line))
		.join("\n");
}

/** Fails when a page in `dir` is in neither `pages` nor EXCLUDED_DOCS, so none is left out by accident. */
function requireListed(rootDir: string, dir: string, extension: string, pages: Page[], listName: string) {
	const listed = new Set([...pages.map((page) => page.source), ...EXCLUDED_DOCS]);
	const unlisted = readdirSync(join(rootDir, dir), { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(extension))
		.map((file) => `${dir}/${file.split(sep).join("/")}`)
		.filter((source) => !listed.has(source));
	if (unlisted.length > 0) {
		throw new Error(`Add ${unlisted.join(", ")} to ${listName} in scripts/build-llms.ts.`);
	}
}

/** Generated files keyed by their path relative to the output directory. */
export function buildLlms(rootDir: string): Record<string, string> {
	// Recursive, like the stories glob in .storybook/main.ts.
	requireListed(rootDir, "stories", ".mdx", COMPONENTS, "COMPONENTS");
	requireListed(rootDir, "docs", ".md", GUIDES, "GUIDES or EXCLUDED_DOCS");

	const pages = [...GUIDES, ...COMPONENTS];
	const markdown = new Map(
		pages.map((page) => {
			const raw = readFileSync(join(rootDir, page.source), "utf8");
			return [page.slug, page.source.endsWith(".mdx") ? stripMdx(raw, page.source) : tidy(raw)];
		}),
	);
	const md = (page: Page) => markdown.get(page.slug) ?? "";
	const list = (items: Page[]) =>
		items
			.map(
				(page) => `- [${page.title}](llms/${page.slug}.md): ${page.description ?? firstParagraph(md(page))}`,
			)
			.join("\n");

	const index = [
		TITLE,
		ABOUT_INDEX,
		RULES,
		`## Guides\n\n${list(GUIDES)}`,
		`## Components\n\n${list(COMPONENTS)}`,
		RELATED,
	];
	const full = [
		TITLE,
		ABOUT_FULL,
		RULES,
		...pages.map((page) => demoteHeadings(rewriteLinks(md(page), page, pages, "full")).trim()),
		RELATED,
	];

	const files: Record<string, string> = {
		"llms.txt": `${index.join("\n\n")}\n`,
		"llms-full.txt": `${full.join("\n\n")}\n`,
	};
	for (const page of pages) {
		files[`llms/${page.slug}.md`] = tidy(rewriteLinks(md(page), page, pages, "page"));
	}
	return files;
}

export function writeLlms(rootDir: string, outDir: string): string[] {
	const files = buildLlms(rootDir);
	for (const [path, contents] of Object.entries(files)) {
		const file = join(outDir, path);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, contents);
	}
	return Object.keys(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const outDir = process.argv[2];
	if (!outDir) {
		process.stderr.write("Usage: node --experimental-strip-types scripts/build-llms.ts <outDir>\n");
		process.exit(1);
	}
	const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const written = writeLlms(rootDir, resolve(outDir));
	process.stdout.write(`Wrote ${written.length} files for AI agents to ${outDir}\n`);
}
