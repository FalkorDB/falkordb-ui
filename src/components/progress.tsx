import * as ProgressPrimitive from "@radix-ui/react-progress";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/cn";

export interface ProgressProps extends ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
	/** Classes for the filled bar, which `className` cannot reach. */
	indicatorClassName?: string;
}

export const Progress = forwardRef<ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
	({ className, indicatorClassName, value, ...props }, ref) => (
		<ProgressPrimitive.Root
			ref={ref}
			value={value}
			className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
				style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	),
);
Progress.displayName = ProgressPrimitive.Root.displayName;
