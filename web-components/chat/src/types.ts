// src/web-components/chat/types.ts

// ── Suggestions ───────────────────────────────────────────────────────────

export interface SuggestionItem {
  title: string
  question: string
  category: 'connection' | 'comparison' | 'deep-dive' | 'overview' | (string & {})
}

// ── Graph-RAG context types (used by GraphRAG-UI, optional for others) ────

export interface ContextItem {
  content: string
  score: number | null
  metadata: Record<string, unknown> | null
}

export interface ExplainNode {
  id: string
  label: string
  name: string
  type: 'entity' | 'chunk' | 'document'
}

export interface ExplainLink {
  source: string
  target: string
  type: string
}

export interface ExplainGraph {
  nodes: ExplainNode[]
  links: ExplainLink[]
}

export interface SourceMapEntry {
  section: string
  index: number
  citation_index?: number
  content?: string
  source_doc?: string
  node_ids?: string[]
}

// ── Query result ──────────────────────────────────────────────────────────

export interface QueryResult {
  answer: string
  queryId?: string | null
  context?: ContextItem[]
  explainGraph?: ExplainGraph | null
  sourceMap?: Record<string, SourceMapEntry> | null
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export type QueryStrategy = 'multi_path' | 'local' | null

// ── Strategy / options menu ───────────────────────────────────────────────

/**
 * Describes a single option in the strategy dropdown.
 * Each product can define its own set of options with different values.
 *
 * @example GraphRAG-UI:
 * ```ts
 * { value: 'multi_path', label: 'Deep Search', description: 'Comprehensive search across the full graph' }
 * ```
 * @example FalkorDB Browser:
 * ```ts
 * { value: 'cypher', label: 'Cypher', description: 'Run raw Cypher queries' }
 * ```
 */
export interface StrategyOption {
  value: string | null
  label: string
  description?: string
}

// ── Custom message types & renderer registry ──────────────────────────────
//
// Products like QueryWeaver can add entirely new message types (sql-query,
// query-result, confirmation, etc.) by registering a MessageRenderer for
// each custom type. The chat component delegates rendering to these
// renderers whenever it encounters a message.type it doesn't handle itself.

/**
 * A function that creates a DOM element for a custom message type.
 *
 * @param message  The full message data (type + content + custom payload).
 * @param helpers  Utility handles provided by the chat component.
 * @returns        An HTMLElement to insert into the conversation.
 */
export type MessageRenderer = (
  message: ChatMessageData,
  helpers: MessageRenderHelpers,
) => HTMLElement

/**
 * Helpers passed to custom renderers so they can interact with the chat.
 */
export interface MessageRenderHelpers {
  /** Escape a string for safe HTML insertion. */
  escapeHtml: (s: string) => string
  /** The chat element itself (for dispatching custom events). */
  host: HTMLElement
}

/**
 * An action button rendered below the input when a custom message type is
 * active (e.g. Confirm / Cancel buttons for destructive SQL operations).
 */
export interface MessageAction {
  label: string
  variant: 'primary' | 'destructive' | 'outline'
  onClick: () => void
}

// ── Config ────────────────────────────────────────────────────────────────

export interface ChatConfig {
  userName?: string

  /** Called when the user submits a question. */
  onQuery: (
    question: string,
    history: ChatHistoryMessage[],
    respond: (result: QueryResult) => void,
    streamToken?: (token: string) => void,
    signal?: AbortSignal,
    /** The currently selected strategy option value (from strategyOptions). */
    strategy?: string | null,
  ) => void

  /** Called when user clicks 👍 or 👎 on an answer. */
  onFeedback?: (queryId: string, rating: 'positive' | 'negative') => void

  /** Called when the query strategy popover changes. */
  onStrategyChange?: (strategy: string | null) => void

  /** Called when the user starts a new conversation. */
  onNewChat?: () => void

  /**
   * The list of options shown in the strategy dropdown.
   * Each product provides its own array. If omitted or empty the strategy
   * button is hidden automatically.
   *
   * @example GraphRAG-UI
   * ```ts
   * strategyOptions: [
   *   { value: 'multi_path', label: 'Deep Search', description: 'Comprehensive search across the full graph' },
   *   { value: 'local', label: 'Fast', description: 'Quick answers from nearby context' },
   *   { value: null, label: 'Auto', description: 'Let the system choose the best approach' },
   * ]
   * ```
   *
   * @example FalkorDB Browser
   * ```ts
   * strategyOptions: [
   *   { value: 'cypher', label: 'Cypher', description: 'Run raw Cypher queries' },
   *   { value: 'natural', label: 'Natural Language', description: 'Ask in plain English' },
   * ]
   * ```
   */
  strategyOptions?: StrategyOption[]

  /**
   * Register custom message renderers keyed by message type string.
   *
   * Built-in types ('user' | 'ai') are always handled by the component.
   * Any other type string is looked up here. If a renderer is found the
   * component delegates to it; otherwise the message is rendered as plain
   * text.
   *
   * @example
   * ```ts
   * chat.setConfig({
   *   messageRenderers: {
   *     'sql-query': (msg, { escapeHtml }) => { ... return el },
   *     'query-result': (msg, { escapeHtml }) => { ... return el },
   *     'confirmation': (msg, { escapeHtml, host }) => { ... return el },
   *   },
   *   ...
   * })
   * ```
   */
  messageRenderers?: Record<string, MessageRenderer>

  /**
   * Optional: hides the built-in bookmark (save) button on AI messages.
   */
  hideBookmarks?: boolean

  /**
   * Optional: hides the built-in feedback (👍👎) buttons on AI messages.
   */
  hideFeedback?: boolean

  /**
   * Optional: hides the built-in "Graph retrieval path" sources panel.
   */
  hideSources?: boolean

  /**
   * Optional: a custom greeting for the empty state. Defaults to
   * "Your graph assistant".
   */
  emptyStateLabel?: string

  /**
   * Optional: subtitle shown below the greeting on the empty state.
   * Defaults to "Ask questions and explore the knowledge in your data".
   */
  emptyStateSubtitle?: string
}

// ── Message data ──────────────────────────────────────────────────────────

export interface ChatMessageData {
  id: string
  /**
   * Built-in types: `'user'` and `'ai'`.
   *
   * Products can use any string (e.g. `'sql-query'`, `'query-result'`,
   * `'confirmation'`, `'ai-steps'`). The chat component will look up a
   * matching `MessageRenderer` in `config.messageRenderers`.
   */
  type: string
  content: string
  context?: ContextItem[]
  explainGraph?: ExplainGraph | null
  sourceMap?: Record<string, SourceMapEntry> | null
  queryId?: string | null
  feedback?: 'positive' | 'negative' | null
  isStreaming?: boolean
  timestamp: string

  /**
   * Arbitrary extra data for custom message types. The built-in renderer
   * ignores this, but custom `MessageRenderer` functions can use it.
   *
   * @example
   * ```ts
   * // QueryWeaver stores SQL analysis info here:
   * data: { sqlQuery: '...', confidence: 0.92, queryData: [...] }
   * ```
   */
  data?: Record<string, unknown>
}

// ── Conversation & bookmarks ──────────────────────────────────────────────

export interface ConversationData {
  id: string
  title: string
  messages: ChatMessageData[]
  createdAt: string
}

export interface BookmarkData {
  id: string
  messageContent: string
  question: string
  conversationId: string
  createdAt: string
}
