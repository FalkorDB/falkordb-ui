/** Typed API client — connects to GraphRAG-Server's public widget endpoints (read-only).
 *
 * Endpoints used:
 *   POST /api/widget/query?graph_id=...       — ask a question
 *   GET  /api/widget/suggestions?graph_id=... — starter questions
 *
 * These are unauthenticated, cookieless, CORS-protected routes scoped to
 * predefined graphs. The widget never hits the SPA's /api/query or
 * /api/suggestions routes.
 */

export interface SourceCitation {
  // Relative document path (e.g. "cypher/functions.md").
  name: string;
  // Public docs URL when the graph has `docs_base_url` configured, else null.
  url: string | null;
}

export interface ChatResponse {
  answer: string;
  has_context: boolean;
  query_id: string | null;
  // Short list of source documents the LLM cited for this answer. Each
  // entry has a name and optional URL. Older servers either won't return
  // this field (undefined) or return it as a list of plain strings —
  // both are tolerated by the parser in `sendMessage`.
  sources?: SourceCitation[];
}

export interface SupportRequest {
  name: string;
  email: string;
  message: string;
  history: Array<{ role: string; content: string }>;
}

export type ChatHistory = Array<{ role: string; content: string }>;

let _apiBase = "";
let _graphId = "";
let _token = "";

const SESSION_STORAGE_KEY = "fdb-widget-session";
const HISTORY_SEND_LIMIT = 10;
const SUPPORT_HISTORY_LIMIT = 20;
const SUPPORT_HISTORY_CONTENT_LIMIT = 1000;

/**
 * Generate a stable per-tab session id. Using sessionStorage means a refresh
 * keeps the same id (so we can correlate follow-up questions in analytics)
 * while a new tab/window starts a fresh session. We never send PII — the
 * backend hashes IP + User-Agent before storing.
 */
function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateUuid();
    sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage may be disabled (privacy mode). Fall back to an
    // ephemeral in-memory id; analytics still works for the current page
    // load, just won't survive a refresh.
    if (!_memorySessionId) _memorySessionId = generateUuid();
    return _memorySessionId;
  }
}

let _memorySessionId = "";

function generateUuid(): string {
  const c = (globalThis.crypto as Crypto | undefined);
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    // Fallback for older browsers — RFC 4122 v4 from getRandomValues.
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  const now = Date.now().toString(16).padStart(12, "0");
  const perf =
    typeof globalThis.performance?.now === "function"
      ? globalThis.performance.now().toString(16).replace(".", "")
      : "0";
  return `00000000-0000-4000-8000-${(now + perf).slice(-12).padStart(12, "0")}`;
}

export function configure(apiBase: string, graphId: string, token: string = ""): void {
  _apiBase = apiBase.replace(/\/$/, "");
  _graphId = graphId;
  _token = token;
}

/**
 * Build the query string. The token branch picks the user-graph path on
 * the server (graph_id is ignored when X-Widget-Token is present), but
 * we still include it as a hint for older servers / debugging — the
 * server-side dispatcher prefers the token.
 */
function qs(): string {
  return _graphId ? `?graph_id=${encodeURIComponent(_graphId)}` : "";
}

/**
 * Headers sent with every widget API call. The token header is the only
 * thing that flips the backend over to user-graph routing — when unset
 * the server falls back to the predefined-graph_id flow.
 */
function authHeaders(): Record<string, string> {
  return _token ? { "X-Widget-Token": _token } : {};
}

export interface WidgetServerConfig {
  graph: string;
  display_name?: string | null;
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  accent?: string | null;
  position?: "bottom-left" | "bottom-right" | null;
  show_suggestions?: boolean | null;
  starter_questions?: string[];
}

/**
 * Fetch the server-rendered visual config for the resolved graph.
 *
 * Times out after 5s so a hung server doesn't strand the embedder on
 * the default-shell render forever. Either credential (token via
 * authHeaders, or graph_id via qs) routes the request; callers don't
 * need to pre-check which path applies.
 *
 * Returns null on any error — the caller falls back to client-side
 * DEFAULTS, so a transient /config outage means an unbranded shell
 * rather than a broken widget.
 */
export async function fetchWidgetConfig(): Promise<WidgetServerConfig | null> {
  if (!_apiBase) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`${_apiBase}/api/widget/config${qs()}`, {
      credentials: "omit",
      headers: authHeaders(),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as WidgetServerConfig;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface Suggestion {
  title: string;
  question: string;
  category: string;
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  try {
    const r = await fetch(`${_apiBase}/api/widget/suggestions${qs()}`, {
      credentials: "omit",
      headers: authHeaders(),
    });
    if (!r.ok) return [];
    const data = await r.json();
    // Response shape: { domain_summary, suggestions: [{ title, question, category }] }
    return (data.suggestions ?? []).map((s: Partial<Suggestion>) => ({
      title: s.title ?? s.question ?? "",
      question: s.question ?? "",
      category: s.category ?? "overview",
    }));
  } catch {
    return [];
  }
}

export async function sendMessage(question: string, history: ChatHistory): Promise<ChatResponse> {
  const historyForRequest = history.slice(-HISTORY_SEND_LIMIT);

  const r = await fetch(`${_apiBase}/api/widget/query${qs()}`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      question,
      return_context: false,
      history: historyForRequest,
      session_id: getSessionId(),
    }),
  });
  if (!r.ok) throw new Error(`Query API error: ${r.status}`);
  const data = await r.json();

  const answer = data.answer ?? "";
  const query_id: string | null =
    typeof data.query_id === "string" && data.query_id.length > 0 ? data.query_id : null;
  // Trust the backend's has_context signal. Only fall back to the
  // "answer-is-non-empty" heuristic when the field is missing entirely
  // (e.g. older server). A truthy answer does NOT imply grounding —
  // the LLM may have returned an off-topic general-knowledge reply.
  const has_context =
    typeof data.has_context === "boolean" ? data.has_context : !!answer && answer.length > 0;

  const cleanedAnswer = stripCitations(answer);

  // Tolerate three server shapes:
  //   undefined         → older server, no sources field
  //   string[]          → older server (PR #78 contract), names only
  //   {name, url?}[]    → current server, names + optional URLs
  // Anything else (malformed entries) is dropped silently rather than
  // crashing the chat panel.
  const sources: SourceCitation[] | undefined = Array.isArray(data.sources)
    ? data.sources.flatMap((s: unknown): SourceCitation[] => {
        if (typeof s === "string" && s.trim().length > 0) {
          return [{ name: s, url: null }];
        }
        if (s && typeof s === "object" && typeof (s as { name?: unknown }).name === "string") {
          const obj = s as { name: string; url?: unknown };
          const name = obj.name.trim();
          if (!name) return [];
          const url = typeof obj.url === "string" ? sanitizeHttpUrl(obj.url) : null;
          return [{ name, url }];
        }
        return [];
      })
    : undefined;

  return { answer: cleanedAnswer, has_context, query_id, sources };
}

export type FeedbackValue = "like" | "dislike";

/**
 * Send like/dislike for a previously answered query. Best-effort: the
 * server records it as a property on the (session)-[:ASKED]->(query) edge.
 * Never throws — feedback is non-essential UX.
 */
export async function submitFeedback(query_id: string, value: FeedbackValue): Promise<boolean> {
  try {
    const r = await fetch(`${_apiBase}/api/widget/feedback${qs()}`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        session_id: getSessionId(),
        query_id,
        value,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Return *raw* if it parses as an http(s) URL, else null. The widget renders
 * source entries as `<a href>` in the embedding page, so an attacker-controlled
 * `javascript:` / `data:` / `vbscript:` URL would execute on click. We refuse
 * anything that isn't http(s) at parse time so a malicious URL never reaches
 * the message state.
 */
function sanitizeHttpUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw, _apiBase || window.location.href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Strip inline [N] citation markers and any trailing SOURCES: line from an
 * answer. The GraphRAG-Server backend emits answers with numeric citation markers
 * like "[2, 25]" that reference a sources panel. This widget does not render
 * a sources panel, so the raw markers would just look like noise to the user.
 */
function stripCitations(answer: string): string {
  return answer
    // Drop bracketed citation groups like [2] or [2, 25] — digits/commas/spaces only
    .replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, "")
    // Remove a trailing SOURCES: ... line the backend sometimes appends
    .replace(/\n?\s*SOURCES:\s*.+$/i, "")
    // Collapse the double-spaces left where "word [3] ." became "word  ."
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

export async function submitSupport(req: SupportRequest): Promise<boolean> {
  try {
    const history = req.history.slice(-SUPPORT_HISTORY_LIMIT).map((m) => ({
      role: m.role,
      content: m.content.slice(0, SUPPORT_HISTORY_CONTENT_LIMIT),
    }));
    const r = await fetch(`${_apiBase}/api/widget/support${qs()}`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: req.name,
        email: req.email,
        message: req.message,
        history,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
