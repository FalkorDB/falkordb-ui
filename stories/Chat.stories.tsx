import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";
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
} from "@/components/chat";

const meta = {
	title: "Patterns/Chat",
	component: Chat,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="h-[520px] max-w-md rounded-lg border border-border bg-background p-2">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

type Message = { id: number; from: "user" | "assistant"; text: string; error?: boolean };

const userAvatar = <ChatAvatar className="bg-primary text-primary-foreground">U</ChatAvatar>;
const assistantAvatar = <ChatAvatar className="bg-secondary font-semibold">F</ChatAvatar>;

function Demo({ initial }: { initial: Message[] }) {
	const [messages, setMessages] = useState(initial);
	const [text, setText] = useState("");
	const [sending, setSending] = useState(false);

	return (
		<Chat>
			<ChatHeader>
				<ChatTitle>
					Chat <Sparkles className="size-5" />
				</ChatTitle>
				<Button variant="none" size="none" className="p-1" tooltip="Close">
					<X className="size-4" />
				</Button>
			</ChatHeader>
			<ChatMessages>
				{messages.map((message) => (
					<ChatMessage
						key={message.id}
						from={message.from}
						variant={message.error ? "error" : "default"}
						avatar={message.from === "user" ? userAvatar : assistantAvatar}
					>
						{message.text}
					</ChatMessage>
				))}
			</ChatMessages>
			<ChatFooter>
				<span>Token usage · 1,204</span>
				<span>OpenAI · gpt-4o</span>
			</ChatFooter>
			<ChatInput
				onSubmit={(event) => {
					event.preventDefault();
					const question = text.trim();
					if (!question) return;
					setMessages((prev) => [...prev, { id: Date.now(), from: "user", text: question }]);
					setText("");
					setSending(true);
					setTimeout(() => {
						setMessages((prev) => [
							...prev,
							{ id: Date.now(), from: "assistant", text: `You asked: “${question}”.` },
						]);
						setSending(false);
					}, 800);
				}}
			>
				<ChatInputField
					aria-label="Message"
					placeholder="What would you like to know?"
					value={text}
					onChange={(event) => setText(event.target.value)}
				/>
				<ChatSendButton canSend={text.trim() !== ""} isLoading={sending} />
			</ChatInput>
		</Chat>
	);
}

export const Conversation: Story = {
	render: () => (
		<Demo
			initial={[
				{ id: 1, from: "user", text: "Who does Alice know?" },
				{ id: 2, from: "assistant", text: "MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(b) RETURN b.name" },
				{ id: 3, from: "assistant", text: "Alice knows Bob and Carol." },
				{ id: 4, from: "user", text: "And the graph `missing`?" },
				{ id: 5, from: "assistant", text: "Graph not found", error: true },
			]}
		/>
	),
};

export const Empty: Story = {
	render: () => <Demo initial={[]} />,
};
