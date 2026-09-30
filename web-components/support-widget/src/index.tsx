import { h, render } from "preact";
import { Widget } from "./Widget";
import { configure as configureApi, fetchWidgetConfig } from "./api";
import styles from "./styles.css?inline";

export interface WidgetConfig {
  /** Base URL of the GraphRAG-Server backend serving /api/widget/*.
   *  Inferred from the hosting <script src> origin when omitted. */
  api?: string;
  graph?: string;
  /** Per-graph public widget token (`wgt_pk_…`). When set, the widget
   *  routes through the user-graph backend path; the server resolves
   *  the graph from the token's hash and ignores the `graph` field. */
  token?: string;
  title?: string;
  accent?: string;
  position?: "bottom-right" | "bottom-left";
  suggestions?: boolean;
}

interface ResolvedConfig {
  api: string;
  graph: string;
  token: string;
  title: string;
  accent: string;
  position: "bottom-right" | "bottom-left";
  suggestions: boolean;
  // Owner-supplied logo for the header (URL → <img>, short string →
  // text/emoji). Empty string = use the built-in FalkorDB logo for
  // the docs widget OR no logo for user-graphs. Server-provided via
  // /api/widget/config; not honored from the script tag (would be
  // a cross-site image-load concern on the embedding page).
  icon: string;
  // One-line description shown under the title in the panel header.
  // Server-provided (from Branding > Description on the SPA). Empty
  // = no subtitle line is rendered.
  description: string;
}

declare global {
  interface Window {
    FalkorDBChat?: {
      mount: (options?: WidgetConfig) => () => void;
      version: string;
    };
  }
}

const ROOT_ID = "fdb-widget-root";
const SHADOW_MOUNT_ID = "fdb-widget-shadow-mount";
const SHADOW_STYLE_ID = "fdb-widget-shadow-styles";
// Injected at build time by Vite from widget/package.json so this can't
// drift from the package manifest. See vite.config.ts.
const VERSION = __WIDGET_VERSION__;

const DEFAULTS: ResolvedConfig = {
  api: "",
  graph: "falkordb-docs",
  token: "",
  title: "FalkorDB",
  accent: "#7466FF",
  position: "bottom-right",
  suggestions: true,
  icon: "",
  description: "",
};

function getHostingScript(): HTMLScriptElement | null {
  // document.currentScript is set during initial parse; once we hand control
  // to async callbacks (e.g. DOMContentLoaded) it's null. We capture it
  // synchronously at module load and reuse.
  return _hostingScript;
}

const _hostingScript: HTMLScriptElement | null =
  typeof document !== "undefined" && document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null;

/** Parse config from the hosting <script>'s `data-*` attributes and `?…` query.
 *
 * The token MUST come from `data-graph-token` — never from the script URL.
 * A token in `?token=…` would land in HTTP access logs, CDN cache keys, and
 * `Referer` headers, all of which leak a credential we treat as a bearer
 * secret. Graph id (a public identifier) may come from either attribute or
 * query string.
 */
function readScriptParams(): Partial<WidgetConfig> & { api?: string } {
  const script = getHostingScript();
  if (!script) return {};

  let url: URL | null = null;
  if (script.src) {
    try {
      url = new URL(script.src, window.location.href);
    } catch {
      url = null;
    }
  }
  const q = url?.searchParams;

  const out: Partial<WidgetConfig> = {};
  if (url) {
    // Same origin as where the script came from — that's where the API lives.
    out.api = url.origin;
  }

  // Token: data attribute ONLY. ?token= is deliberately not honored
  // (would leak via Referer / access logs).
  const dataToken = script.dataset.graphToken;
  if (dataToken) out.token = dataToken;

  // Graph id (predefined-graph fallback path)
  const dataGraph = script.dataset.graph;
  if (dataGraph) out.graph = dataGraph;
  else if (q) {
    const graph = q.get("graph");
    if (graph) out.graph = graph;
  }

  // Cosmetic options — all data-* preferred, query string fallback.
  const title = script.dataset.title ?? q?.get("title");
  if (title) out.title = title;
  const accent = script.dataset.accent ?? q?.get("accent");
  if (accent) out.accent = accent;
  const position = script.dataset.position ?? q?.get("position");
  if (position === "bottom-left" || position === "bottom-right") {
    out.position = position;
  }
  const suggestions = script.dataset.suggestions ?? q?.get("suggestions");
  if (suggestions === "false") out.suggestions = false;
  return out;
}

function resolveConfig(overrides?: WidgetConfig): ResolvedConfig {
  const fromScript = readScriptParams();
  return {
    api: overrides?.api ?? fromScript.api ?? DEFAULTS.api,
    graph: overrides?.graph ?? fromScript.graph ?? DEFAULTS.graph,
    token: overrides?.token ?? fromScript.token ?? DEFAULTS.token,
    title: overrides?.title ?? fromScript.title ?? DEFAULTS.title,
    accent: overrides?.accent ?? fromScript.accent ?? DEFAULTS.accent,
    position: overrides?.position ?? fromScript.position ?? DEFAULTS.position,
    suggestions:
      overrides?.suggestions ?? fromScript.suggestions ?? DEFAULTS.suggestions,
    // icon + description aren't honored from the script tag (server-
    // provided via /api/widget/config) but seed the resolved shape with
    // the defaults so the initial render before the fetch lands gets a
    // stable string, not undefined.
    icon: DEFAULTS.icon,
    description: DEFAULTS.description,
  };
}

function createRoot(): { host: HTMLElement; mountPoint: HTMLElement } {
  let host = document.getElementById(ROOT_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = ROOT_ID;
    document.body.appendChild(host);
  } else {
    render(null, host);
    host.replaceChildren();
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  let style = shadow.getElementById(SHADOW_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = SHADOW_STYLE_ID;
    shadow.appendChild(style);
  }
  style.textContent = styles;

  let mountPoint = shadow.getElementById(SHADOW_MOUNT_ID) as HTMLElement | null;
  if (!mountPoint) {
    mountPoint = document.createElement("div");
    mountPoint.id = SHADOW_MOUNT_ID;
    shadow.appendChild(mountPoint);
  } else {
    render(null, mountPoint);
  }

  return { host, mountPoint };
}

/**
 * Mount the FalkorDB GraphRAG widget programmatically.
 *
 * Most embedders just drop a <script> tag and rely on auto-mount. Use this
 * when you need to pass options dynamically or remount the single floating
 * widget with a new configuration.
 *
 * @example
 *   window.FalkorDBChat.mount({ graph: "blog" });
 */
export function mount(options?: WidgetConfig): () => void {
  // Read the script-tag params separately so we know which fields the
  // embedder set explicitly (vs. fields that came from DEFAULTS). The
  // server-config merge below uses this to honor the documented
  // contract that script-tag and mount() values always win over
  // server config — previously the merge couldn't tell explicit-from-
  // script apart from DEFAULTS and silently let server values override
  // an embedder's `data-title` / `data-accent` / etc.
  const fromScript = readScriptParams();
  const config = resolveConfig(options);
  if (!config.api) {
    // eslint-disable-next-line no-console
    console.warn(
      "[FalkorDBChat] Could not infer API origin from <script src> and no `api` option was passed; " +
        "falling back to same-origin requests.",
    );
  }
  const { host, mountPoint } = createRoot();
  // Render with the script-tag config first so the embedder sees the
  // floating button immediately (no flash-of-unstyled). Then hydrate
  // with server-config (title/accent/position/icon/suggestions) if the
  // /config endpoint succeeds. Script-tag values are the final word —
  // an embedder who sets data-accent in HTML always wins over server.
  render(h(Widget, { config }), mountPoint);

  let cancelled = false;
  configureApi(config.api, config.graph, config.token);
  fetchWidgetConfig().then((server) => {
    if (cancelled || !server) return;
    // Validate server-supplied enum / regex fields before adopting them —
    // a misconfigured :Graph node (or, more realistically, a future
    // server bug that returns an unexpected shape) shouldn't be able to
    // pass arbitrary CSS values through to the widget renderer.
    const safePosition: "bottom-left" | "bottom-right" | null =
      server.position === "bottom-left" || server.position === "bottom-right"
        ? server.position
        : null;
    const safeAccent: string | null =
      typeof server.accent === "string" && /^#[0-9A-Fa-f]{6}$/.test(server.accent)
        ? server.accent
        : null;
    // Precedence per field: explicit mount() option > explicit script-
    // tag value > server config > DEFAULTS. ``config`` already encodes
    // (mount > script > DEFAULTS); the merge below only lets server
    // fill in fields where BOTH ``fromScript`` and ``options`` are
    // undefined — i.e. only fields the embedder didn't explicitly set.
    const explicitTitle = options?.title ?? fromScript.title;
    const explicitAccent = options?.accent ?? fromScript.accent;
    const explicitPosition = options?.position ?? fromScript.position;
    const explicitSuggestions =
      options?.suggestions ?? fromScript.suggestions;
    const serverTitle = server.title ?? server.display_name;
    const merged: ResolvedConfig = {
      ...config,
      title:
        explicitTitle !== undefined
          ? config.title
          : typeof serverTitle === "string"
            ? serverTitle
            : config.title,
      accent:
        explicitAccent !== undefined
          ? config.accent
          : safeAccent ?? config.accent,
      position:
        explicitPosition !== undefined
          ? config.position
          : safePosition ?? config.position,
      suggestions:
        explicitSuggestions !== undefined
          ? config.suggestions
          : typeof server.show_suggestions === "boolean"
            ? server.show_suggestions
            : config.suggestions,
      // icon + description aren't settable via the script tag or
      // mount() — server is the only non-default source — so adopt
      // the server value whenever it's a string.
      icon: typeof server.icon === "string" ? server.icon : config.icon,
      description:
        typeof server.description === "string"
          ? server.description
          : config.description,
    };
    render(h(Widget, { config: merged }), mountPoint);
  });

  return () => {
    cancelled = true;
    render(null, mountPoint);
    host.remove();
  };
}

if (typeof window !== "undefined") {
  window.FalkorDBChat = { mount, version: VERSION };
}

// ── Auto-mount when loaded via <script src=".../widget-chat.js?graph=..."> ────
function autoMount(): void {
  mount();
}

if (__WIDGET_AUTOMOUNT__ && typeof document !== "undefined" && _hostingScript) {
  if (document.body) {
    autoMount();
  } else {
    document.addEventListener("DOMContentLoaded", autoMount, { once: true });
  }
}
