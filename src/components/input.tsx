import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
	<input
		ref={ref}
		type={type}
		className={cn(
			"rounded-lg border border-border bg-input p-1 text-foreground disabled:cursor-not-allowed disabled:opacity-50",
			className,
		)}
		{...props}
	/>
));

Input.displayName = "Input";
