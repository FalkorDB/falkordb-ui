import * as SliderPrimitive from "@radix-ui/react-slider";
import {
	Fragment,
	forwardRef,
	type ComponentPropsWithoutRef,
	type ElementRef,
	type ReactElement,
	type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export interface SliderProps extends ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
	/**
	 * Wraps each thumb, e.g. in a tooltip that reads out the value. The thumb has
	 * to stay the wrapper's trigger, so pass it on with `asChild` or equivalent.
	 */
	renderThumb?: (thumb: ReactElement, index: number) => ReactNode;
	/** Classes for each thumb, which `className` cannot reach. */
	thumbClassName?: string;
}

export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
	({ className, renderThumb, thumbClassName, value, defaultValue, ...props }, ref) => {
		// One thumb per value, so a range slider gets both ends.
		const thumbs = (value ?? defaultValue ?? [0]).length;

		return (
			<SliderPrimitive.Root
				ref={ref}
				value={value}
				defaultValue={defaultValue}
				className={cn("relative flex w-full touch-none select-none items-center", className)}
				{...props}
			>
				<SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-border">
					<SliderPrimitive.Range className="absolute h-full bg-primary" />
				</SliderPrimitive.Track>
				{Array.from({ length: thumbs }, (_, index) => {
					const thumb = (
						<SliderPrimitive.Thumb
							key={index}
							className={cn(
								"block size-5 rounded-full border-2 border-primary bg-background transition-colors",
								"focus-visible:outline-none",
								"disabled:pointer-events-none disabled:opacity-50",
								thumbClassName,
							)}
						/>
					);
					return renderThumb ? <Fragment key={index}>{renderThumb(thumb, index)}</Fragment> : thumb;
				})}
			</SliderPrimitive.Root>
		);
	},
);
Slider.displayName = SliderPrimitive.Root.displayName;
