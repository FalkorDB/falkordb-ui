# `@falkordb/support-widget`

A floating FalkorDB support chat. A GraphRAG-Server graph answers the questions, and a Contact Support form hands the conversation to the support team. The widget renders in its own shadow root and bundles Preact, so it doesn't depend on the host page's framework or styles.

The source was ported from `GraphRAG-Server/widget`. The package builds two files:

| File | Use |
| --- | --- |
| `dist/support-widget.js` | ES module exporting `mount(options)` for bundlers |
| `dist/widget-chat.js` | Self-mounting IIFE for a `<script>` tag. This is the bundle GraphRAG-Server serves at `/scripts/widget-chat.js`. |

## From a bundler

```bash
npm install @falkordb/support-widget
```

```ts
import { mount } from '@falkordb/support-widget'

const unmount = mount({
  api: 'https://your-graphrag-server.example.com',
  graph: 'falkordb-docs',
})
```

The embedding origin must be on the server's allowlists. See [Backend requirements](#backend-requirements).

## From a `<script>` tag

When GraphRAG-Server serves the bundle, the API origin is taken from the script's `src`. There are two embedding flavors. Both produce the same UI; only the auth model differs.

## Flavor 1 — Predefined graph (anonymous, by `?graph=`)

Suited to org-curated content (e.g. the public docs chatbot). The graph id is
public; access is gated by the embedding site's `Origin` matching the graph's
per-graph `allowed_origins` list.

```html
<script
  src="https://your-graphrag-server.example.com/scripts/widget-chat.js?graph=docs"
  defer
></script>
```

| Query param | Default | Description |
| --- | --- | --- |
| `graph` | `falkordb-docs` | Public predefined graph id. The org-graph `:Graph` node (or `PREDEFINED_GRAPHS` env fallback) must exist. |
| `title` | `FalkorDB` | Header title shown in the widget panel. |
| `accent` | `#7466FF` | Primary accent color. URL-encode `#` as `%23`. |
| `position` | `bottom-right` | `bottom-right` or `bottom-left`. |
| `suggestions` | `true` | Set `suggestions=false` to hide starter questions. |

The script also fetches `GET /api/widget/config` after mount and merges any
server-side branding (title, accent, position, suggestions toggle, plus
`icon` and `description`) on top of these script-tag defaults. Script-tag
values always win — they're what the embedder copy-pasted. The widget
renders `icon` (URL or short emoji/text, shown in the panel header) and
`description` (a one-line subtitle under the title). `starter_questions`
is also returned by the endpoint and edited in the SPA's Widget appearance section, but
the widget bundle does not render it yet — that's reserved for a follow-up.

## Flavor 2 — User-owned graph (bearer token, by `data-graph-token`)

Suited to graphs each end-user created via the "My Graphs" UI. The widget is
authenticated by a per-graph public token (`wgt_pk_…`) issued at create or
rotate. The token authorizes the request; the graph's `allowed_origins` list
still gates which sites can use it.

```html
<!-- For SRI, add: integrity="sha384-<published-hash>" crossorigin="anonymous" -->
<script
  src="https://your-graphrag-server.example.com/scripts/widget-chat.js"
  data-graph-token="wgt_pk_…"
  data-title="Ask Acme">
</script>
```

**The token is a credential.** It MUST come from `data-graph-token` — never
from a `?token=` query string. URL query strings land in HTTP access logs,
CDN cache keys, and `Referer` headers, all of which leak the credential. The
backend deliberately ignores `?token=`; only `data-graph-token` is honored.

## Backend requirements

- `WIDGET_ALLOWED_ORIGINS` (global gate) must allow the embedding site
  origin to even preflight `/api/widget/*`. `*` in this env value is a
  wildcard (matches any origin).
- For predefined graphs: the `:Graph` node's `allowed_origins` (or the
  `PREDEFINED_GRAPHS` env entry's `allowed_origins`) must include the
  embedder's origin, or contain `*` to allow any origin.
- For user-owned graphs: the graph's `widget_allowed_origins` must include
  the embedder's origin, or contain `*` to allow any origin. The backend
  refuses to publish a graph with empty origins.
- RAG/FalkorDB/LLM settings must be configured.
- `HUBSPOT_ACCESS_TOKEN` is required only for the Contact Support form.

Example local-test origin config:

```env
WIDGET_ALLOWED_ORIGINS=http://127.0.0.1:5500
PREDEFINED_GRAPHS=[{"id":"docs","graph_name":"<actual_graph_name>","allowed_origins":["http://127.0.0.1:5500"]}]
```

## Local embed testing

The `samples/` folder is gitignored so contributors can drop in their
own embed pages with deployment-specific URLs without committing them. To
test against a backend, create your own sample under `samples/`:

```bash
mkdir -p samples
cat > samples/sample.html <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>Widget embed test</title></head>
<body>
  <h1>Widget embed test</h1>
  <script
    src="https://your-graphrag-server.example.com/scripts/widget-chat.js?graph=docs"
    defer
  ></script>
</body></html>
HTML

cd samples
python3 -m http.server 5500
# open http://127.0.0.1:5500/sample.html
```

Do not open the HTML directly with `file://`; browser CORS behavior differs and
the backend intentionally rejects opaque origins. Whichever origin you serve
the sample from must be listed in `WIDGET_ALLOWED_ORIGINS` (and any per-graph
`allowed_origins`) on the backend.

## Local development

```bash
npm install                                  # once, at the repository root
npm run dev   -w web-components/support-widget
npm run build -w web-components/support-widget   # → dist/support-widget.js + dist/widget-chat.js
```

GraphRAG-Server's production image serves `dist/widget-chat.js`. FastAPI serves:

- `GET /scripts/widget-chat.js`
- `GET /scripts/widget-chat.js.map`

## Project layout

```
support-widget/
├── src/
│   ├── index.tsx       ← bootstrap: parse <script src>, mount FAB
│   ├── Chat.tsx        ← chat UI
│   ├── Widget.tsx      ← floating action button + panel
│   ├── api.ts          ← REST client for /api/widget/*
│   ├── styles.css
│   └── assets/
└── vite.config.ts
```

## Public widget API calls

The widget calls these public endpoints on the script origin:

- `POST /api/widget/query`
- `POST /api/widget/feedback`
- `GET  /api/widget/suggestions`
- `POST /api/widget/support`

The API base URL is derived automatically from `document.currentScript.src`, so
the normal script-tag embed does not require an `api`/`api-url` parameter.

## Programmatic mounting

The bundle also exposes `window.FalkorDBChat.mount(options)`.

```html
<script src="https://your-graphrag-server.example.com/scripts/widget-chat.js" defer></script>
<script>
  window.addEventListener("load", () => {
    window.FalkorDBChat.mount({
      graph: "docs",
      title: "Docs Assistant",
      accent: "#7466FF",
      position: "bottom-right",
      suggestions: true,
    });
  });
</script>
```

The widget is a single floating instance. Calling `mount()` again replaces the
existing mounted widget rather than creating a second one.
