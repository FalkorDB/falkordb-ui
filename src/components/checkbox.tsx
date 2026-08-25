import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/cn";

export const Checkbox = forwardRef<
	ElementRef<typeof CheckboxPrimitive.Root>,
	ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"peer size-4 shrink-0 rounded-sm border border-input bg-background transition-colors",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
			"data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
			className,
		)}
		{...props}
	>
		{/* Both glyphs mount; `data-state` picks one, so uncontrolled usage works too. */}
		<CheckboxPrimitive.Indicator className="group flex items-center justify-center text-current">
			<Check className="size-3.5 group-data-[state=indeterminate]:hidden" aria-hidden />
			<Minus className="hidden size-3.5 group-data-[state=indeterminate]:block" aria-hidden />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
