// src/web-components/chat/chat.ts

import { CHAT_STYLES } from './styles.js'
import type { ChatConfig, ChatMessageData, ConversationData, SuggestionItem, QueryStrategy } from './types.js'
import {
  getGreeting, formatRelativeTime, annotateEntities, annotateSources, renderMarkdown,
  loadConversations, saveConversations, getActiveId, setActiveId,
  addBookmark, removeBookmark, isBookmarked, getBookmarks,
} from './utils.js'

export class FalkorDBChat extends HTMLElement {
  private shadow: ShadowRoot
  private config: ChatConfig | null = null
  private suggestions: SuggestionItem[] = []
  private messages: ChatMessageData[] = []
  private conversationId: string | null = null
  private isProcessing = false
  private isStreaming = false
  private abortController: AbortController | null = null
  private strategy: QueryStrategy = 'multi_path'
  private namespace = 'default'

  // DOM refs
  private conversationEl!: HTMLElement
  private inputEl!: HTMLTextAreaElement
  private sendBtn!: HTMLButtonElement
  private stopBtn!: HTMLButtonElement
  private newChatBtn!: HTMLButtonElement
  private strategyBtn!: HTMLButtonElement
  private strategyPopover!: HTMLElement
  private scrollBtn!: HTMLButtonElement

  static get observedAttributes() {
    return ['user-name', 'placeholder', 'read-only', 'namespace']
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.namespace = this.getAttribute('namespace') || 'default'
    this.render()
    this.bindEvents()
    this.loadState()
    this.refresh()
  }

  disconnectedCallback() {
    this.abortController?.abort()
  }

  attributeChangedCallback(name: string, _old: string, value: string) {
    if (name === 'namespace') this.namespace = value || 'default'
    if (this.shadow.innerHTML) this.refresh()
  }

  // ── Public API ──────────────────────────────────────────────────────────

  setConfig(config: ChatConfig) {
    this.config = config
    if (config.userName && this.shadow.innerHTML) this.refresh()
  }

  setSuggestions(suggestions: SuggestionItem[]) {
    this.suggestions = suggestions
    if (this.shadow.innerHTML) this.refresh()
  }

  sendMessage(text: string) {
    if (text.trim()) this.handleSend(text.trim())
  }

  newChat() {
    this.handleNewChat()
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private getUserName(): string {
    return this.config?.userName || this.getAttribute('user-name') || ''
  }

  private getPlaceholder(): string {
    return this.getAttribute('placeholder') || 'Ask a question...'
  }

  private isReadOnly(): boolean {
    return this.hasAttribute('read-only')
  }

  private loadState() {
    const activeId = getActiveId(this.namespace)
    if (activeId) {
      const convos = loadConversations(this.namespace)
      const convo = convos.find(c => c.id === activeId)
      if (convo) {
        this.conversationId = convo.id
        this.messages = convo.messages
      }
    }
  }

  private persistMessages(id: string, msgs: ChatMessageData[]) {
    const convos = loadConversations(this.namespace)
    const idx = convos.findIndex(c => c.id === id)
    const title = msgs.find(m => m.type === 'user')?.content.slice(0, 50) || 'New Chat'
    const convo: ConversationData = {
      id, title, messages: msgs,
      createdAt: idx >= 0 ? convos[idx].createdAt : new Date().toISOString(),
    }
    if (idx >= 0) convos[idx] = convo
    else convos.unshift(convo)
    saveConversations(convos, this.namespace)
  }

  private render() { /* implemented in Task 5 */ }
  private bindEvents() { /* implemented in Task 6 */ }
  private refresh() { /* implemented in Task 7 */ }
  private async handleSend(_text: string) { /* implemented in Task 8 */ }
  private handleStop() { /* implemented in Task 9 */ }
  private handleNewChat() { /* implemented in Task 9 */ }
}

customElements.define('falkordb-chat', FalkorDBChat)
