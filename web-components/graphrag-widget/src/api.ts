/** Typed API client — connects to GraphRAG-UI's public widget endpoints (read-only).
 *
 * Endpoints used:
 *   POST /api/widget/query?graph_id=...       — ask a question
 *   GET  /api/widget/suggestions?graph_id=... — starter questions
 *
 * These are unauthenticated, cookieless, CORS-protected routes scoped to
 * predefined graphs. The widget never hits the SPA's /api/query or
 * /api/suggestions routes.
 */

export interface ChatResponse {
  answer: string;
  has_context: boolean;
}

export interface SupportRequest {
  name: string;
  email: string;
  message: string;
  history: Array<{ role: string; content: string }>;
}

let _apiBase = "";
let _graphId = "";

export function configure(apiBase: string, graphId: string): void {
  const nextBase = apiBase.replace(/\/$/, "");
  // Reset conversation history when the backend or graph changes so we never
  // send stale context from a previous session / different graph.
  if (nextBase !== _apiBase || graphId !== _graphId) {
    _history = [];
  }
  _apiBase = nextBase;
  _graphId = graphId;
}

function qs(): string {
  return `?graph_id=${encodeURIComponent(_graphId)}`;
}

// Internal history for multi-turn conversations
let _history: Array<{ role: string; content: string }> = [];

export interface Suggestion {
  title: string;
  question: string;
  category: string;
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  try {
    const r = await fetch(`${_apiBase}/api/widget/suggestions${qs()}`, {
      credentials: "omit",
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

export async function sendMessage(question: string): Promise<ChatResponse> {
  const historyForRequest = _history.slice();

  const r = await fetch(`${_apiBase}/api/widget/query${qs()}`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      return_context: false,
      history: historyForRequest,
    }),
  });
  if (!r.ok) throw new Error(`Query API error: ${r.status}`);
  const data = await r.json();

  const answer = data.answer ?? "";
  const has_context =
    typeof data.has_context === "boolean" ? data.has_context : !!answer && answer.length > 0;

  const cleanedAnswer = stripCitations(answer);

  _history.push({ role: "user", content: question });
  _history.push({ role: "assistant", content: cleanedAnswer });

  return { answer: cleanedAnswer, has_context };
}

/**
 * Strip inline [N] citation markers and any trailing SOURCES: line from an
 * answer. The GraphRAG-UI backend emits answers with numeric citation markers
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
  // GraphRAG-UI doesn't expose a support endpoint; fall back to mailto.
  const subject = encodeURIComponent("Support Request — FalkorDB Widget");
  const body = encodeURIComponent(
    `Name: ${req.name}\nEmail: ${req.email}\n\nMessage:\n${req.message}\n\nChat History:\n${req.history.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
  );
  window.open(`mailto:support@falkordb.com?subject=${subject}&body=${body}`, "_blank");
  return true;
}

export function resetHistory(): void {
  _history = [];
}
