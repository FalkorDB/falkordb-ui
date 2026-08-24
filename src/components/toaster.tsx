import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from "@/components/toast";
import { useToast } from "@/hooks/use-toast";

export type ToasterProps = {
	/** Auto-dismiss delay in ms, forwarded to Radix. */
	duration?: number;
	swipeDirection?: "up" | "down" | "left" | "right";
};

/**
 * Mount once near the root of the app; `toast()` then works from anywhere.
 */
export function Toaster({ duration = 5000, swipeDirection = "right" }: ToasterProps = {}) {
	const { toasts } = useToast();

	return (
		<ToastProvider duration={duration} swipeDirection={swipeDirection}>
			{toasts.map(({ id, title, description, action, ...props }) => (
				<Toast key={id} {...props}>
					<div className="flex flex-col gap-1">
						{title && <ToastTitle>{title}</ToastTitle>}
						{description && <ToastDescription>{description}</ToastDescription>}
					</div>
					{action}
					<ToastClose />
				</Toast>
			))}
			<ToastViewport />
		</ToastProvider>
	);
}
