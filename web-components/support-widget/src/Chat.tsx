import MarkdownIt from "markdown-it";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { fetchSuggestions, sendMessage, submitFeedback, ChatResponse, FeedbackValue, SourceCitation, Suggestion } from "./api";
import logoSvg from "./assets/logo-light.svg?raw";
import { conversationStorageKeys, safeGetItem, safeRemoveItem, safeSetItem } from "./persistence";

interface Message {
  role: "user" | "assistant";
  content: string;
  hasContext?: boolean;
  userQuestion?: string;
  queryId?: string | null;
  feedback?: FeedbackValue;
  sources?: SourceCitation[];
}

interface Props {
  onSupportClick: (lastQuestion?: string) => void;
  history: Array<{ role: string; content: string }>;
  onHistoryUpdate: (history: Array<{ role: string; content: string }>) => void;
  showSuggestions?: boolean;
  // Used to scope sessionStorage so two widgets in the same tab
  // (e.g. preview vs prod, or two user-owned graphs with different
  // tokens) don't share a conversation. Both fields participate in
  // the storage key.
  graph: string;
  token: string;
}

// Last-resort fallback shown only when the backend returns an empty
// answer (network blip, timeout, etc). The grounded vs ungrounded
// case is handled by the server-side persona (in-corpus answer with
// [N] citations, out-of-corpus "this isn't covered" fallback, or
// chitchat identity redirect). The "FalkorDB" version below is the
// docs-widget framing; user-graphs get a generic version so the
// network-error path doesn't suddenly out the host platform.
const OUT_OF_SCOPE_MESSAGE_DOCS =
  "Hey, I'm the FalkorDB assistant, ask me anything about the FalkorDB docs only. For other questions, please contact support using the button below.";
const OUT_OF_SCOPE_MESSAGE_USER_GRAPH =
  "Sorry, I couldn't process that. Please try again in a moment.";

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: false,
  typographer: true,
});

const defaultLinkOpenRenderer =
  markdown.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const targetIndex = token.attrIndex("target");
  if (targetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else if (token.attrs) {
    token.attrs[targetIndex][1] = "_blank";
  }

  const relIndex = token.attrIndex("rel");
  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else if (token.attrs) {
    token.attrs[relIndex][1] = "noopener noreferrer";
  }

  return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};

function MarkdownMessage({ content }: { content: string }) {
  const html = useMemo(() => markdown.render(content), [content]);

  return (
    <div
      class="fdb-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function Chat({ onSupportClick, history, onHistoryUpdate, showSuggestions = true, graph, token }: Props) {
  // ``token`` truthy → widget is running against a user-owned graph
  // (X-Widget-Token routed). User-graphs get generic UI strings so
  // a customer-embedded widget doesn't lean on FalkorDB branding by
  // default; predefined-graph mode (no token) keeps the FalkorDB
  // strings that the docs widget has shipped with.
  const isUserGraph = !!token;
  const fallbackErrorMessage = isUserGraph
    ? OUT_OF_SCOPE_MESSAGE_USER_GRAPH
    : OUT_OF_SCOPE_MESSAGE_DOCS;
  // Input placeholder. Docs widget keeps the FalkorDB-specific copy.
  // User-graphs get a generic prompt — we explicitly avoid templating
  // the graph's name in (e.g. "Chat with Messi") because that
  // sometimes reads as chat-with-a-person rather than a
  // search-the-knowledge-base interaction. Generic copy also keeps
  // the placeholder stable across deploys when the owner renames
  // the graph.
  const inputPlaceholder = isUserGraph
    ? "Ask anything on your data"
    : "Chat with the FalkorDB Docs";
  // Lazy initial: restore previously-rendered messages from sessionStorage
  // so toggling to Support and back, or navigating across docs pages,
  // keeps the message list intact. Widget owns the reload-detection +
  // X-close clear (see persistence.ts), so by the time Chat mounts the
  // storage is either valid restore-state or already wiped.
  const [messages, setMessages] = useState<Message[]>(() => {
    const raw = safeGetItem(conversationStorageKeys(graph, token).messages);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSuggestions) return;
    fetchSuggestions().then(setSuggestions);
  }, [showSuggestions]);

  // Persist messages on every change so the next mount (view switch /
  // page nav) can restore. We remove the key when the list goes empty
  // to avoid a stale empty payload sitting in storage.
  useEffect(() => {
    const key = conversationStorageKeys(graph, token).messages;
    if (messages.length === 0) {
      safeRemoveItem(key);
    } else {
      safeSetItem(key, JSON.stringify(messages));
    }
  }, [messages, graph, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setSuggestions([]); // hide chips after first message

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: ChatResponse = await sendMessage(question, history);
      const content = res.answer || fallbackErrorMessage;
      const assistantMsg: Message = {
        role: "assistant",
        content,
        hasContext: res.has_context,
        userQuestion: question,
        queryId: res.query_id,
        sources: res.has_context ? res.sources : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      const newHistory = [
        ...history,
        { role: "user", content: question },
        { role: "assistant", content },
      ];
      onHistoryUpdate(newHistory);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again.", hasContext: false, userQuestion: question },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleFeedback(messageIndex: number, value: FeedbackValue) {
    const msg = messages[messageIndex];
    if (!msg || msg.role !== "assistant" || !msg.queryId || msg.feedback) return;
    // Optimistic UI: lock in the choice immediately so the buttons can't
    // be clicked twice. The fire-and-forget POST is best-effort; if it
    // fails we still show the user's choice — analytics is non-essential.
    setMessages((prev) =>
      prev.map((m, i) => (i === messageIndex ? { ...m, feedback: value } : m)),
    );
    submitFeedback(msg.queryId, value);
  }

  const lastUserQuestion = messages.filter((m) => m.role === "user").slice(-1)[0]?.content;

  return (
    <div class="fdb-chat">
      <div class="fdb-chat__messages">
        {messages.length === 0 && (
          <div class="fdb-chat__welcome">
            {/* FalkorDB wordmark logo only on the docs widget. User-
                graphs get a name-only welcome — the owner's branding
                lives in the panel header (HeaderLogo); duplicating it
                in the welcome area was visually noisy and surfaced
                FalkorDB branding to embedders by default. */}
            {!isUserGraph && (
              <div class="fdb-chat__welcome-icon" dangerouslySetInnerHTML={{ __html: logoSvg }} />
            )}
            <p class="fdb-chat__welcome-title">How can I help?</p>
            <p class="fdb-chat__welcome-subtitle">I'm a Knowledge Graph Powered Assistant</p>
          </div>
        )}

        {suggestions.length > 0 && messages.length === 0 && (
          <div class="fdb-suggestions" role="list">
            <div class="fdb-suggestions__label">Suggested questions</div>
            {suggestions.map((s, i) => (
              <button key={i} class="fdb-suggestion-card" role="listitem"
                      onClick={() => handleSend(s.question)}
                      title={s.question}>
                {s.title}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} class={`fdb-bubble fdb-bubble--${msg.role}`}>
            {msg.role === "assistant" ? (
              <MarkdownMessage content={msg.content} />
            ) : (
              <p>{msg.content}</p>
            )}
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
              <div class="fdb-sources" aria-label="Sources used">
                <span class="fdb-sources__label">Sources:</span>
                <span class="fdb-sources__list">
                  {msg.sources.map((s, si) =>
                    s.url ? (
                      <a
                        key={si}
                        class="fdb-sources__item fdb-sources__item--link"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.name}
                      </a>
                    ) : (
                      <span key={si} class="fdb-sources__item">{s.name}</span>
                    ),
                  )}
                </span>
              </div>
            )}
            {/* Suppress the Contact Support fallback button when the
                widget is running against a user-graph (X-Widget-Token
                routed). User-graphs have no support team behind them,
                and the per-graph persona handles the "not covered"
                framing without offering an escalation. Predefined
                graphs (no token, falls back to graph_id) keep the
                button — the docs widget escalates to FalkorDB support. */}
            {msg.role === "assistant" && msg.hasContext === false && !token && (
              <button
                class="fdb-btn fdb-btn--inline"
                onClick={() => onSupportClick(msg.userQuestion ?? lastUserQuestion)}
              >
                Contact Support
              </button>
            )}
            {msg.role === "assistant" && msg.hasContext !== false && msg.queryId && (
              <div class="fdb-feedback" role="group" aria-label="Was this answer helpful?">
                <button
                  type="button"
                  class={`fdb-feedback__btn${msg.feedback === "like" ? " fdb-feedback__btn--active" : ""}`}
                  aria-label="Helpful"
                  aria-pressed={msg.feedback === "like"}
                  disabled={!!msg.feedback}
                  onClick={() => handleFeedback(i, "like")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 10v12" />
                    <path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.95 2.43l-2 9A2 2 0 0 1 17.83 23H7V10l4-9a3 3 0 0 1 4 4.88z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class={`fdb-feedback__btn${msg.feedback === "dislike" ? " fdb-feedback__btn--active" : ""}`}
                  aria-label="Not helpful"
                  aria-pressed={msg.feedback === "dislike"}
                  disabled={!!msg.feedback}
                  onClick={() => handleFeedback(i, "dislike")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 14V2" />
                    <path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.95-2.43l2-9A2 2 0 0 1 6.17 1H17v13l-4 9a3 3 0 0 1-4-4.88z" />
                  </svg>
                </button>
                {msg.feedback && (
                  <span class="fdb-feedback__thanks">Thanks!</span>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div class="fdb-bubble fdb-bubble--assistant fdb-bubble--typing" aria-label="Thinking">
            <span /><span /><span />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Persistent footer link to support — also gated on user-graph
          mode for the same reason as the inline Contact Support
          button above (no support team behind user-graphs). */}
      {!token && (
        <div class="fdb-chat__footer-link">
          <button class="fdb-btn fdb-btn--ghost" onClick={() => onSupportClick(lastUserQuestion)}>
            Can't find it? Get Support →
          </button>
        </div>
      )}

      <div class="fdb-chat__input-bar">
        <input
          class="fdb-input fdb-input--chat"
          type="text"
          placeholder={inputPlaceholder}
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          aria-label="Chat input"
        />
        <button
          class="fdb-btn fdb-btn--send"
          onClick={() => handleSend(input)}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div class="fdb-chat__privacy">
        <span class="fdb-chat__privacy-text">
          Experimental AI chatbot - verify important information.
        </span>
        <span class="fdb-chat__privacy-links">
          Powered by{" "}
          <a href="https://github.com/FalkorDB/GraphRAG-SDK" target="_blank" rel="noopener noreferrer">
            GraphRAG-SDK
          </a>
          {" · "}
          <a href="https://www.falkordb.com" target="_blank" rel="noopener noreferrer">
            FalkorDB
          </a>
          {" · "}
          <a href="https://app.falkordb.cloud/privacy-policy" target="_blank" rel="noopener noreferrer">
            Privacy Notice
          </a>
        </span>
      </div>
    </div>
  );
}
