import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8")) as {
	version: string;
};

// Two builds share this config:
// - default: an ES module exporting `mount()` for bundlers (the browser app).
// - `--mode iife`: the self-mounting `<script>` bundle GraphRAG-Server serves
//   at /scripts/widget-chat.js. The filename stays stable so embedders can pin it.
// Preact and markdown-it are bundled in both: the widget renders in its own
// shadow root and must not share a runtime with the host page.
export default defineConfig(({ mode }) => {
	const iife = mode === "iife";
	return {
		plugins: [preact()],
		build: {
			lib: {
				entry: "src/index.tsx",
				name: "FalkorDBChatWidget",
				formats: [iife ? "iife" : "es"],
				fileName: () => (iife ? "widget-chat.js" : "support-widget.js"),
			},
			rollupOptions: { external: [] },
			outDir: "dist",
			// The second (iife) pass must not wipe the ES build.
			emptyOutDir: !iife,
			sourcemap: true,
		},
		define: {
			"process.env.NODE_ENV": JSON.stringify("production"),
			__WIDGET_VERSION__: JSON.stringify(pkg.version),
		},
	};
});
