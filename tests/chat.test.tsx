import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

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

/** Gives a list the scroll geometry jsdom does not lay out. */
function setScrollGeometry(
	node: HTMLElement,
	{ scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number },
) {
	Object.defineProperty(node, "scrollHeight", { configurable: true, value: scrollHeight });
	Object.defineProperty(node, "clientHeight", { configurable: true, value: clientHeight });
}

function Conversation({ messages }: { messages: string[] }) {
	return (
		<ChatMessages data-testid="list">
			{messages.map((text) => (
				<ChatMessage key={text} from="assistant">
					{text}
				</ChatMessage>
			))}
		</ChatMessages>
	);
}

describe("Chat layout", () => {
	it("renders the panel, header, title and footer with merged classes", () => {
		render(
			<Chat data-testid="chat" className="p-2">
				<ChatHeader data-testid="header" className="pr-8">
					<ChatTitle>Chat</ChatTitle>
					<button type="button">Close</button>
				</ChatHeader>
				<ChatFooter data-testid="footer" className="px-3">
					Tokens
				</ChatFooter>
			</Chat>,
		);

		expect(screen.getByTestId("chat")).toHaveClass("flex", "h-full", "flex-col", "p-2");
		expect(screen.getByTestId("header")).toHaveClass("justify-between", "pr-8");
		expect(screen.getByRole("heading", { name: "Chat" })).toHaveClass("font-semibold");
		expect(screen.getByTestId("footer")).toHaveClass("text-xs", "px-3");
	});

	it("forwards refs to every part", () => {
		const refs = {
			chat: createRef<HTMLDivElement>(),
			header: createRef<HTMLDivElement>(),
			title: createRef<HTMLHeadingElement>(),
			messages: createRef<HTMLUListElement>(),
			message: createRef<HTMLLIElement>(),
			avatar: createRef<HTMLSpanElement>(),
			input: createRef<HTMLFormElement>(),
			field: createRef<HTMLInputElement>(),
			send: createRef<HTMLButtonElement>(),
			footer: createRef<HTMLDivElement>(),
		};
		render(
			<Chat ref={refs.chat}>
				<ChatHeader ref={refs.header}>
					<ChatTitle ref={refs.title}>Chat</ChatTitle>
				</ChatHeader>
				<ChatMessages ref={refs.messages}>
					<ChatMessage ref={refs.message} from="user" avatar={<ChatAvatar ref={refs.avatar}>U</ChatAvatar>}>
						Hi
					</ChatMessage>
				</ChatMessages>
				<ChatInput ref={refs.input}>
					<ChatInputField ref={refs.field} aria-label="Message" />
					<ChatSendButton ref={refs.send} />
				</ChatInput>
				<ChatFooter ref={refs.footer} />
			</Chat>,
		);

		expect(refs.chat.current).toBeInstanceOf(HTMLDivElement);
		expect(refs.header.current).toBeInstanceOf(HTMLDivElement);
		expect(refs.title.current).toBeInstanceOf(HTMLHeadingElement);
		expect(refs.messages.current).toBeInstanceOf(HTMLUListElement);
		expect(refs.message.current).toBeInstanceOf(HTMLLIElement);
		expect(refs.avatar.current).toBeInstanceOf(HTMLSpanElement);
		expect(refs.input.current).toBeInstanceOf(HTMLFormElement);
		expect(refs.field.current).toBeInstanceOf(HTMLInputElement);
		expect(refs.send.current).toBeInstanceOf(HTMLButtonElement);
		expect(refs.footer.current).toBeInstanceOf(HTMLDivElement);
	});
});

describe("ChatMessage", () => {
	it("puts the user's message on the right with the avatar after the bubble", () => {
		render(
			<ul>
				<ChatMessage from="user" data-testid="row" avatar={<ChatAvatar data-testid="avatar">U</ChatAvatar>}>
					Who knows who?
				</ChatMessage>
			</ul>,
		);

		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-from", "user");
		expect(row).toHaveClass("justify-end");
		const [bubble, avatar] = Array.from(row.children);
		expect(bubble).toHaveTextContent("Who knows who?");
		expect(bubble).toHaveClass("bg-primary", "text-primary-foreground");
		expect(avatar).toBe(screen.getByTestId("avatar"));
	});

	it("puts the assistant's message on the left with the avatar before the bubble", () => {
		render(
			<ul>
				<ChatMessage
					from="assistant"
					data-testid="row"
					avatar={<ChatAvatar data-testid="avatar">F</ChatAvatar>}
				>
					Alice knows Bob.
				</ChatMessage>
			</ul>,
		);

		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-from", "assistant");
		expect(row).toHaveClass("justify-start");
		const [avatar, bubble] = Array.from(row.children);
		expect(avatar).toBe(screen.getByTestId("avatar"));
		expect(bubble).toHaveClass("bg-secondary");
		expect(bubble).not.toHaveClass("border-destructive");
	});

	it("renders without an avatar", () => {
		render(
			<ul>
				<ChatMessage from="assistant" data-testid="row">
					Only text
				</ChatMessage>
			</ul>,
		);

		expect(screen.getByTestId("row").children).toHaveLength(1);
	});

	it("outlines an error and takes bubble classes the row cannot reach", () => {
		render(
			<ul>
				<ChatMessage
					from="assistant"
					variant="error"
					data-testid="row"
					className="gap-4"
					bubbleClassName="p-4"
				>
					Graph not found
				</ChatMessage>
			</ul>,
		);

		const row = screen.getByTestId("row");
		expect(row).toHaveClass("gap-4");
		const bubble = row.firstElementChild!;
		expect(bubble).toHaveClass("border", "border-destructive", "p-4");
		expect(bubble).not.toHaveClass("p-2");
	});

	it("renders an avatar as a round badge with merged classes", () => {
		render(<ChatAvatar className="bg-primary">A</ChatAvatar>);

		expect(screen.getByText("A")).toHaveClass("rounded-full", "size-8", "bg-primary");
	});
});

describe("ChatMessages", () => {
	it("is announced as a live log", () => {
		render(<Conversation messages={["one"]} />);

		const list = screen.getByRole("log");
		expect(list).toHaveAttribute("aria-live", "polite");
		expect(list.tagName).toBe("UL");
	});

	it("stays on the newest message as messages arrive", () => {
		const { rerender } = render(<Conversation messages={["one"]} />);
		const list = screen.getByTestId("list");
		setScrollGeometry(list, { scrollHeight: 500, clientHeight: 100 });

		rerender(<Conversation messages={["one", "two"]} />);

		expect(list.scrollTop).toBe(500);
	});

	it("leaves the reader where they are once they scroll up", () => {
		const { rerender } = render(<Conversation messages={["one"]} />);
		const list = screen.getByTestId("list");
		setScrollGeometry(list, { scrollHeight: 500, clientHeight: 100 });
		list.scrollTop = 100;
		fireEvent.scroll(list);

		rerender(<Conversation messages={["one", "two"]} />);

		expect(list.scrollTop).toBe(100);
	});

	it("follows again once the reader is back near the end", () => {
		const { rerender } = render(<Conversation messages={["one"]} />);
		const list = screen.getByTestId("list");
		setScrollGeometry(list, { scrollHeight: 500, clientHeight: 100 });
		list.scrollTop = 390;
		fireEvent.scroll(list);
		setScrollGeometry(list, { scrollHeight: 600, clientHeight: 100 });

		rerender(<Conversation messages={["one", "two"]} />);

		expect(list.scrollTop).toBe(600);
	});

	it("still calls the host's onScroll", () => {
		const onScroll = vi.fn();
		render(
			<ChatMessages data-testid="list" onScroll={onScroll}>
				<li>one</li>
			</ChatMessages>,
		);

		fireEvent.scroll(screen.getByTestId("list"));

		expect(onScroll).toHaveBeenCalledOnce();
	});

	it("hands a callback ref the list", () => {
		const ref = vi.fn();
		render(<ChatMessages ref={ref} />);

		expect(ref).toHaveBeenCalledWith(expect.any(HTMLUListElement));
	});
});

function Composer({ onSend }: { onSend: (text: string) => void }) {
	const [text, setText] = useState("");
	return (
		<ChatInput
			aria-label="Composer"
			onSubmit={(event) => {
				event.preventDefault();
				onSend(text);
				setText("");
			}}
		>
			<ChatInputField aria-label="Message" value={text} onChange={(event) => setText(event.target.value)} />
			<ChatSendButton canSend={text.trim() !== ""} />
		</ChatInput>
	);
}

describe("ChatInput", () => {
	it("sends on Enter and with the send button", async () => {
		const onSend = vi.fn();
		render(<Composer onSend={onSend} />);

		await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "Who knows who?{Enter}");
		expect(onSend).toHaveBeenLastCalledWith("Who knows who?");

		await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "Again");
		await userEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSend).toHaveBeenLastCalledWith("Again");
	});

	it("keeps the send button disabled while there is nothing to send", async () => {
		render(<Composer onSend={vi.fn()} />);

		const send = screen.getByRole("button", { name: "Type a message to send" });
		expect(send).toBeDisabled();

		await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "   ");
		expect(send).toBeDisabled();

		await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "hi");
		expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
	});

	it("lays the row out and lets the field fill it", () => {
		render(
			<ChatInput aria-label="Composer" className="p-4">
				<ChatInputField aria-label="Message" className="text-lg" />
			</ChatInput>,
		);

		expect(screen.getByRole("form", { name: "Composer" })).toHaveClass("flex", "border", "p-4");
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveClass("flex-1", "border-none", "text-lg");
	});
});

describe("ChatSendButton", () => {
	it("is a submit button with a send icon by default", () => {
		render(<ChatSendButton />);

		const send = screen.getByRole("button", { name: "Send" });
		expect(send).toHaveAttribute("type", "submit");
		expect(send.querySelector("svg")).not.toBeNull();
	});

	it("shows a spinner and stays disabled while sending", () => {
		render(<ChatSendButton isLoading />);

		const send = screen.getByRole("button", { name: "Send" });
		expect(send).toBeDisabled();
		expect(send.querySelector(".animate-spin")).not.toBeNull();
	});

	it("lets an explicit disabled, title, className and children win", () => {
		render(
			<ChatSendButton canSend={false} disabled={false} title="Ask" className="p-2">
				Go
			</ChatSendButton>,
		);

		const send = screen.getByRole("button", { name: "Ask" });
		expect(send).toBeEnabled();
		expect(send).toHaveTextContent("Go");
		expect(send).toHaveClass("p-2", "shrink-0");
		expect(send).not.toHaveClass("p-1");
	});
});
