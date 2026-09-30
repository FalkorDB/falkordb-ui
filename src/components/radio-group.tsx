import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/cn";

export const RadioGroup = forwardRef<
	ElementRef<typeof RadioGroupPrimitive.Root>,
	ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export const RadioGroupItem = forwardRef<
	ElementRef<typeof RadioGroupPrimitive.Item>,
	ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Item
		ref={ref}
		className={cn(
			"aspect-square size-5 rounded-full border border-primary text-primary",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			className,
		)}
		{...props}
	>
		<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
			<Circle className="size-3 fill-current text-current" aria-hidden />
		</RadioGroupPrimitive.Indicator>
	</RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;
