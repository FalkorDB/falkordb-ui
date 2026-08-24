import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
	<input
		ref={ref}
		type={type}
		className={cn(
			"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
			"aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
			className,
		)}
		{...props}
	/>
));

Input.displayName = "Input";
