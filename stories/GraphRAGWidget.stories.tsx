import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import type { WidgetConfig } from '../web-components/graphrag-widget/src'

// The widget ships its own Preact runtime, which clashes with Storybook's
// React if loaded in the same document. Render it inside an iframe so its
// JS world is fully isolated from the Storybook preview.
//
// The iframe loads the built IIFE bundle (served as a Storybook static
// asset at /graphrag-widget/falkordb-chat.iife.js), so you must run
// `npm run build --workspace=@falkordb/graphrag-widget` at least once
// before these stories render.

function WidgetWrapper(props: WidgetConfig) {
  const attrs = [
    `src="/graphrag-widget/falkordb-chat.iife.js"`,
    `data-api="${props.api ?? ''}"`,
    `data-graph="${props.graph ?? 'falkordb-docs'}"`,
    `data-title="${props.title ?? 'FalkorDB'}"`,
    `data-accent="${props.accent ?? '#22C55E'}"`,
    `data-position="${props.position ?? 'bottom-right'}"`,
    `data-suggestions="${props.suggestions === false ? 'false' : 'true'}"`,
  ].join(' ')

  const srcDoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; height: 100%; background: #f8fafc; font-family: system-ui, sans-serif; }
      .note { padding: 1.5rem; color: #475569; font-size: 14px; line-height: 1.5; }
      .note code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="note">
      <strong>GraphRAG Widget mounted.</strong>
      <p>The chat bubble is in the ${props.position ?? 'bottom-right'} corner of this frame. Click it to open.</p>
      <p style="color:#94a3b8">Live answers require <code>api</code> to point at a running <a href="https://github.com/FalkorDB/GraphRAG-UI" target="_blank" rel="noreferrer">GraphRAG-UI</a> server with <code>WIDGET_ALLOWED_ORIGINS</code> allowing this origin.</p>
    </div>
    <script ${attrs}></script>
  </body>
</html>`

  return (
    <iframe
      title="GraphRAG Widget preview"
      srcDoc={srcDoc}
      style={{
        width: '100%',
        height: '600px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        background: '#f8fafc',
      }}
    />
  )
}

const meta: Meta<WidgetConfig> = {
  title: 'Web Components/GraphRAG Widget',
  component: WidgetWrapper,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Embeddable chat widget powered by FalkorDB GraphRAG. Published as `@falkordb/graphrag-widget` — drop a single `<script>` tag on any site to add an AI assistant backed by a pre-ingested knowledge graph. Rendered inside an iframe here because the widget ships its own Preact runtime; build the workspace first so Storybook can serve the bundle.',
      },
    },
  },
  argTypes: {
    api: { control: 'text', description: 'GraphRAG-UI server URL' },
    graph: { control: 'text', description: 'Predefined graph id' },
    title: { control: 'text' },
    accent: { control: 'color' },
    position: {
      control: 'radio',
      options: ['bottom-right', 'bottom-left'],
    },
    suggestions: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<WidgetConfig>

export const Default: Story = {
  args: {
    api: 'http://localhost:8000',
    graph: 'falkordb-docs',
    title: 'FalkorDB',
    accent: "#101110",
    position: 'bottom-right',
    suggestions: true,
  },
}

export const BottomLeft: Story = {
  args: {
    ...Default.args!,
    position: 'bottom-left',
  },
}

export const NoSuggestions: Story = {
  args: {
    ...Default.args!,
    suggestions: false,
  },
}

export const CustomAccent: Story = {
  args: {
    ...Default.args!,
    title: 'Docs Assistant',
    accent: '#6366F1',
  },
}
