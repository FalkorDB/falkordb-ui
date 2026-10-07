import { Send } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useLayoutEffect,
	useRef,
	type ForwardedRef,
	type FormHTMLAttributes,
	type HTMLAttributes,
	type LiHTMLAttributes,
	type ReactNode,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { Input, type InputProps } from "@/components/input";
import { cn } from "@/lib/cn";

/**
 * Chat building blocks. They own the layout — the message list in order, user
 * and assistant sides, the avatar beside each bubble, the input row — while the
 * host owns the conversation and what each message says, markdown included.
 */

/** The whole chat panel: a full-height column. */
export const Chat = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("flex h-full w-full flex-col gap-2", className)} {...props} />
	),
);
Chat.displayName = "Chat";

/** The title row; put actions such as a close button in it. */
export const ChatHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("flex w-full items-center justify-between gap-2", className)} {...props} />
	),
);
ChatHeader.displayName = "ChatHeader";

export const ChatTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
	({ className, ...props }, ref) => (
		<h2 ref={ref} className={cn("flex items-center gap-2 text-lg font-semibold", className)} {...props} />
	),
);
ChatTitle.displayName = "ChatTitle";

/** How close to the end, in pixels, still counts as reading the latest message. */
const STICK_THRESHOLD = 24;

function setRef<T>(ref: ForwardedRef<T>, value: T | null) {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
}

/**
 * The conversation, oldest first. It stays scrolled to the newest message as
 * messages arrive, unless the reader has scrolled up to read something earlier.
 */
export const ChatMessages = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
	({ className, onScroll, children, ...props }, ref) => {
		const list = useRef<HTMLUListElement | null>(null);
		const atEnd = useRef(true);

		const setList = useCallback(
			(node: HTMLUListElement | null) => {
				list.current = node;
				setRef(ref, node);
			},
			[ref],
		);

		useLayoutEffect(() => {
			const node = list.current;
			if (node && atEnd.current) node.scrollTop = node.scrollHeight;
		}, [children]);

		return (
			<ul
				ref={setList}
				role="log"
				aria-live="polite"
				className={cn(
					"flex min-h-0 w-full grow basis-0 flex-col gap-3 overflow-y-auto overflow-x-hidden",
					className,
				)}
				onScroll={(event) => {
					const node = event.currentTarget;
					atEnd.current = node.scrollHeight - node.scrollTop - node.clientHeight <= STICK_THRESHOLD;
					onScroll?.(event);
				}}
				{...props}
			>
				{children}
			</ul>
		);
	},
);
ChatMessages.displayName = "ChatMessages";

export type ChatMessageFrom = "user" | "assistant";

export interface ChatMessageProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "content"> {
	/** Who sent it: the user's messages sit on the right, the assistant's on the left. */
	from: ChatMessageFrom;
	/** Shown beside the bubble, on the outer side. */
	avatar?: ReactNode;
	/** `error` outlines the bubble in the destructive colour. */
	variant?: "default" | "error";
	/** Classes for the bubble, which `className` (the row) cannot reach. */
	bubbleClassName?: string;
}

/** One message: its bubble, with the sender's avatar beside it. */
export const ChatMessage = forwardRef<HTMLLIElement, ChatMessageProps>(
	({ from, avatar, variant = "default", className, bubbleClassName, children, ...props }, ref) => {
		const fromUser = from === "user";
		return (
			<li
				ref={ref}
				data-from={from}
				className={cn("flex w-full items-start gap-1", fromUser ? "justify-end" : "justify-start", className)}
				{...props}
			>
				{!fromUser && avatar}
				<div
					className={cn(
						"max-w-[80%] overflow-hidden rounded-lg p-2 text-sm",
						fromUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
						variant === "error" && "border border-destructive",
						bubbleClassName,
					)}
				>
					{children}
				</div>
				{fromUser && avatar}
			</li>
		);
	},
);
ChatMessage.displayName = "ChatMessage";

/** A round avatar: pass a letter, an icon or an image. */
export const ChatAvatar = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			className={cn(
				"relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm",
				className,
			)}
			{...props}
		/>
	),
);
ChatAvatar.displayName = "ChatAvatar";

/**
 * The input row, a `<form>`: Enter in the field submits it. Put extra controls,
 * such as a mode toggle, alongside the field and send button.
 */
export const ChatInput = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(
	({ className, ...props }, ref) => (
		<form
			ref={ref}
			className={cn("flex w-full items-center gap-2 rounded-lg border border-border p-2", className)}
			{...props}
		/>
	),
);
ChatInput.displayName = "ChatInput";

/** The message field; it fills the row. */
export const ChatInputField = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
	<Input ref={ref} className={cn("min-w-0 flex-1 basis-0 border-none bg-background", className)} {...props} />
));
ChatInputField.displayName = "ChatInputField";

export interface ChatSendButtonProps extends ButtonProps {
	/** Whether there is anything to send; the button is disabled while there is not. */
	canSend?: boolean;
}

/** Submits the input row. Disabled while there is nothing to send or a send is in flight. */
export const ChatSendButton = forwardRef<HTMLButtonElement, ChatSendButtonProps>(
	({ canSend = true, isLoading = false, disabled, title, className, children, ...props }, ref) => {
		const label = title ?? (canSend ? "Send" : "Type a message to send");
		return (
			<Button
				ref={ref}
				type="submit"
				size="none"
				variant="none"
				className={cn("shrink-0 p-1", className)}
				title={label}
				aria-label={label}
				isLoading={isLoading}
				disabled={disabled ?? (!canSend || isLoading)}
				{...props}
			>
				{children ?? <Send aria-hidden />}
			</Button>
		);
	},
);
ChatSendButton.displayName = "ChatSendButton";

/** The status row under the conversation, e.g. token usage or the model in use. */
export const ChatFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"flex w-full items-center justify-between gap-2 px-1 text-xs leading-none text-muted-foreground",
				className,
			)}
			{...props}
		/>
	),
);
ChatFooter.displayName = "ChatFooter";
