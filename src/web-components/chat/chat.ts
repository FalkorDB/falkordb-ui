// src/web-components/chat/chat.ts

import { CHAT_STYLES } from './styles.js'
import type { ChatConfig, ChatMessageData, ConversationData, SuggestionItem, QueryStrategy, MessageRenderHelpers } from './types.js'
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
    if (!this.conversationEl) {
      this.render()
      this.bindEvents()
    }
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

  /**
   * Programmatically add a message to the conversation. This is the
   * primary way custom integrations inject non-standard message types
   * (e.g. sql-query, query-result, confirmation).
   *
   * @example
   * ```ts
   * chat.addMessage({
   *   id: Date.now().toString(),
   *   type: 'sql-query',
   *   content: 'SELECT * FROM users LIMIT 5',
   *   timestamp: new Date().toISOString(),
   *   data: { confidence: 0.92 },
   * })
   * ```
   */
  addMessage(msg: ChatMessageData) {
    const currentId = this.conversationId || Date.now().toString()
    if (!this.conversationId) {
      this.conversationId = currentId
      setActiveId(currentId, this.namespace)
    }
    this.messages = [...this.messages, msg]
    this.persistMessages(currentId, this.messages.filter(m => !m.isStreaming))
    this.refresh()
  }

  /** Get a readonly snapshot of the current messages. */
  getMessages(): readonly ChatMessageData[] {
    return [...this.messages]
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

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

  private render() {
    const style = document.createElement('style')
    style.textContent = CHAT_STYLES
    this.shadow.appendChild(style)

    const wrapper = document.createElement('div')
    wrapper.className = 'fc-wrapper'
    wrapper.style.cssText = 'display:flex;flex-direction:column;height:100%;width:100%;position:relative;'
    wrapper.innerHTML = `
      <div class="fc-conversation"></div>
      <button class="fc-scroll-btn" aria-label="Scroll to bottom">↓ Latest</button>
      <div class="fc-bottom">
        <div class="fc-input-row">
          <button class="fc-new-chat-btn" title="New chat" style="display:none">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <div class="fc-query-wrap" style="position:relative">
            <div class="fc-popover"></div>
            <div class="fc-query-inner">
              <textarea class="fc-query-textarea" rows="1"></textarea>
              <button class="fc-action-btn fc-strategy-btn" title="Query strategy" type="button">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="fc-action-btn fc-send-btn" type="button" title="Send (Enter)">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
              <button class="fc-action-btn fc-stop-btn" type="button" title="Stop" style="display:none">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `
    this.shadow.appendChild(wrapper)

    this.conversationEl = this.shadow.querySelector('.fc-conversation')!
    this.inputEl = this.shadow.querySelector('.fc-query-textarea')!
    this.inputEl.placeholder = this.getPlaceholder()
    this.sendBtn = this.shadow.querySelector('.fc-send-btn')!
    this.stopBtn = this.shadow.querySelector('.fc-stop-btn')!
    this.newChatBtn = this.shadow.querySelector('.fc-new-chat-btn')!
    this.strategyBtn = this.shadow.querySelector('.fc-strategy-btn')!
    this.strategyPopover = this.shadow.querySelector('.fc-popover')!
    this.scrollBtn = this.shadow.querySelector('.fc-scroll-btn')!
  }

  private bindEvents() {
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = this.inputEl.value.trim()
        if (text && !this.isProcessing) this.handleSend(text)
      }
    })

    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto'
      this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 128)}px`
    })

    this.sendBtn.addEventListener('click', () => {
      const text = this.inputEl.value.trim()
      if (text && !this.isProcessing) this.handleSend(text)
    })

    this.stopBtn.addEventListener('click', () => this.handleStop())
    this.newChatBtn.addEventListener('click', () => this.handleNewChat())

    this.strategyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.strategyPopover.classList.toggle('fc-open')
    })

    this.shadow.addEventListener('click', () => this.strategyPopover.classList.remove('fc-open'))

    this.conversationEl.addEventListener('scroll', () => {
      const el = this.conversationEl
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      this.scrollBtn.classList.toggle('fc-visible', !atBottom)
    })
    this.scrollBtn.addEventListener('click', () => {
      this.conversationEl.scrollTo({ top: this.conversationEl.scrollHeight, behavior: 'smooth' })
    })
  }

  private updateStrategyUI() {
    const options = this.config?.strategyOptions
    const hasOptions = options && options.length > 0

    // Hide strategy button when no options provided
    this.strategyBtn.style.display = hasOptions ? 'flex' : 'none'

    // Rebuild popover content from config options
    this.strategyPopover.innerHTML = ''
    if (!hasOptions) return

    const label = document.createElement('p')
    label.className = 'fc-popover-label'
    label.textContent = 'Query Mode'
    this.strategyPopover.appendChild(label)

    options.forEach(opt => {
      const btn = document.createElement('button')
      btn.className = 'fc-strategy-option'
      btn.dataset.value = String(opt.value)
      const isActive = (opt.value === null && this.strategy === null) || opt.value === this.strategy
      if (isActive) btn.classList.add('fc-active')
      btn.innerHTML = `
        <span class="fc-strategy-name">${this.esc(opt.label)}</span>
        ${opt.description ? `<span class="fc-strategy-desc">${this.esc(opt.description)}</span>` : ''}
      `
      btn.addEventListener('click', () => {
        this.strategy = opt.value as QueryStrategy
        this.config?.onStrategyChange?.(opt.value)
        this.strategyPopover.classList.remove('fc-open')
        this.updateStrategyUI()
      })
      this.strategyPopover.appendChild(btn)
    })
  }

  private refresh() {
    if (!this.conversationEl) return
    this.conversationEl.innerHTML = ''
    const inner = document.createElement('div')
    inner.className = 'fc-messages'
    inner.style.cssText = 'max-width:48rem;margin:0 auto;'

    if (this.messages.length === 0) {
      inner.appendChild(this.renderEmptyState())
    } else {
      this.messages.forEach((msg, idx) => {
        const question = msg.type === 'ai'
          ? this.messages.slice(0, idx).reverse().find(m => m.type === 'user')?.content
          : undefined
        inner.appendChild(this.renderMessage(msg, question))
      })
    }

    this.conversationEl.appendChild(inner)
    this.scrollToBottom()

    this.newChatBtn.style.display = this.messages.length > 0 ? 'flex' : 'none'

    this.sendBtn.style.display = this.isStreaming ? 'none' : 'flex'
    this.stopBtn.style.display = this.isStreaming ? 'flex' : 'none'
    this.sendBtn.disabled = this.isProcessing || this.isReadOnly()
    this.inputEl.disabled = this.isProcessing || this.isReadOnly()
    this.inputEl.placeholder = this.isReadOnly()
      ? 'Read only mode'
      : this.getPlaceholder()

    this.updateStrategyUI()
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      this.conversationEl.scrollTop = this.conversationEl.scrollHeight
    })
  }

  private renderEmptyState(): HTMLElement {
    const userName = this.getUserName()
    const greeting = getGreeting()
    const label = this.config?.emptyStateLabel ?? 'Your graph assistant'
    const subtitle = this.config?.emptyStateSubtitle ?? 'Ask questions and explore the knowledge in your data'

    const el = document.createElement('div')
    el.className = 'fc-empty'
    el.innerHTML = `
      <span class="fc-empty-label">${this.esc(label)}</span>
      <h2 class="fc-empty-title">${userName ? `${greeting}, ${this.esc(userName)}` : 'Explore your knowledge graph'}</h2>
      <p class="fc-empty-subtitle">${this.esc(subtitle)}</p>
    `

    if (this.suggestions.length > 0) {
      const grid = document.createElement('div')
      grid.className = 'fc-suggestions'
      this.suggestions.forEach(s => {
        const card = this.renderSuggestionCard(s)
        grid.appendChild(card)
      })
      el.appendChild(grid)
    }

    return el
  }

  private renderSuggestionCard(s: SuggestionItem): HTMLElement {
    const catClass = `fc-cat-${s.category}`
    const icons: Record<string, string> = {
      connection: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      comparison: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`,
      'deep-dive': `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      overview: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    }
    const btn = document.createElement('button')
    btn.className = `fc-suggestion-card ${catClass}`
    btn.innerHTML = `
      <div class="fc-suggestion-icon">${icons[s.category] || icons.overview}</div>
      <div style="flex:1;min-width:0">
        <p class="fc-suggestion-title">${this.esc(s.title)}</p>
        <p class="fc-suggestion-question">${this.esc(s.question)}</p>
      </div>
      <span class="fc-suggestion-arrow">→</span>
    `
    btn.addEventListener('click', () => this.handleSend(s.question))
    return btn
  }

  private renderMessage(msg: ChatMessageData, question?: string): HTMLElement {
    // ── User message ─────────────────────────────────────────────────────
    if (msg.type === 'user') {
      const el = document.createElement('div')
      el.className = 'fc-msg-user'
      el.innerHTML = `<div class="fc-msg-user-bubble">${msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>`
      return el
    }

    // ── Custom message type → delegate to registered renderer ────────────
    if (msg.type !== 'ai' && this.config?.messageRenderers?.[msg.type]) {
      const renderer = this.config.messageRenderers[msg.type]
      const helpers: MessageRenderHelpers = {
        escapeHtml: (s: string) => this.esc(s),
        host: this,
      }
      const el = renderer(msg, helpers)
      el.dataset.msgId = msg.id
      return el
    }

    // ── AI message (built-in) ────────────────────────────────────────────

    const el = document.createElement('div')
    el.className = 'fc-msg-ai'
    el.dataset.msgId = msg.id

    let displayContent = msg.content
    const entityMap = new Map<number, string>()
    if (msg.explainGraph) {
      const ann = annotateEntities(displayContent, msg.explainGraph.nodes)
      displayContent = ann.text
      ann.entityMap.forEach((v, k) => entityMap.set(k, v))
    }
    displayContent = annotateSources(displayContent, msg.sourceMap)

    const contentEl = document.createElement('div')
    contentEl.className = 'fc-msg-ai-content'
    contentEl.innerHTML = renderMarkdown(displayContent)

    if (msg.isStreaming) {
      const cursor = document.createElement('span')
      cursor.className = 'fc-cursor'
      contentEl.appendChild(cursor)
    }

    el.appendChild(contentEl)

    contentEl.querySelectorAll('.fc-entity-link').forEach(btn => {
      const idx = parseInt((btn as HTMLElement).dataset.entityIdx || '0')
      const entityId = entityMap.get(idx)
      if (entityId) {
        btn.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('falkordb-chat-entity-click', {
            bubbles: true, composed: true, detail: { entityId, graph: msg.explainGraph }
          }))
        })
      }
    })
    contentEl.querySelectorAll('.fc-source-link').forEach(btn => {
      const num = (btn as HTMLElement).dataset.sourceNum
      if (num && msg.sourceMap?.[num]) {
        btn.addEventListener('click', () => {
          const entry = msg.sourceMap![num]
          this.dispatchEvent(new CustomEvent('falkordb-chat-source-click', {
            bubbles: true, composed: true, detail: { entry, graph: msg.explainGraph }
          }))
        })
      }
    })

    if (!msg.isStreaming) {
      const toolbar = this.renderToolbar(msg, question)
      el.appendChild(toolbar)
      if (!this.config?.hideSources && msg.context && msg.context.length > 0) {
        el.appendChild(this.renderSourcesPanel(msg))
      }
    }

    return el
  }

  private renderToolbar(msg: ChatMessageData, question?: string): HTMLElement {
    const toolbar = document.createElement('div')
    toolbar.className = 'fc-msg-toolbar'

    const left = document.createElement('div')
    left.className = 'fc-toolbar-left'

    if (msg.timestamp) {
      const ts = document.createElement('span')
      ts.className = 'fc-toolbar-timestamp'
      ts.textContent = formatRelativeTime(msg.timestamp)
      left.appendChild(ts)
    }

    const copyBtn = document.createElement('button')
    copyBtn.className = 'fc-toolbar-btn'
    copyBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(msg.content)
      copyBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> <span style="color:var(--fc-green)">Copied</span>`
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`
      }, 2000)
    })
    left.appendChild(copyBtn)

    if (!this.config?.hideBookmarks) {
      const bkmBtn = document.createElement('button')
      const bookmarked = isBookmarked(msg.content)
      bkmBtn.className = `fc-toolbar-btn${bookmarked ? ' fc-bookmarked' : ''}`
      const bookmarkIcon = `<svg width="12" height="12" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      bkmBtn.innerHTML = `${bookmarkIcon} ${bookmarked ? 'Saved' : 'Save'}`
      bkmBtn.addEventListener('click', () => {
        if (isBookmarked(msg.content)) {
          const bkms = getBookmarks()
          const existing = bkms.find(b => b.messageContent === msg.content)
          if (existing) removeBookmark(existing.id)
          bkmBtn.className = 'fc-toolbar-btn'
          bkmBtn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save`
        } else {
          addBookmark({ messageContent: msg.content, question: question || '', conversationId: this.conversationId || '' })
          bkmBtn.className = 'fc-toolbar-btn fc-bookmarked'
          bkmBtn.innerHTML = `<svg width="12" height="12" fill="currentColor" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Saved`
        }
      })
      left.appendChild(bkmBtn)
    }
    toolbar.appendChild(left)

    if (!this.config?.hideFeedback && msg.queryId && this.config?.onFeedback) {
      const feedbackWrap = document.createElement('div')
      feedbackWrap.className = 'fc-feedback-wrap'

      const upBtn = document.createElement('button')
      upBtn.className = `fc-feedback-btn fc-thumb-up${msg.feedback === 'positive' ? ' fc-active-up' : ''}`
      upBtn.title = 'Good response'
      upBtn.innerHTML = `<svg width="14" height="14" fill="${msg.feedback === 'positive' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`
      upBtn.addEventListener('click', () => {
        this.config!.onFeedback!(msg.queryId!, 'positive')
        this.updateMessageFeedback(msg.id, 'positive')
      })

      const downBtn = document.createElement('button')
      downBtn.className = `fc-feedback-btn fc-thumb-down${msg.feedback === 'negative' ? ' fc-active-down' : ''}`
      downBtn.title = 'Bad response'
      downBtn.innerHTML = `<svg width="14" height="14" fill="${msg.feedback === 'negative' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`
      downBtn.addEventListener('click', () => {
        this.config!.onFeedback!(msg.queryId!, 'negative')
        this.updateMessageFeedback(msg.id, 'negative')
      })

      feedbackWrap.appendChild(upBtn)
      feedbackWrap.appendChild(downBtn)
      toolbar.appendChild(feedbackWrap)
    }

    return toolbar
  }

  private updateMessageFeedback(msgId: string, rating: 'positive' | 'negative') {
    const idx = this.messages.findIndex(m => m.id === msgId)
    if (idx >= 0) {
      this.messages[idx] = { ...this.messages[idx], feedback: rating }
      if (this.conversationId) this.persistMessages(this.conversationId, this.messages)
      const msgEl = this.shadow.querySelector(`[data-msg-id="${msgId}"]`)
      if (msgEl) {
        const toolbarEl = msgEl.querySelector('.fc-msg-toolbar')
        if (toolbarEl) {
          const question = this.messages.slice(0, idx).reverse().find(m => m.type === 'user')?.content
          toolbarEl.replaceWith(this.renderToolbar(this.messages[idx], question))
        }
      }
    }
  }

  private renderSourcesPanel(msg: ChatMessageData): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'fc-sources'

    const toggle = document.createElement('button')
    toggle.className = 'fc-sources-toggle'
    toggle.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Graph retrieval path <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`

    const body = document.createElement('div')
    body.className = 'fc-sources-body'
    body.style.display = 'none'

    toggle.addEventListener('click', () => {
      const open = body.style.display !== 'none'
      body.style.display = open ? 'none' : 'flex'
      toggle.classList.toggle('fc-open', !open)
      if (!open && body.childElementCount === 0) {
        this.populateSourcesPanel(body, msg)
      }
    })

    wrap.appendChild(toggle)
    wrap.appendChild(body)
    return wrap
  }

  private populateSourcesPanel(body: HTMLElement, msg: ChatMessageData) {
    const context = msg.context || []
    const entities = context.filter(i => (i.metadata as Record<string,unknown>)?.section === 'entity')
    const relationships = context.filter(i => (i.metadata as Record<string,unknown>)?.section === 'relationship')
    const passages = context.filter(i => {
      const s = (i.metadata as Record<string,unknown>)?.section as string
      return s !== 'entity' && s !== 'relationship' && s !== 'entities' && s !== 'relationships'
    })

    const makeSection = (items: typeof context, sectClass: string, label: string, badgeLabel: string) => {
      if (items.length === 0) return
      const sec = document.createElement('div')
      sec.innerHTML = `
        <div class="fc-source-section-label ${sectClass}">
          <span class="fc-source-section-text">${label}</span>
          <div class="fc-source-section-line"></div>
        </div>
      `
      items.forEach((item, i) => {
        const card = document.createElement('button')
        card.className = 'fc-source-card'
        const sourceDoc = (item.metadata as Record<string,unknown>)?.source_doc as string | undefined
        card.innerHTML = `
          <div class="fc-source-card-header ${sectClass}">
            <span class="fc-source-badge">${badgeLabel}</span>
            <span class="fc-source-idx">[${i + 1}]</span>
          </div>
          <p class="fc-source-content">${item.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
          ${sourceDoc ? `<div class="fc-source-doc">📄 ${this.esc(sourceDoc)}</div>` : ''}
        `
        card.addEventListener('click', () => {
          const section = (item.metadata as Record<string,unknown>)?.section as string
          this.dispatchEvent(new CustomEvent('falkordb-chat-source-click', {
            bubbles: true, composed: true,
            detail: { entry: { section, content: item.content }, graph: msg.explainGraph }
          }))
        })
        sec.appendChild(card)
      })
      body.appendChild(sec)
    }

    makeSection(entities, 'fc-sect-entity', 'Graph Entities', 'Entity')
    makeSection(relationships, 'fc-sect-rel', 'Graph Knowledge', 'Graph Edge')
    makeSection(passages, 'fc-sect-passage', 'Source Passages', 'Passage')
  }

  private async handleSend(text: string) {
    if (this.isProcessing || !this.config) return

    this.isProcessing = true
    this.isStreaming = false
    this.abortController = new AbortController()

    const currentId = this.conversationId || Date.now().toString()
    if (!this.conversationId) {
      this.conversationId = currentId
      setActiveId(currentId, this.namespace)
    }

    const userMsg: ChatMessageData = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const aiMsgId = (Date.now() + 1).toString()
    const streamingMsg: ChatMessageData = {
      id: aiMsgId,
      type: 'ai',
      content: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    }

    this.messages = [...this.messages, userMsg, streamingMsg]
    this.inputEl.value = ''
    this.inputEl.style.height = 'auto'
    this.isStreaming = true
    this.refresh()
    this.persistMessages(currentId, this.messages.filter(m => !m.isStreaming))

    const history = this.messages
      .filter(m => !m.isStreaming && m.id !== userMsg.id)
      .map(m => ({ role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }))

    const streamToken = (token: string) => {
      const idx = this.messages.findIndex(m => m.id === aiMsgId)
      if (idx >= 0) {
        this.messages[idx] = { ...this.messages[idx], content: token }
        const msgEl = this.shadow.querySelector(`[data-msg-id="${aiMsgId}"]`)
        if (msgEl) {
          const contentEl = msgEl.querySelector('.fc-msg-ai-content')
          if (contentEl) {
            contentEl.innerHTML = renderMarkdown(token)
            const cursor = document.createElement('span')
            cursor.className = 'fc-cursor'
            contentEl.appendChild(cursor)
          }
        }
        this.scrollToBottom()
      }
    }

    const currentAbort = this.abortController

    const respond = (result: import('./types.js').QueryResult) => {
      if (currentAbort?.signal.aborted) return
      const noContextPatterns = [
        /does not provide/i,
        /do(es)?n't (have|contain|include|mention|provide)/i,
        /no (relevant|related|matching) (information|data|context|results)/i,
        /cannot (find|answer|determine)/i,
        /I (don't|do not) have (enough )?(information|context|data)/i,
      ]
      const answerLooksEmpty = noContextPatterns.some(p => p.test(result.answer))
      const effectiveGraph = answerLooksEmpty ? null : (result.explainGraph ?? null)

      const aiMsg: ChatMessageData = {
        id: aiMsgId,
        type: 'ai',
        content: result.answer,
        context: result.context,
        explainGraph: effectiveGraph,
        sourceMap: result.sourceMap,
        queryId: result.queryId,
        feedback: null,
        isStreaming: false,
        timestamp: new Date().toISOString(),
      }

      const withUser = this.messages.filter(m => m.id !== aiMsgId)
      this.messages = [...withUser, aiMsg]
      this.isProcessing = false
      this.isStreaming = false
      this.persistMessages(currentId, this.messages)
      this.refresh()

      this.dispatchEvent(new CustomEvent('falkordb-chat-response', {
        bubbles: true, composed: true,
        detail: { message: aiMsg, graph: effectiveGraph }
      }))
    }

    try {
      await this.config.onQuery(text, history, respond, streamToken, this.abortController.signal, this.strategy)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const errMsg: ChatMessageData = {
        id: aiMsgId, type: 'ai',
        content: `Failed to process query: ${(err as Error).message}`,
        isStreaming: false, timestamp: new Date().toISOString(),
      }
      this.messages = [...this.messages.filter(m => m.id !== aiMsgId), errMsg]
      this.isProcessing = false
      this.isStreaming = false
      this.refresh()
    }
  }

  private handleStop() {
    this.abortController?.abort()
    this.isProcessing = false
    this.isStreaming = false
    const streamingIdx = this.messages.findIndex(m => m.isStreaming)
    if (streamingIdx >= 0) {
      this.messages[streamingIdx] = {
        ...this.messages[streamingIdx],
        isStreaming: false,
        content: this.messages[streamingIdx].content || 'Generation stopped.',
      }
      if (this.conversationId) this.persistMessages(this.conversationId, this.messages)
    }
    this.refresh()
  }

  private handleNewChat() {
    this.conversationId = null
    this.messages = []
    this.isProcessing = false
    this.isStreaming = false
    setActiveId(null, this.namespace)
    this.config?.onNewChat?.()
    this.refresh()
  }
}

if (!customElements.get('falkordb-chat')) {
  customElements.define('falkordb-chat', FalkorDBChat)
}
