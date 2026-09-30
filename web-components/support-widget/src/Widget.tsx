import { useState, useEffect, useRef } from "preact/hooks";
import { configure } from "./api";
import { Chat } from "./Chat";
import falkordbLogoSvg from "./assets/falkordb-logo.svg?raw";
import {
  clearConversationStorage,
  conversationStorageKeys,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  shouldClearOnMount,
} from "./persistence";
import { Support } from "./Support";

type View = "chat" | "support";

interface Config {
  api: string;
  graph: string;
  token: string;
  title: string;
  accent: string;
  position: "bottom-right" | "bottom-left";
  suggestions: boolean;
  icon: string;
  description: string;
}

// Predefined FalkorDB logo used by the docs widget. User-graphs swap
// this for the owner-supplied icon (URL → <img>, short string → text
// like an emoji) or a built-in generic chat bubble if no icon is set.
// The SVG markup lives in ``./assets/falkordb-logo.svg`` and is inlined
// at build time via Vite's ``?raw`` import (same pattern Chat.tsx uses
// for the wordmark logo). Keeping the markup out of the TSX makes
// future logo tweaks a one-file edit and keeps the component tree
// readable.
function FalkorDBLogo() {
  return <span class="fdb-logo-inline" dangerouslySetInnerHTML={{ __html: falkordbLogoSvg }} />;
}

// Generic chat-bubble fallback for user-graphs that haven't set an
// icon. Renders in the widget's accent color via ``currentColor`` so
// it doesn't compete with the owner's branding.
//
// Rendered at 28×28 so it matches the other HeaderLogo variants
// (FalkorDBLogo's SVG, the URL <img>, and the .fdb-panel__logo-text
// span are all 28×28) — keeping the size in sync prevents the ring
// shadow and the ::after status dot from misaligning when this
// fallback is shown.
function GenericChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"
            stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none" />
    </svg>
  );
}

// Header logo router. Predefined-graph (docs widget) → FalkorDB SVG.
// User-graph (token present) → owner's ``icon`` if set, otherwise a
// generic chat bubble. ``icon`` can be a URL or a short string (emoji
// or a few characters). Anything starting with http(s) is rendered as
// an <img>; anything else is rendered as text inside the same span
// the SVG would occupy, so the layout doesn't shift.
function HeaderLogo({ isUserGraph, icon }: { isUserGraph: boolean; icon: string }) {
  // Track <img> load failures so we can swap to the generic chat
  // bubble when the owner's icon URL is dead (typo, expired CDN,
  // saved placeholder like `https://cdn.example.com/chat-icon.svg`).
  // Without this fallback the user sees a broken-image glyph in the
  // panel header, which is worse UX than showing the chat-bubble
  // default.
  const [imgFailed, setImgFailed] = useState(false);
  // Reset on icon change — otherwise a dead URL "poisons" the component
  // and a later valid URL still falls through to GenericChatIcon even
  // though the new <img> would have loaded.
  useEffect(() => {
    setImgFailed(false);
  }, [icon]);
  if (!isUserGraph) return <FalkorDBLogo />;
  const trimmed = (icon || "").trim();
  if (trimmed === "") return <GenericChatIcon />;
  if (/^https?:\/\//i.test(trimmed)) {
    if (imgFailed) return <GenericChatIcon />;
    return (
      <img
        src={trimmed}
        alt=""
        width={28}
        height={28}
        onError={() => setImgFailed(true)}
      />
    );
  }
  // Emoji / short text — cap at 4 chars so an accidentally-long string
  // doesn't blow out the header layout.
  return <span class="fdb-panel__logo-text">{trimmed.slice(0, 4)}</span>;
}

export function Widget({ config }: { config: Config }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [prefillMessage, setPrefillMessage] = useState("");
  // Lazy initial value: if the page was reloaded (not just navigated to),
  // wipe sessionStorage so refresh acts as "start a new conversation".
  // Otherwise restore from storage so navigating across docs.falkordb.com
  // pages keeps the conversation visible — same tab, same session.
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>(() => {
    if (shouldClearOnMount()) {
      clearConversationStorage(config.graph, config.token);
      return [];
    }
    const raw = safeGetItem(conversationStorageKeys(config.graph, config.token).history);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const fabRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Apply API config + clear conversation when the config CHANGES at runtime
  // (so follow-up context cannot leak across graphs/backends/tokens). The clear
  // must be gated on an actual change — without the ref, this effect fires
  // on the initial mount and wipes the conversation we just restored from
  // sessionStorage, defeating the navigation-preserves contract.
  const lastConfigRef = useRef({
    api: config.api,
    graph: config.graph,
    token: config.token,
  });
  useEffect(() => {
    configure(config.api, config.graph, config.token);
    const prev = lastConfigRef.current;
    const changed =
      prev.api !== config.api
      || prev.graph !== config.graph
      || prev.token !== config.token;
    if (changed) {
      setHistory([]);
      clearConversationStorage(config.graph, config.token);
      // If the previous (graph, token) pair differs from the new one,
      // also clear its storage so stale entries don't sit around under
      // the old key.
      if (prev.graph !== config.graph || prev.token !== config.token) {
        clearConversationStorage(prev.graph, prev.token);
      }
    }
    lastConfigRef.current = {
      api: config.api,
      graph: config.graph,
      token: config.token,
    };
  }, [config.api, config.graph, config.token]);

  // Persist history to sessionStorage on every change so navigating to
  // another docs page keeps the conversation. Reload + X-close both
  // clear (see shouldClearOnMount and the close handler below).
  useEffect(() => {
    const key = conversationStorageKeys(config.graph, config.token).history;
    if (history.length === 0) {
      safeRemoveItem(key);
    } else {
      safeSetItem(key, JSON.stringify(history));
    }
  }, [history, config.graph, config.token]);

  function closeWidget() {
    // X-button or Escape: explicit close means "I'm done" — wipe the
    // conversation so reopening starts fresh. Navigation away (which
    // doesn't fire this) keeps it.
    setOpen(false);
    setHistory([]);
    clearConversationStorage(config.graph, config.token);
  }

  // Escape to close + focus management
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeWidget();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Return focus to the FAB when the panel closes
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      fabRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  const positionClass = config.position === "bottom-left"
    ? "fdb-widget--bottom-left"
    : "fdb-widget--bottom-right";

  function handleSupportClick(lastQuestion?: string) {
    setPrefillMessage(lastQuestion ?? "");
    setView("support");
  }

  return (
    <div class={`fdb-widget ${positionClass}`}
         style={{ "--fdb-accent": config.accent } as any}>
      {open && (
        <div id="fdb-panel" class="fdb-panel" role="dialog" aria-modal="false" aria-label={config.title}>
          <div class="fdb-panel__header">
            <span class="fdb-panel__logo">
              <HeaderLogo isUserGraph={!!config.token} icon={config.icon} />
            </span>
            {/* Title group stacks the title + optional description in a
                column so the description (set per-graph in Widget appearance >
                Description on the SPA) appears as a one-line subtitle
                under the title. Both ellipsize to keep the header to
                one row. User-graphs get an "AI Assistant" suffix on
                the title so the header reads as a chat assistant
                (e.g. "Messi AI Assistant") rather than just a name.
                Docs widget keeps the bare "FalkorDB" header. */}
            <div class="fdb-panel__title-group">
              <span class="fdb-panel__title">
                {config.title}
                {!!config.token && " AI Assistant"}
              </span>
              {config.description && (
                <span class="fdb-panel__description" title={config.description}>
                  {config.description}
                </span>
              )}
            </div>
            <button ref={closeBtnRef} class="fdb-btn fdb-btn--icon fdb-btn--close"
                    onClick={closeWidget} aria-label="Close chat">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="fdb-panel__body">
            {view === "chat" ? (
              <Chat
                key={`${config.api}:${config.graph}:${config.token}`}
                onSupportClick={handleSupportClick}
                history={history}
                onHistoryUpdate={setHistory}
                showSuggestions={config.suggestions}
                graph={config.graph}
                token={config.token}
              />
            ) : (
              <Support
                onBack={() => setView("chat")}
                prefillMessage={prefillMessage}
                history={history}
              />
            )}
          </div>
        </div>
      )}

      <button
        ref={fabRef}
        class={`fdb-fab ${open ? "fdb-fab--open" : ""}`}
        onClick={() => { setOpen((v) => !v); if (!open) setView("chat"); }}
        aria-label={open ? "Close messaging window" : "Open messaging window"}
        aria-expanded={open}
        aria-controls="fdb-panel"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" stroke-width="2"
                  stroke-linecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  fill="white" />
          </svg>
        )}
      </button>
    </div>
  );
}
