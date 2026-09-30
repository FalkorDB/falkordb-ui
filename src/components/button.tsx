import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
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
			},
			size: {
				sm: "h-8 px-3",
				default: "h-10 px-4 py-2",
				lg: "h-12 px-8",
				icon: "size-10",
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
		const button = (
			<Comp
				ref={ref}
				className={cn(buttonVariants({ variant, size }), className)}
				disabled={disabled ?? isLoading}
				// `asChild` hands rendering to the child, which owns its own type.
				{...(asChild ? {} : { type })}
				{...props}
			>
				{isLoading ? <Loader2 className="animate-spin" aria-hidden /> : children}
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
