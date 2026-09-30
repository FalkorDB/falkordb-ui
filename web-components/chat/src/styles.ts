// src/web-components/chat/styles.ts

export const CHAT_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    --fc-primary: #7c3aed;
    --fc-primary-10: rgba(124,58,237,0.10);
    --fc-primary-20: rgba(124,58,237,0.20);
    --fc-primary-30: rgba(124,58,237,0.30);
    --fc-background: #ffffff;
    --fc-foreground: #0f0f0f;
    --fc-muted: #6b7280;
    --fc-muted-50: rgba(107,114,128,0.50);
    --fc-border: #e5e7eb;
    --fc-border-40: rgba(229,231,235,0.40);
    --fc-card: #f9fafb;
    --fc-accent: #f3f4f6;
    --fc-radius: 12px;
    --fc-destructive: #ef4444;
    --fc-green: #22c55e;
    --fc-blue: #3b82f6;
    --fc-amber: #f59e0b;
    --fc-purple: #a855f7;
    font-family: inherit;
    font-size: 14px;
    color: var(--fc-foreground);
    background: var(--fc-background);
    box-sizing: border-box;
  }

  *, *::before, *::after { box-sizing: inherit; }

  .fc-conversation {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 1rem;
    scroll-behavior: smooth;
  }

  .fc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 1rem;
    text-align: center;
    gap: 0.5rem;
  }
  .fc-empty-label { font-size: 0.75rem; color: var(--fc-muted); font-weight: 500; }
  .fc-empty-title { font-size: 1.25rem; font-weight: 600; margin: 0; }
  .fc-empty-subtitle { font-size: 0.875rem; color: var(--fc-muted); max-width: 24rem; margin: 0; }

  .fc-suggestions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    max-width: 32rem;
    width: 100%;
    margin-top: 2rem;
  }
  .fc-suggestion-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    border-radius: var(--fc-radius);
    border: 1px solid var(--fc-border);
    background: var(--fc-card);
    padding: 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .fc-suggestion-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1); transform: translateY(-2px); }
  .fc-suggestion-card:disabled { opacity: 0.5; pointer-events: none; }
  .fc-suggestion-icon {
    display: flex; align-items: center; justify-content: center;
    width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; flex-shrink: 0;
    transition: transform 0.2s;
  }
  .fc-suggestion-card:hover .fc-suggestion-icon { transform: scale(1.1); }
  .fc-suggestion-title { font-size: 0.875rem; font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .fc-suggestion-question { font-size: 0.75rem; color: var(--fc-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .fc-suggestion-arrow { font-size: 0.875rem; color: var(--fc-muted); opacity: 0; margin-left: auto; flex-shrink: 0; transition: all 0.2s; }
  .fc-suggestion-card:hover .fc-suggestion-arrow { opacity: 0.5; }

  .fc-cat-connection .fc-suggestion-icon { background: rgba(59,130,246,0.10); color: #3b82f6; }
  .fc-cat-comparison .fc-suggestion-icon { background: rgba(245,158,11,0.10); color: #f59e0b; }
  .fc-cat-deep-dive  .fc-suggestion-icon { background: rgba(168,85,247,0.10); color: #a855f7; }
  .fc-cat-overview   .fc-suggestion-icon { background: var(--fc-primary-10); color: var(--fc-primary); }

  .fc-messages { display: flex; flex-direction: column; gap: 1.5rem; max-width: 48rem; margin: 0 auto; }

  .fc-msg-user { display: flex; justify-content: flex-end; }
  .fc-msg-user-bubble {
    background: var(--fc-primary-10); border: 1px solid var(--fc-primary-20);
    border-radius: var(--fc-radius); padding: 0.625rem 1rem;
    max-width: 80%; font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap;
  }

  .fc-msg-ai { display: flex; flex-direction: column; }
  .fc-msg-ai-content {
    border-left: 2px solid var(--fc-primary-30);
    padding-left: 1rem;
    font-size: 0.875rem; line-height: 1.7;
  }
  .fc-msg-ai-content p { margin: 0 0 0.5rem; }
  .fc-msg-ai-content p:last-child { margin-bottom: 0; }
  .fc-msg-ai-content h1, .fc-msg-ai-content h2, .fc-msg-ai-content h3 { margin: 0.75rem 0 0.25rem; font-weight: 600; }
  .fc-msg-ai-content ul { margin: 0.25rem 0; padding-left: 1.25rem; }
  .fc-msg-ai-content li { margin: 0.125rem 0; }
  .fc-msg-ai-content code { font-family: monospace; font-size: 0.8em; background: var(--fc-accent); padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
  .fc-msg-ai-content pre { background: var(--fc-accent); padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.5rem 0; }
  .fc-msg-ai-content pre code { background: none; padding: 0; }
  .fc-msg-ai-content a { color: var(--fc-primary); }

  .fc-cursor { display: inline-block; width: 0.5rem; height: 1rem; background: var(--fc-primary); opacity: 0.7; border-radius: 2px; margin-left: 2px; vertical-align: text-bottom; animation: fc-blink 1s step-end infinite; }
  @keyframes fc-blink { 0%,100%{opacity:.7} 50%{opacity:0} }

  button.fc-entity-link { color: var(--fc-primary); font-weight: 500; text-decoration: underline; text-underline-offset: 2px; background: none; border: none; cursor: pointer; font-size: inherit; padding: 0; }
  button.fc-source-link { display: inline-flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700; color: var(--fc-primary); background: var(--fc-primary-10); border: none; border-radius: 0.25rem; padding: 0 0.25rem; min-width: 1.25rem; cursor: pointer; vertical-align: super; line-height: 1.4; }

  .fc-msg-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 0.375rem; padding-left: 1rem; opacity: 0; transition: opacity 0.15s;
  }
  .fc-msg-ai:hover .fc-msg-toolbar { opacity: 1; }
  .fc-toolbar-left { display: flex; align-items: center; gap: 0.5rem; }
  .fc-toolbar-btn {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.125rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem;
    color: var(--fc-muted); background: none; border: none; cursor: pointer; transition: all 0.15s;
  }
  .fc-toolbar-btn:hover { color: var(--fc-foreground); background: var(--fc-accent); }
  .fc-toolbar-btn.fc-bookmarked { color: var(--fc-primary); opacity: 1; }
  .fc-toolbar-timestamp { font-size: 0.6875rem; color: var(--fc-muted-50); }
  .fc-feedback-wrap { display: inline-flex; align-items: center; border: 1px solid var(--fc-border); border-radius: 0.5rem; padding: 0.125rem; }
  .fc-feedback-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;
    background: none; border: none; cursor: pointer; color: var(--fc-muted); transition: all 0.15s;
  }
  .fc-feedback-btn:hover.fc-thumb-up   { color: var(--fc-green); background: rgba(34,197,94,0.1); }
  .fc-feedback-btn:hover.fc-thumb-down { color: var(--fc-destructive); background: rgba(239,68,68,0.1); }
  .fc-feedback-btn.fc-active-up   { color: var(--fc-green); background: rgba(34,197,94,0.15); }
  .fc-feedback-btn.fc-active-down { color: var(--fc-destructive); background: rgba(239,68,68,0.15); }

  .fc-sources { margin-top: 0.5rem; padding-left: 1rem; }
  .fc-sources-toggle { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 500; color: var(--fc-primary); background: none; border: none; cursor: pointer; padding: 0; }
  .fc-sources-toggle svg { transition: transform 0.2s; }
  .fc-sources-toggle.fc-open svg { transform: rotate(180deg); }
  .fc-sources-body { margin-top: 0.5rem; max-width: 32rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .fc-source-section-label { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; }
  .fc-source-section-text { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .fc-source-section-line { flex: 1; height: 1px; }
  .fc-source-card {
    width: 100%; text-align: left; border-radius: 0.5rem; border: 1px solid var(--fc-border);
    padding: 0.5rem 0.75rem; cursor: pointer; background: var(--fc-accent); transition: all 0.15s;
    font-size: inherit;
  }
  .fc-source-card:hover { background: var(--fc-card); }
  .fc-source-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
  .fc-source-badge { font-size: 0.625rem; font-weight: 700; border-radius: 0.25rem; border: 1px solid; padding: 0.125rem 0.375rem; display: inline-flex; align-items: center; gap: 0.25rem; }
  .fc-source-idx { font-size: 0.625rem; font-family: monospace; color: var(--fc-muted-50); }
  .fc-source-content { font-size: 0.75rem; color: var(--fc-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; }
  .fc-source-doc { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.375rem; font-size: 0.625rem; color: var(--fc-muted-50); }

  .fc-sect-entity .fc-source-section-text  { color: var(--fc-green); }
  .fc-sect-entity .fc-source-section-line  { background: rgba(34,197,94,0.2); }
  .fc-sect-entity .fc-source-badge         { color: var(--fc-green); border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); }
  .fc-sect-rel    .fc-source-section-text  { color: var(--fc-blue); }
  .fc-sect-rel    .fc-source-section-line  { background: rgba(59,130,246,0.2); }
  .fc-sect-rel    .fc-source-badge         { color: var(--fc-blue); border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); }
  .fc-sect-passage .fc-source-section-text { color: var(--fc-amber); }
  .fc-sect-passage .fc-source-section-line { background: rgba(245,158,11,0.2); }
  .fc-sect-passage .fc-source-badge        { color: var(--fc-amber); border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.1); }

  .fc-bottom { padding: 1rem; background: var(--fc-background); }
  .fc-input-row { display: flex; align-items: center; gap: 0.5rem; max-width: 48rem; margin: 0 auto; }
  .fc-new-chat-btn {
    display: flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; border-radius: var(--fc-radius); flex-shrink: 0;
    border: 1px solid var(--fc-border); background: var(--fc-background); cursor: pointer; color: var(--fc-muted);
    transition: all 0.15s;
  }
  .fc-new-chat-btn:hover { color: var(--fc-foreground); background: var(--fc-accent); }

  .fc-query-wrap { flex: 1; border: 1px solid var(--fc-border); border-radius: var(--fc-radius); background: var(--fc-background); overflow: hidden; }
  .fc-query-inner { display: flex; align-items: flex-end; padding: 0.375rem 0.5rem; gap: 0.25rem; }
  .fc-query-textarea {
    flex: 1; resize: none; border: none; outline: none; background: transparent;
    font-family: inherit; font-size: 0.875rem; color: var(--fc-foreground);
    max-height: 8rem; min-height: 2rem; line-height: 1.5; padding: 0.25rem 0.25rem;
  }
  .fc-query-textarea::placeholder { color: var(--fc-muted); }
  .fc-query-textarea:disabled { opacity: 0.5; }
  .fc-action-btn {
    display: flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem; border-radius: 0.5rem; border: none;
    cursor: pointer; flex-shrink: 0; transition: all 0.15s;
  }
  .fc-send-btn { background: var(--fc-primary); color: white; }
  .fc-send-btn:hover { opacity: 0.9; }
  .fc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .fc-stop-btn { background: var(--fc-destructive); color: white; }
  .fc-stop-btn:hover { opacity: 0.9; }
  .fc-strategy-btn { background: none; color: var(--fc-muted); }
  .fc-strategy-btn:hover { color: var(--fc-foreground); background: var(--fc-accent); }

  .fc-popover {
    position: absolute; bottom: calc(100% + 0.5rem); right: 0;
    background: var(--fc-background); border: 1px solid var(--fc-border);
    border-radius: var(--fc-radius); padding: 0.5rem; min-width: 14rem; z-index: 50;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    display: none;
  }
  .fc-popover.fc-open { display: block; }
  .fc-popover-label { font-size: 0.75rem; font-weight: 600; color: var(--fc-muted); padding: 0 0.25rem; margin-bottom: 0.25rem; }
  .fc-strategy-option {
    display: flex; flex-direction: column; align-items: flex-start;
    width: 100%; border-radius: 0.375rem; padding: 0.375rem 0.5rem;
    border: none; cursor: pointer; background: none; transition: all 0.15s; text-align: left;
  }
  .fc-strategy-option:hover { background: var(--fc-accent); }
  .fc-strategy-option.fc-active { background: var(--fc-primary-10); color: var(--fc-primary); }
  .fc-strategy-name { font-size: 0.75rem; font-weight: 500; }
  .fc-strategy-desc { font-size: 0.625rem; color: var(--fc-muted); }

  .fc-scroll-btn {
    position: absolute; bottom: 5rem; left: 50%; transform: translateX(-50%);
    background: var(--fc-background); border: 1px solid var(--fc-border);
    border-radius: 9999px; padding: 0.375rem 0.75rem; font-size: 0.75rem;
    color: var(--fc-muted); cursor: pointer; display: none; z-index: 10;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: all 0.15s;
  }
  .fc-scroll-btn.fc-visible { display: block; }
  .fc-scroll-btn:hover { color: var(--fc-foreground); }

  svg { display: inline-block; vertical-align: middle; }
`
