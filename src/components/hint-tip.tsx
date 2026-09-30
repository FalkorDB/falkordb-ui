import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

export interface HintTipProps {
	/** The hint itself. */
	children: ReactNode;
	/** Defaults to an info glyph. */
	trigger?: ReactNode;
	/**
	 * `tooltip` opens on hover and focus; `popover` opens on tap. Radix tooltips
	 * never open on touch, so a touch layout needs `popover` or the hint is
	 * simply unreachable there.
	 */
	mode?: "tooltip" | "popover";
	className?: string;
	contentClassName?: string;
	"data-testid"?: string;
}

/**
 * A hint whose trigger has no other job. Where the trigger is a real control —
 * a button that uploads, runs or deletes — use the button's own `tooltip`
 * instead: the tap already does something, and a bubble on top of it is noise.
 */
export function HintTip({
	children,
	trigger,
	mode = "tooltip",
	className,
	contentClassName,
	"data-testid": testId,
}: HintTipProps) {
	const triggerClassName = cn("flex items-center gap-1 text-foreground/60", className);
	const content = trigger ?? <Info className="size-4" aria-hidden />;

	if (mode === "popover") {
		return (
			<Popover>
				{/* The glyph is small and sits inline next to text, so the tap area is
				    grown with a pseudo-element rather than by padding the trigger out
				    and shifting whatever it labels. */}
				<PopoverTrigger
					type="button"
					data-testid={testId}
					aria-label="More information"
					className={cn(triggerClassName, "relative after:absolute after:-inset-[14px] after:content-['']")}
				>
					{content}
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className={cn(
						"flex w-[80vw] max-w-[320px] items-start gap-2 whitespace-pre-line p-3 text-sm",
						contentClassName,
					)}
				>
					<span>{children}</span>
				</PopoverContent>
			</Popover>
		);
	}

	// Self-contained so a hint never depends on an ancestor TooltipProvider.
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger
					type="button"
					data-testid={testId}
					aria-label="More information"
					className={triggerClassName}
				>
					{content}
				</TooltipTrigger>
				<TooltipContent className={contentClassName}>{children}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
