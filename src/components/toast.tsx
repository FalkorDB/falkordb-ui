import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactElement } from "react";

import { cn } from "@/lib/cn";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
	ElementRef<typeof ToastPrimitive.Viewport>,
	ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
	<ToastPrimitive.Viewport
		ref={ref}
		className={cn(
			"fixed bottom-0 right-0 z-100 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:top-0 sm:flex-col md:max-w-105",
			className,
		)}
		{...props}
	/>
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export const toastVariants = cva(
	cn(
		"group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all",
		"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
		"data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
		"data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none",
		"data-[swipe=cancel]:translate-x-0",
		"data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=end]:animate-out",
	),
	{
		variants: {
			variant: {
				default: "border-border bg-popover text-popover-foreground",
				destructive: "border-destructive bg-destructive text-destructive-foreground",
				success: "border-success bg-success text-success-foreground",
				warning: "border-warning bg-warning text-warning-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export const Toast = forwardRef<
	ElementRef<typeof ToastPrimitive.Root>,
	ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
	<ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
));
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastAction = forwardRef<
	ElementRef<typeof ToastPrimitive.Action>,
	ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
	<ToastPrimitive.Action
		ref={ref}
		className={cn(
			"inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-current/40 bg-transparent px-3 text-sm font-medium transition-colors",
			"hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
			"disabled:pointer-events-none disabled:opacity-50",
			className,
		)}
		{...props}
	/>
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

export const ToastClose = forwardRef<
	ElementRef<typeof ToastPrimitive.Close>,
	ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
	<ToastPrimitive.Close
		ref={ref}
		toast-close=""
		className={cn(
			"absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity",
			"group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
			className,
		)}
		{...props}
	>
		<X className="size-4" aria-hidden />
		<span className="sr-only">Close</span>
	</ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

export const ToastTitle = forwardRef<
	ElementRef<typeof ToastPrimitive.Title>,
	ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
	<ToastPrimitive.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

export const ToastDescription = forwardRef<
	ElementRef<typeof ToastPrimitive.Description>,
	ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
	<ToastPrimitive.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

export type ToastProps = ComponentPropsWithoutRef<typeof Toast>;
export type ToastActionElement = ReactElement<typeof ToastAction>;
