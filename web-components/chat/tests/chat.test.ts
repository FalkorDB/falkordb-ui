import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import '../src/index'
import type { FalkorDBChat } from '../src/chat'
import type { ChatConfig, ChatMessageData, MessageRenderHelpers, QueryResult } from '../src/types'

type OnQuery = ChatConfig['onQuery']
type Respond = (result: QueryResult) => void

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })
})

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
})

function mount(config: Partial<ChatConfig> = {}): FalkorDBChat {
  const chat = document.createElement('falkordb-chat')
  document.body.appendChild(chat)
  chat.setConfig({ onQuery: vi.fn(), ...config })
  return chat
}

const shadow = (chat: FalkorDBChat) => chat.shadowRoot!
const bubbles = (chat: FalkorDBChat, selector: string) =>
  [...shadow(chat).querySelectorAll<HTMLElement>(selector)].map(el => el.textContent?.trim())

/** Send a question and hand back the `respond` callback the host received. */
async function ask(chat: FalkorDBChat, onQuery: ReturnType<typeof vi.fn>, question = 'Who knows who?') {
  chat.sendMessage(question)
  await vi.waitFor(() => expect(onQuery).toHaveBeenCalled())
  const call = onQuery.mock.calls.at(-1)!
  return { respond: call[2] as Respond, signal: call[4] as AbortSignal }
}

describe('<falkordb-chat>', () => {
  it('registers the custom element with header and footer slots', () => {
    const chat = mount()
    expect(customElements.get('falkordb-chat')).toBeDefined()
    expect(shadow(chat).querySelector('slot[name="header"]')).not.toBeNull()
    expect(shadow(chat).querySelector('slot[name="footer"]')).not.toBeNull()
  })

  it('renders the answer the host responds with', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const { respond } = await ask(chat, onQuery)

    respond({ answer: '**Alice** knows Bob' })

    expect(bubbles(chat, '.fc-msg-user-bubble')).toEqual(['Who knows who?'])
    expect(shadow(chat).querySelector('.fc-msg-ai-content strong')?.textContent).toBe('Alice')
  })

  it('adds leading messages before the answer and keeps the answer payload', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const { respond } = await ask(chat, onQuery)

    respond({
      answer: 'Two people',
      data: { confidence: 90 },
      messages: [{ type: 'cypher-query', content: 'MATCH (n) RETURN n' }],
    })

    const messages = chat.getMessages()
    expect(messages.map(m => m.type)).toEqual(['user', 'cypher-query', 'ai'])
    expect(messages[1]).toMatchObject({ content: 'MATCH (n) RETURN n' })
    expect(messages[1]?.id).toBeTruthy()
    expect(messages[1]?.timestamp).toBeTruthy()
    expect(messages[2]?.data).toEqual({ confidence: 90 })
  })

  it('adds no answer bubble for an empty answer when leading messages carry the reply', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const { respond } = await ask(chat, onQuery)

    respond({ answer: '', messages: [{ type: 'cypher-query', content: 'RETURN 1' }] })

    expect(chat.getMessages().map(m => m.type)).toEqual(['user', 'cypher-query'])
  })

  it('renders custom message types through their registered renderer', async () => {
    const onQuery = vi.fn<OnQuery>()
    const renderer = vi.fn((msg: ChatMessageData, _helpers: MessageRenderHelpers) => {
      const el = document.createElement('pre')
      el.className = 'custom-query'
      el.textContent = msg.content
      return el
    })
    const chat = mount({ onQuery, messageRenderers: { 'cypher-query': renderer } })
    const { respond } = await ask(chat, onQuery)

    respond({ answer: '', messages: [{ type: 'cypher-query', content: 'RETURN 1' }] })

    expect(bubbles(chat, '.custom-query')).toEqual(['RETURN 1'])
    expect(renderer.mock.calls[0]?.[1]?.host).toBe(chat)
  })

  it('renders an error answer as an alert', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const { respond } = await ask(chat, onQuery)

    respond({ answer: 'Graph not found', type: 'error' })

    const alert = shadow(chat).querySelector('[role="alert"]')
    expect(alert?.textContent).toBe('Graph not found')
  })

  it('shows a thrown query error as an error bubble', async () => {
    const onQuery = vi.fn<OnQuery>(() => { throw new Error('boom') })
    const chat = mount({ onQuery })
    chat.sendMessage('hi')

    await vi.waitFor(() => expect(shadow(chat).querySelector('.fc-msg-error')).not.toBeNull())
    expect(shadow(chat).querySelector('.fc-msg-error')?.textContent).toContain('boom')
  })

  it('fires falkordb-chat-change with the committed conversation', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const changes: ChatMessageData[][] = []
    chat.addEventListener('falkordb-chat-change', e => changes.push(e.detail.messages))
    const { respond } = await ask(chat, onQuery)

    respond({ answer: 'done' })

    expect(changes.at(-1)?.map(m => m.type)).toEqual(['user', 'ai'])
    // The in-flight placeholder never reaches the host.
    expect(changes.flat().some(m => m.isStreaming)).toBe(false)
  })

  it('leaves localStorage alone when persist is false', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery, persist: false })
    const { respond } = await ask(chat, onQuery)
    respond({ answer: 'done' })
    chat.newChat()

    expect(localStorage.length).toBe(0)
  })

  it('persists conversations to localStorage by default', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const { respond } = await ask(chat, onQuery)
    respond({ answer: 'done' })

    expect(localStorage.getItem('falkordb-chat-convos-default')).toContain('done')
  })

  it('setMessages replaces the conversation and drops the answer still in flight', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery, persist: false })
    const { respond, signal } = await ask(chat, onQuery)

    const loaded: ChatMessageData[] = [
      { id: '1', type: 'user', content: 'earlier question', timestamp: '2026-01-01T00:00:00.000Z' },
    ]
    chat.setMessages(loaded)
    respond({ answer: 'stale answer' })

    expect(signal.aborted).toBe(true)
    expect(chat.getMessages().map(m => m.content)).toEqual(['earlier question'])
    expect(bubbles(chat, '.fc-msg-user-bubble')).toEqual(['earlier question'])
  })

  it('does not send when beforeSend returns false', async () => {
    const onQuery = vi.fn<OnQuery>()
    const beforeSend = vi.fn(async () => false)
    const chat = mount({ onQuery, beforeSend })

    chat.sendMessage('needs a key')
    await vi.waitFor(() => expect(beforeSend).toHaveBeenCalledWith('needs a key'))
    await Promise.resolve()

    expect(onQuery).not.toHaveBeenCalled()
    expect(chat.getMessages()).toHaveLength(0)
  })

  it('sends when beforeSend allows it', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery, beforeSend: () => true })

    chat.sendMessage('go')

    await vi.waitFor(() => expect(onQuery).toHaveBeenCalled())
    expect(onQuery.mock.calls[0]?.[0]).toBe('go')
  })

  it('escapes user text and blocks javascript: links in answers', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    const { respond } = await ask(chat, onQuery, '<img src=x onerror=alert(1)>')

    respond({ answer: '[click](javascript:alert(1))' })

    expect(shadow(chat).querySelector('img')).toBeNull()
    expect(shadow(chat).querySelector('a')).toBeNull()
  })
})

describe('parts', () => {
  it('names the input row and the built-in bubbles', async () => {
    const onQuery = vi.fn<OnQuery>()
    const chat = mount({ onQuery })
    for (const part of ['conversation', 'input', 'send-button', 'stop-button', 'new-chat-button']) {
      expect(shadow(chat).querySelector(`[part~="${part}"]`), part).not.toBeNull()
    }
    const { respond } = await ask(chat, onQuery)
    respond({ answer: 'done' })
    chat.addMessage({ id: 'e', type: 'error', content: 'bad', timestamp: new Date().toISOString() })

    expect(shadow(chat).querySelectorAll('[part~="message-user"]')).toHaveLength(1)
    expect(shadow(chat).querySelectorAll('[part~="message-ai"]')).toHaveLength(1)
    expect(shadow(chat).querySelectorAll('[part~="message-error"]')).toHaveLength(1)
  })
})
