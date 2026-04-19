import { h } from "preact";
import { useState } from "preact/hooks";
import { submitSupport } from "./api";

interface Props {
  onBack: () => void;
  prefillMessage?: string;
  history: Array<{ role: string; content: string }>;
}

type State = "idle" | "submitting" | "success" | "error";

export function Support({ onBack, prefillMessage = "", history }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(prefillMessage);
  const [emailError, setEmailError] = useState("");
  const [state, setState] = useState<State>("idle");

  function validateEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setState("submitting");
    const ok = await submitSupport({ name, email, message, history });
    setState(ok ? "success" : "error");
  }

  if (state === "success") {
    return (
      <div class="fdb-support fdb-support--success">
        <div class="fdb-support__checkmark">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#22C55E" fill-opacity="0.15" />
            <path d="M12 20l6 6 10-12" stroke="#22C55E" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <p class="fdb-support__success-title">We'll be in touch!</p>
        <p class="fdb-support__success-body">
          Your request has been sent. We'll reply to <strong>{email}</strong>.
        </p>
        <button class="fdb-btn fdb-btn--secondary" onClick={onBack}>
          Back to chat
        </button>
      </div>
    );
  }

  return (
    <div class="fdb-support">
      <div class="fdb-support__header">
        <button class="fdb-btn fdb-btn--icon" onClick={onBack} aria-label="Back to chat">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <span class="fdb-support__title">Contact Support</span>
      </div>

      <form class="fdb-support__form" onSubmit={handleSubmit}>
        <label class="fdb-label" for="fdb-name">Name <span aria-hidden="true">*</span></label>
        <input
          id="fdb-name" class="fdb-input" type="text" required
          placeholder="Your name" value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />

        <label class="fdb-label" for="fdb-email">Email <span aria-hidden="true">*</span></label>
        <input
          id="fdb-email" class="fdb-input" type="email" required
          placeholder="you@example.com" value={email}
          onBlur={() => email && !validateEmail(email) && setEmailError("Please enter a valid email.")}
          onInput={(e) => { setEmail((e.target as HTMLInputElement).value); setEmailError(""); }}
        />
        {emailError && <span class="fdb-input__error" role="alert">{emailError}</span>}

        <label class="fdb-label" for="fdb-message">Message <span aria-hidden="true">*</span></label>
        <textarea
          id="fdb-message" class="fdb-input fdb-input--textarea" required rows={4}
          placeholder="Describe your question or issue…" value={message}
          onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
        />

        {state === "error" && (
          <p class="fdb-support__error" role="alert">
            Failed to send. Please try again or email support@falkordb.com.
          </p>
        )}

        <button
          class="fdb-btn fdb-btn--primary fdb-btn--full"
          type="submit"
          disabled={state === "submitting"}
        >
          {state === "submitting" ? "Sending…" : "Send Request"}
        </button>
      </form>
    </div>
  );
}
