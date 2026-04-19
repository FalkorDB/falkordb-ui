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

const ROOT_ID = "fdb-widget-root";

function warnMissingApi(): void {
  // eslint-disable-next-line no-console
  console.warn(
    "[@falkordb/graphrag-widget] No `api` URL provided; widget will render but every request will fail. " +
      "Set the `api` option (or data-api on the script tag).",
  );
}

function createRoot(): HTMLElement {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    // Re-use (and reset) an existing root instead of creating duplicate IDs
    render(null, existing);
    return existing;
  }
  const root = document.createElement("div");
  root.id = ROOT_ID;
  document.body.appendChild(root);
  return root;
}

/**
 * Mount the FalkorDB GraphRAG widget programmatically.
 *
 * @example
 * import { mount } from '@falkordb/graphrag-widget';
 * mount({ api: 'https://your-backend.com', graph: 'my-graph' });
 */
export function mount(options: WidgetConfig): () => void {
  if (!options.api) warnMissingApi();
  const config = {
    api: options.api,
    graph: options.graph ?? "falkordb-docs",
    title: options.title ?? "FalkorDB",
    accent: options.accent ?? "#22C55E",
    position: options.position ?? "bottom-right",
    suggestions: options.suggestions ?? true,
  };
  const root = createRoot();
  render(h(Widget, { config }), root);

  return () => {
    render(null, root);
    root.remove();
  };
}

// ── Auto-mount from <script> tag ──────────────────────────────────────────────
function getConfig() {
  const scripts = document.querySelectorAll<HTMLScriptElement>("script[data-api]");
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

function autoMount() {
  const config = getConfig();
  if (!config.api) warnMissingApi();
  const root = createRoot();
  render(h(Widget, { config }), root);
}

// Auto-mount when loaded via <script> tag (IIFE build). If the script is in
// <head>, document.body isn't there yet — wait for DOMContentLoaded in that case.
if (typeof document !== "undefined" && document.currentScript) {
  if (document.body) {
    autoMount();
  } else {
    document.addEventListener("DOMContentLoaded", autoMount, { once: true });
  }
}
