// src/web-components/chat/types.ts

export interface SuggestionItem {
  title: string
  question: string
  category: 'connection' | 'comparison' | 'deep-dive' | 'overview'
}

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

export interface ChatConfig {
  userName?: string
  onQuery: (
    question: string,
    history: ChatHistoryMessage[],
    respond: (result: QueryResult) => void,
    streamToken?: (token: string) => void,
    signal?: AbortSignal
  ) => void
  onFeedback?: (queryId: string, rating: 'positive' | 'negative') => void
  onStrategyChange?: (strategy: QueryStrategy) => void
  onNewChat?: () => void
}

export interface ChatMessageData {
  id: string
  type: 'user' | 'ai'
  content: string
  context?: ContextItem[]
  explainGraph?: ExplainGraph | null
  sourceMap?: Record<string, SourceMapEntry> | null
  queryId?: string | null
  feedback?: 'positive' | 'negative' | null
  isStreaming?: boolean
  timestamp: string
}

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
