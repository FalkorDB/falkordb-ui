import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

// Radius, typography, focus ring and icon handling ride on the size rather than
// the base, so `size="none"` really does leave the geometry to the consumer.
const chrome =
	"justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

export const buttonVariants = cva("inline-flex items-center gap-2 transition-colors disabled:opacity-50", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/90",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			outline:
				"border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
			ghost: "bg-transparent hover:bg-secondary hover:text-secondary-foreground",
			destructive:
				"border-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground",
			link: "bg-transparent text-primary underline-offset-4 hover:underline",
			none: "",
		},
		size: {
			sm: `h-8 px-3 ${chrome}`,
			default: `h-10 px-4 py-2 ${chrome}`,
			lg: `h-12 px-8 ${chrome}`,
			icon: `size-10 ${chrome}`,
			none: "",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

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
				className={cn(buttonVariants({ variant, size }), className)}
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
