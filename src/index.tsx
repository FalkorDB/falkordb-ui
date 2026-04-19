import { h, render } from "preact";
import { Widget } from "./Widget";

export interface WidgetConfig {
  api: string;
  graph?: string;
  title?: string;
  accent?: string;
  position?: "bottom-right" | "bottom-left";
  suggestions?: boolean;
}

/**
 * Mount the FalkorDB chat widget programmatically.
 *
 * @example
 * import { mount } from '@falkordb/chat-widget';
 * mount({ api: 'https://your-backend.com', graph: 'my-graph' });
 */
export function mount(options: WidgetConfig): () => void {
  const config = {
    api: options.api,
    graph: options.graph ?? "falkordb-docs",
    title: options.title ?? "FalkorDB",
    accent: options.accent ?? "#22C55E",
    position: options.position ?? "bottom-right",
    suggestions: options.suggestions ?? true,
  };
  const root = document.createElement("div");
  root.id = "fdb-widget-root";
  document.body.appendChild(root);
  render(h(Widget, { config }), root);

  // Return unmount function
  return () => {
    render(null, root);
    root.remove();
  };
}

// ── Auto-mount from <script> tag ──────────────────────────────────────────────
// Read config from the script tag's data-* attributes
function getConfig() {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[data-api]'
  );
  const script = scripts[scripts.length - 1];
  return {
    api: script?.dataset.api ?? "",
    graph: script?.dataset.graph ?? "falkordb-docs",
    title: script?.dataset.title ?? "FalkorDB",
    accent: script?.dataset.accent ?? "#22C55E",
    position: (script?.dataset.position ?? "bottom-right") as "bottom-right" | "bottom-left",
    suggestions: script?.dataset.suggestions !== "false",
  };
}

// Auto-mount when loaded via <script> tag (IIFE build)
if (typeof document !== "undefined" && document.currentScript) {
  const root = document.createElement("div");
  root.id = "fdb-widget-root";
  document.body.appendChild(root);
  render(h(Widget, { config: getConfig() }), root);
}
