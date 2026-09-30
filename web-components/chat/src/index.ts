// src/web-components/chat/index.ts
export { FalkorDBChat } from './chat.js'

export type {
  SuggestionItem,
  ChatConfig,
  QueryResult,
  ChatMessageData,
  ConversationData,
  ContextItem,
  ExplainGraph,
  ExplainNode,
  ExplainLink,
  SourceMapEntry,
  BookmarkData,
  QueryStrategy,
  StrategyOption,
  MessageRenderer,
  MessageRenderHelpers,
  MessageAction,
  ChatHistoryMessage,
  NewChatMessage,
  ChatChangeDetail,
} from './types.js'

declare global {
  interface HTMLElementTagNameMap {
    'falkordb-chat': import('./chat.js').FalkorDBChat
  }
  interface HTMLElementEventMap {
    'falkordb-chat-change': CustomEvent<import('./types.js').ChatChangeDetail>
  }
}
