import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useRef } from 'react'
import '../web-components/chat/src/index.ts'

// Teach TypeScript about the custom element in JSX
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'falkordb-chat': React.HTMLAttributes<HTMLElement> & {
        ref?: React.RefObject<HTMLElement>
        'user-name'?: string
        namespace?: string
        placeholder?: string
        'read-only'?: boolean
      }
    }
  }
}

const SUGGESTIONS = [
  { title: 'Who knows who?', question: 'Find all connections between people in the graph', category: 'connection' as const },
  { title: 'Compare entities', question: 'Compare the two most connected entities', category: 'comparison' as const },
  { title: 'Deep dive', question: 'Give me a detailed breakdown of the main topic', category: 'deep-dive' as const },
  { title: 'Overview', question: 'Summarize the entire knowledge graph', category: 'overview' as const },
]

function simulateQuery(
  question: string,
  respond: (r: { answer: string; queryId?: string; context?: unknown[] }) => void,
  streamToken?: (t: string) => void,
) {
  const fullAnswer =
    `Here's what I found about **"${question}"**:\n\n` +
    `The knowledge graph contains several interesting connections. ` +
    `You can explore entities like **Person A** and **TechCorp**, ` +
    `which are linked through various relationships.\n\n` +
    `- Entity one: a key node in the graph\n` +
    `- Entity two: connected to 12 other nodes\n\n` +
    `Use the suggestion cards to explore more, or type your own question.`

  const words = fullAnswer.split(' ')
  let accumulated = ''
  let i = 0

  const tick = () => {
    if (i >= words.length) {
      respond({
        answer: accumulated,
        queryId: `story-${Date.now()}`,
        context: [
          { content: 'Person A is a software engineer at TechCorp.', score: 0.95, metadata: { section: 'entity' } },
          { content: 'Person A → WORKS_AT → TechCorp (since 2020)', score: 0.88, metadata: { section: 'relationship' } },
          { content: 'TechCorp was founded in 2015 and focuses on AI solutions.', score: 0.75, metadata: { section: 'passage', source_doc: 'company-profile.pdf' } },
        ],
      })
      return
    }
    accumulated += (accumulated ? ' ' : '') + words[i++]
    streamToken?.(accumulated)
    setTimeout(tick, 50)
  }
  setTimeout(tick, 50)
}

// ── Wrapper component ──────────────────────────────────────────────────────

interface ChatStoryProps {
  userName?: string
  namespace?: string
  placeholder?: string
  readOnly?: boolean
  withSuggestions?: boolean
  withSources?: boolean
}

function ChatWrapper({ userName, namespace, placeholder, readOnly, withSuggestions, withSources }: ChatStoryProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current as HTMLElement & {
      setConfig: (c: unknown) => void
      setSuggestions: (s: unknown) => void
    }
    if (!el) return

    if (withSuggestions) el.setSuggestions(SUGGESTIONS)

    el.setConfig({
      userName,
      onQuery: (_question: string, _history: unknown, respond: (r: unknown) => void, streamToken?: (t: string) => void) => {
        if (withSources) {
          simulateQuery(_question, respond as (r: { answer: string; queryId?: string; context?: unknown[] }) => void, streamToken)
        } else {
          const words = `This is a simulated response to: "${_question}". The component is working correctly.`.split(' ')
          let accumulated = ''
          let i = 0
          const tick = () => {
            if (i >= words.length) {
              respond({ answer: accumulated, queryId: `story-${Date.now()}` })
              return
            }
            accumulated += (accumulated ? ' ' : '') + words[i++]
            streamToken?.(accumulated)
            setTimeout(tick, 50)
          }
          setTimeout(tick, 50)
        }
      },
      onFeedback: (queryId: string, rating: string) => console.log('Feedback:', queryId, rating),
      onNewChat: () => console.log('New chat'),
      onStrategyChange: (strategy: string | null) => console.log('Strategy:', strategy),
      strategyOptions: [
        { value: 'multi_path', label: 'Deep Search', description: 'Comprehensive search across the full graph' },
        { value: 'local', label: 'Fast', description: 'Quick answers from nearby context' },
        { value: null, label: 'Auto', description: 'Let the system choose the best approach' },
      ],
    })
  }, [userName, namespace, withSuggestions, withSources])

  return (
    <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
      <falkordb-chat
        ref={ref as React.RefObject<HTMLElement>}
        user-name={userName}
        namespace={namespace || 'storybook'}
        placeholder={placeholder}
        {...(readOnly ? { 'read-only': true } : {})}
      />
    </div>
  )
}

// ── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<ChatStoryProps> = {
  title: 'Web Components/Chat',
  component: ChatWrapper,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    userName: { control: 'text', name: 'user-name' },
    placeholder: { control: 'text' },
    readOnly: { control: 'boolean' },
    withSuggestions: { control: 'boolean' },
    withSources: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<ChatStoryProps>

// ── Stories ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    userName: '',
    withSuggestions: false,
    withSources: false,
  },
}

export const WithUserName: Story = {
  args: {
    userName: 'Naseem',
    withSuggestions: false,
    withSources: false,
  },
}

export const WithSuggestions: Story = {
  args: {
    userName: 'Naseem',
    withSuggestions: true,
    withSources: false,
  },
}

export const WithSourcesPanel: Story = {
  args: {
    userName: 'Naseem',
    withSuggestions: true,
    withSources: true,
  },
}

export const ReadOnly: Story = {
  args: {
    userName: 'Naseem',
    readOnly: true,
    withSuggestions: true,
    withSources: false,
  },
}

export const CustomPlaceholder: Story = {
  args: {
    userName: '',
    placeholder: 'Ask about your FalkorDB graph...',
    withSuggestions: false,
    withSources: false,
  },
}

// ── QueryWeaver demo ──────────────────────────────────────────────────────
// Shows how the same <falkordb-chat> web component can serve a completely
// different product (text-to-SQL) via messageRenderers + config toggles.

const QW_SUGGESTIONS = [
  { title: 'Show customers', question: 'Show me five customers', category: 'overview' as const },
  { title: 'Top by revenue', question: 'Show me the top customers by revenue', category: 'deep-dive' as const },
  { title: 'Pending orders', question: 'What are the pending orders?', category: 'connection' as const },
]

// Simulated database rows for demo
const MOCK_ROWS = [
  { id: 1, name: 'Acme Corp', revenue: '$1,200,000', status: 'Active' },
  { id: 2, name: 'Globex Inc', revenue: '$980,000', status: 'Active' },
  { id: 3, name: 'Initech', revenue: '$750,000', status: 'Pending' },
  { id: 4, name: 'Umbrella Co', revenue: '$620,000', status: 'Active' },
  { id: 5, name: 'Stark Industries', revenue: '$3,400,000', status: 'Active' },
]

function QueryWeaverWrapper() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current as HTMLElement & {
      setConfig: (c: unknown) => void
      setSuggestions: (s: unknown) => void
      addMessage: (m: unknown) => void
    }
    if (!el) return

    el.setSuggestions(QW_SUGGESTIONS)

    el.setConfig({
      // No strategyOptions → strategy button hidden automatically
      hideBookmarks: true,
      hideFeedback: true,
      hideSources: true,
      emptyStateLabel: 'Your database assistant',
      emptyStateSubtitle: 'Ask questions about your data in plain English',

      messageRenderers: {
        'sql-query': (msg: { content: string; data?: Record<string, unknown> }, { escapeHtml }: { escapeHtml: (s: string) => string }) => {
          const div = document.createElement('div')
          div.style.cssText = 'padding:0.5rem 1.5rem;'
          const conf = msg.data?.confidence as number | undefined
          div.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
              <span style="font-weight:600;color:var(--fc-primary);font-size:0.875rem;">Generated SQL</span>
              ${conf ? `<span style="font-size:0.75rem;color:var(--fc-muted);">Confidence: ${Math.round(conf * 100)}%</span>` : ''}
            </div>
            <pre style="background:var(--fc-accent);padding:0.75rem;border-radius:0.5rem;overflow-x:auto;font-size:0.8rem;margin:0;"><code>${escapeHtml(msg.content)}</code></pre>
          `
          return div
        },

        'query-result': (msg: { data?: Record<string, unknown> }, { escapeHtml }: { escapeHtml: (s: string) => string }) => {
          const rows = (msg.data?.rows as Record<string, unknown>[]) || []
          const div = document.createElement('div')
          div.style.cssText = 'padding:0.5rem 1.5rem;'
          if (rows.length === 0) {
            div.innerHTML = '<p style="color:var(--fc-muted);">No results</p>'
            return div
          }
          const cols = Object.keys(rows[0])
          div.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
              <span style="font-weight:600;color:var(--fc-green);font-size:0.875rem;">Query Results</span>
              <span style="font-size:0.75rem;color:var(--fc-muted);">${rows.length} row${rows.length !== 1 ? 's' : ''}</span>
            </div>
            <div style="overflow-x:auto;border:1px solid var(--fc-border);border-radius:0.5rem;">
              <table style="width:100%;font-size:0.8rem;border-collapse:collapse;">
                <thead>
                  <tr>${cols.map(c => `<th style="text-align:left;padding:0.5rem 0.75rem;border-bottom:1px solid var(--fc-border);font-weight:600;color:var(--fc-muted);">${escapeHtml(c)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${rows.map(row => `<tr style="border-bottom:1px solid var(--fc-border);">${cols.map(c => `<td style="padding:0.5rem 0.75rem;">${escapeHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          `
          return div
        },

        'confirmation': (msg: { id: string; content: string; data?: Record<string, unknown> }, { escapeHtml, host }: { escapeHtml: (s: string) => string; host: HTMLElement }) => {
          const div = document.createElement('div')
          div.style.cssText = 'padding:0.5rem 1.5rem;'
          const op = ((msg.data?.operationType as string) || 'UNKNOWN').toUpperCase()
          div.innerHTML = `
            <div style="border:1px solid var(--fc-destructive);border-radius:var(--fc-radius);padding:1rem;background:rgba(239,68,68,0.05);">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                <span style="font-size:1.25rem;">⚠️</span>
                <span style="font-weight:600;color:var(--fc-destructive);">Destructive Operation — ${escapeHtml(op)}</span>
              </div>
              <pre style="background:var(--fc-accent);padding:0.75rem;border-radius:0.5rem;font-size:0.8rem;margin:0 0 0.75rem;">${escapeHtml(String(msg.data?.sqlQuery || msg.content))}</pre>
              <div style="display:flex;gap:0.5rem;">
                <button class="fc-cancel-btn" style="flex:1;padding:0.5rem;border:1px solid var(--fc-border);border-radius:0.5rem;background:var(--fc-background);cursor:pointer;font-size:0.8rem;">Cancel</button>
                <button class="fc-confirm-btn" style="flex:1;padding:0.5rem;border:none;border-radius:0.5rem;background:var(--fc-destructive);color:white;font-weight:600;cursor:pointer;font-size:0.8rem;">Confirm ${escapeHtml(op)}</button>
              </div>
            </div>
          `
          div.querySelector('.fc-confirm-btn')?.addEventListener('click', () => {
            host.dispatchEvent(new CustomEvent('falkordb-chat-confirm', {
              bubbles: true, composed: true, detail: { messageId: msg.id, data: msg.data },
            }))
          })
          div.querySelector('.fc-cancel-btn')?.addEventListener('click', () => {
            host.dispatchEvent(new CustomEvent('falkordb-chat-cancel', {
              bubbles: true, composed: true, detail: { messageId: msg.id },
            }))
          })
          return div
        },
      },

      onQuery: (
        question: string,
        _history: unknown,
        respond: (r: { answer: string }) => void,
        _streamToken?: (t: string) => void,
      ) => {
        // Simulate QueryWeaver-style streaming: reasoning → SQL → results → answer
        const isDestructive = /delete|drop|truncate|update/i.test(question)
        const sqlQuery = isDestructive
          ? `DELETE FROM customers WHERE status = 'Inactive';`
          : `SELECT id, name, revenue, status\nFROM customers\nORDER BY revenue DESC\nLIMIT 5;`

        // Step 1: reasoning step
        setTimeout(() => {
          el.addMessage({
            id: `step-${Date.now()}`,
            type: 'ai',
            content: `Analyzing your question: "${question}"...`,
            timestamp: new Date().toISOString(),
          })
        }, 300)

        // Step 2: SQL query
        setTimeout(() => {
          el.addMessage({
            id: `sql-${Date.now()}`,
            type: 'sql-query',
            content: sqlQuery,
            timestamp: new Date().toISOString(),
            data: { confidence: isDestructive ? 0.85 : 0.95 },
          })
        }, 800)

        if (isDestructive) {
          // Step 3a: confirmation for destructive ops
          setTimeout(() => {
            el.addMessage({
              id: `confirm-${Date.now()}`,
              type: 'confirmation',
              content: 'This operation will delete rows from the customers table.',
              timestamp: new Date().toISOString(),
              data: { sqlQuery, operationType: 'DELETE' },
            })
          }, 1200)
          // Still need to respond to finalize
          setTimeout(() => {
            respond({ answer: 'Awaiting your confirmation before executing the destructive operation.' })
          }, 1400)
        } else {
          // Step 3b: query results
          setTimeout(() => {
            el.addMessage({
              id: `result-${Date.now()}`,
              type: 'query-result',
              content: 'Query Results',
              timestamp: new Date().toISOString(),
              data: { rows: MOCK_ROWS },
            })
          }, 1200)

          // Step 4: final answer
          setTimeout(() => {
            respond({
              answer: `Here are the top 5 customers by revenue. **Stark Industries** leads with $3.4M, followed by **Acme Corp** at $1.2M. Most customers have an Active status.`,
            })
          }, 1600)
        }
      },
    })
  }, [])

  return (
    <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
      <falkordb-chat
        ref={ref as React.RefObject<HTMLElement>}
        user-name="Naseem"
        namespace="storybook-queryweaver"
        placeholder="Ask me anything about your database..."
      />
    </div>
  )
}

export const QueryWeaverMode: Story = {
  render: () => <QueryWeaverWrapper />,
  parameters: {
    docs: {
      description: {
        story: 'Same `<falkordb-chat>` component configured for QueryWeaver: text-to-SQL with custom message renderers for SQL blocks, table results, and destructive operation confirmations. Strategy, bookmarks, feedback, and sources are all hidden.',
      },
    },
  },
}
