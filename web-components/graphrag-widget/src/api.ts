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
  _apiBase = apiBase.replace(/\/$/, "");
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
    const r = await fetch(`${_apiBase}/api/widget/suggestions${qs()}`);
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

  _history.push({ role: "user", content: question });
  _history.push({ role: "assistant", content: answer });

  return { answer, has_context };
}

export async function submitSupport(req: Omit<SupportRequest, "graph_name">): Promise<boolean> {
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
