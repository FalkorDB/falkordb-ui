import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { fetchSuggestions, sendMessage, ChatResponse, Suggestion } from "./api";

interface Message {
  role: "user" | "assistant";
  content: string;
  hasContext?: boolean;
  userQuestion?: string;
}

interface Props {
  onSupportClick: (lastQuestion?: string) => void;
  history: Array<{ role: string; content: string }>;
  onHistoryUpdate: (history: Array<{ role: string; content: string }>) => void;
  showSuggestions?: boolean;
}

// Shown when the backend reports the LLM answer wasn't grounded in the
// graph (has_context=false). Keeps the widget honest about scope and
// gently redirects the user to in-domain questions.
const OUT_OF_SCOPE_MESSAGE =
  "Hey, I'm the FalkorDB assistant, ask me anything about the FalkorDB docs only. For other questions, please contact support using the button below.";

export function Chat({ onSupportClick, history, onHistoryUpdate, showSuggestions = true }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSuggestions) return;
    fetchSuggestions().then(setSuggestions);
  }, [showSuggestions]);

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
      const res: ChatResponse = await sendMessage(question);
      // When the backend tells us the answer wasn't grounded in the graph,
      // replace the LLM's off-topic text with a branded out-of-scope
      // message that steers the user back to FalkorDB-related questions.
      const content = res.has_context ? res.answer : OUT_OF_SCOPE_MESSAGE;
      const assistantMsg: Message = {
        role: "assistant",
        content,
        hasContext: res.has_context,
        userQuestion: question,
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

  const lastUserQuestion = messages.filter((m) => m.role === "user").slice(-1)[0]?.content;

  return (
    <div class="fdb-chat">
      <div class="fdb-chat__messages">
        {messages.length === 0 && (
          <div class="fdb-chat__welcome">
            <div class="fdb-chat__welcome-icon">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <text x="16" y="22" text-anchor="middle" font-size="16"
                      fill="#22C55E" font-family="Inter,sans-serif" font-weight="700">F</text>
              </svg>
            </div>
            <p class="fdb-chat__welcome-title">How can I help?</p>
            <p class="fdb-chat__welcome-subtitle">Ask me anything about your docs.</p>
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
            <p>{msg.content}</p>
            {msg.role === "assistant" && msg.hasContext === false && (
              <button
                class="fdb-btn fdb-btn--inline"
                onClick={() => onSupportClick(msg.userQuestion ?? lastUserQuestion)}
              >
                Contact Support
              </button>
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

      <div class="fdb-chat__footer-link">
        <button class="fdb-btn fdb-btn--ghost" onClick={() => onSupportClick(lastUserQuestion)}>
          Can't find it? Get Support →
        </button>
      </div>

      <div class="fdb-chat__input-bar">
        <input
          class="fdb-input fdb-input--chat"
          type="text"
          placeholder="Ask about FalkorDB…"
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
        This chat is recorded using a cloud service and is subject to the terms of our{" "}
        <a href="https://app.falkordb.cloud/privacy-policy" target="_blank" rel="noopener noreferrer">
          Privacy Notice
        </a>.
      </div>
    </div>
  );
}
