/**
 * Conversation persistence helpers for the widget.
 *
 * Lifecycle the widget targets:
 *   - Page navigation within docs.falkordb.com  → preserve conversation
 *   - Click "Get Support" / return to chat       → preserve conversation
 *   - Click X (close widget) or press Escape    → clear conversation
 *   - Page refresh (F5 / Ctrl+R)                → clear conversation
 *   - Tab/browser close                         → clear (sessionStorage default)
 *
 * sessionStorage gives us "preserve across navigation" for free. The
 * tricky case is *refresh* — sessionStorage normally survives reloads
 * but we want to wipe. We detect reload at mount time via the
 * Navigation Timing API and clear before reading.
 *
 * Per-graph keys so switching the widget's `graph` config never bleeds
 * a previous graph's conversation in.
 */

export function conversationStorageKeys(graph: string, token: string = "") {
  // The widget mounts once per page; if multiple widgets ever share a
  // tab (e.g. preview vs prod, or two user-owned graphs with different
  // tokens), per-(graph, token) keys keep their conversations isolated.
  //
  // Use ``encodeURIComponent`` instead of a lossy regex replace: with
  // a regex that maps every non-safe char to ``_``, distinct graph
  // ids like ``foo.bar`` and ``foo:bar`` would collide on the same
  // storage key, defeating the per-graph isolation contract. URI
  // encoding is a reversible 1:1 mapping that keeps each id distinct.
  // Token participates the same way so two user-owned graphs queried
  // from the same page (in theory) wouldn't share a conversation buffer.
  // When `token` is empty (docs-widget / predefined-graph path), keep the
  // legacy key shape (`<prefix>:<graph>`, no trailing colon) so sessions
  // saved by previous builds remain readable across the deploy. Only
  // append `:<token>` when a token is actually present — that's the
  // user-graph path that needs per-token isolation between graphs sharing
  // a tab.
  const graphPart = encodeURIComponent(graph || "default");
  const safe = token
    ? `${graphPart}:${encodeURIComponent(token)}`
    : graphPart;
  return {
    history: `fdb-widget-history:${safe}`,
    messages: `fdb-widget-messages:${safe}`,
  };
}

// All sessionStorage access goes through these guards: privacy mode,
// embedded contexts with storage disabled, and Safari ITP can each
// throw SecurityError or QuotaExceededError. Persistence is a UX
// nicety; never let it crash the widget.
export function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // best-effort persistence — silently drop on quota / disabled storage
  }
}

export function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // best-effort — same reasoning as safeSetItem
  }
}

export function clearConversationStorage(graph: string, token: string = ""): void {
  const { history, messages } = conversationStorageKeys(graph, token);
  safeRemoveItem(history);
  safeRemoveItem(messages);
}

export function shouldClearOnMount(): boolean {
  // Page reload should reset the chat. Other navigation types
  // ("navigate", "back_forward") preserve via sessionStorage default.
  //
  // The modern API is PerformanceNavigationTiming via
  // performance.getEntriesByType("navigation")[0].type. The legacy
  // `performance.navigation.type === 1` is a fallback for older browsers
  // (still in some embedded contexts).
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entries && entries[0]) {
      return entries[0].type === "reload";
    }
  } catch {
    // ignore — fall through to legacy probe
  }
  try {
    // Legacy `performance.navigation` is removed from modern TS lib defs.
    const legacy = (performance as unknown as { navigation?: { type?: number } }).navigation;
    return legacy?.type === 1;
  } catch {
    return false;
  }
}
