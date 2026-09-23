import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

// The looks are FalkorDB's: a filled primary, three outlined siblings, and a
// `none` pair for a consumer that dictates its own geometry. Padding belongs to
// the size because the outlined pair is deliberately wider than the filled one.
export const buttonVariants = cva(
	"flex items-center gap-2 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "rounded-lg bg-primary enabled:hover:bg-primary/80",
				secondary: "rounded-lg border-2 border-primary bg-transparent text-primary",
				cancel: "rounded-lg border-2 border-border bg-transparent",
				destructive: "rounded-lg border-2 border-destructive bg-transparent text-destructive",
				link: "bg-transparent text-primary underline-offset-4 hover:underline",
				none: "",
			},
			size: {
				default: "px-4 py-[10px]",
				wide: "px-12 py-2",
				none: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	/** Render as the single child element instead of a `<button>`. */
	asChild?: boolean;
	/** Swaps the content for a spinner and disables the button. */
	isLoading?: boolean;
	/** Pixel size of the spinner. Only bites when `size` leaves icons unconstrained. */
	loaderSize?: number;
	/** Trailing text that truncates rather than widening the button. */
	label?: ReactNode;
	/** Classes for the label, which `className` cannot reach. */
	labelClassName?: string;
	/** Wraps the button in a tooltip. Icon-only buttons should always set this. */
	tooltip?: ReactNode;
	tooltipSide?: "top" | "right" | "bottom" | "left";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			isLoading = false,
			loaderSize,
			label,
			labelClassName,
			disabled,
			tooltip,
			tooltipSide,
			type = "button",
			children,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";

		// A lone child, so `asChild` still has exactly one element to graft onto.
		let content: ReactNode = children;
		if (isLoading) {
			content = <Loader2 size={loaderSize} className="animate-spin" aria-hidden />;
		} else if (label != null) {
			content = (
				<>
					{children}
					<span className={cn("truncate", labelClassName)}>{label}</span>
				</>
			);
		}

		const button = (
			<Comp
				ref={ref}
				className={cn(buttonVariants({ variant, size }), isLoading && "justify-center", className)}
				disabled={disabled ?? isLoading}
				// `asChild` hands rendering to the child, which owns its own type.
				{...(asChild ? {} : { type })}
				{...props}
			>
				{content}
			</Comp>
		);

		if (!tooltip) return button;

		// Self-contained so an icon button never depends on the consumer having
		// mounted a TooltipProvider. Nesting providers is safe in Radix.
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{button}</TooltipTrigger>
					<TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	},
);

Button.displayName = "Button";
