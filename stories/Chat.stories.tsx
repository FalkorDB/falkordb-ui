import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useRef } from 'react'
import '../src/web-components/chat/index.ts'

// Teach TypeScript about the custom element in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'falkordb-chat': React.HTMLAttributes<HTMLElement> & {
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
