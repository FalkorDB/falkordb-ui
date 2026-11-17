# Chat

Building blocks for a chat panel: a header, a scrolling conversation, an input row and a status footer.

[Storybook](https://falkordb.github.io/falkordb-ui/?path=/docs/patterns-chat--docs) · [Source](../../src/components/chat.tsx)

## Import

```tsx
import {
	Chat,
	ChatAvatar,
	ChatFooter,
	ChatHeader,
	ChatInput,
	ChatInputField,
	ChatMessage,
	ChatMessages,
	ChatSendButton,
	ChatTitle,
} from "@falkordb/ui";
```

## Usage

```tsx
<Chat className="h-[600px]">
	<ChatHeader>
		<ChatTitle>Ask your graph</ChatTitle>
	</ChatHeader>
	<ChatMessages>
		{messages.map((message) => (
			<ChatMessage
				key={message.id}
				from={message.role}
				variant={message.failed ? "error" : "default"}
				avatar={message.role === "assistant" ? <ChatAvatar>AI</ChatAvatar> : undefined}
			>
				{message.text}
			</ChatMessage>
		))}
	</ChatMessages>
	<ChatInput
		onSubmit={(event) => {
			event.preventDefault();
			send(draft);
		}}
	>
		<ChatInputField
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			placeholder="Ask a question"
		/>
		<ChatSendButton canSend={draft.trim() !== ""} isLoading={sending} />
	</ChatInput>
	<ChatFooter>gpt-4o · 1,204 tokens</ChatFooter>
</Chat>
```

## Parts

| Part             | Element  | Description                                                                  |
| ---------------- | -------- | ---------------------------------------------------------------------------- |
| `Chat`           | `div`    | Full-height column holding the rest. Give it a height.                       |
| `ChatHeader`     | `div`    | The top row.                                                                 |
| `ChatTitle`      | `h2`     | The panel's heading.                                                         |
| `ChatMessages`   | `ul`     | The scrolling conversation, oldest first. See [Scrolling](#scrolling).       |
| `ChatMessage`    | `li`     | One message bubble. See [`ChatMessage` props](#chatmessage-props).           |
| `ChatAvatar`     | `span`   | A round avatar, for initials or an image.                                    |
| `ChatInput`      | `form`   | The input row. Pressing Enter submits it; handle `onSubmit`.                 |
| `ChatInputField` | `input`  | An [Input](./input.md) sized for the row.                                    |
| `ChatSendButton` | `button` | The submit button. See [`ChatSendButton` props](#chatsendbutton-props).      |
| `ChatFooter`     | `div`    | The status row under the input, for example token usage or the model in use. |

### `ChatMessage` props

Accepts every `<li>` attribute, plus:

| Prop              | Type                    | Default     | Description                                                               |
| ----------------- | ----------------------- | ----------- | ------------------------------------------------------------------------- |
| `from`            | `"user" \| "assistant"` | —           | Required. User messages sit on the right, assistant messages on the left. |
| `avatar`          | `ReactNode`             | —           | Shown beside the bubble, on the outer side.                               |
| `variant`         | `"default" \| "error"`  | `"default"` | `error` outlines the bubble in the destructive colour.                    |
| `bubbleClassName` | `string`                | —           | Classes for the bubble; `className` styles the row.                       |

### `ChatSendButton` props

Accepts the [Button](./button.md) props, plus:

| Prop        | Type      | Default | Description                                                    |
| ----------- | --------- | ------- | -------------------------------------------------------------- |
| `canSend`   | `boolean` | `true`  | Whether there is anything to send. Disables the button if not. |
| `isLoading` | `boolean` | `false` | Shows a spinner and disables the button while a send runs.     |

The default icon is a paper plane; pass children to replace it. Its label is "Send", or "Type a message to send" while there is nothing to send; set `title` to change it.

## Scrolling

`ChatMessages` stays scrolled to the newest message as messages arrive. If the reader scrolls up more than 24px to read something earlier, it stops following until they scroll back to the bottom.

## Accessibility

`ChatMessages` has `role="log"` and `aria-live="polite"`, so screen readers announce new messages without interrupting.
