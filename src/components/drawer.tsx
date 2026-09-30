import {
	forwardRef,
	type ComponentProps,
	type ComponentPropsWithoutRef,
	type ElementRef,
	type HTMLAttributes,
} from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/cn";

export const Drawer = ({
	shouldScaleBackground = true,
	...props
}: ComponentProps<typeof DrawerPrimitive.Root>) => (
	<DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;
export const DrawerClose = DrawerPrimitive.Close;

export const DrawerOverlay = forwardRef<
	ElementRef<typeof DrawerPrimitive.Overlay>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60", className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

export interface DrawerContentProps extends ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
	/** The edge the drawer is anchored to; the grab handle follows it. */
	side?: "left" | "right" | "bottom";
	/** Classes for the grab handle, which `className` cannot reach. */
	handleClassName?: string;
	/** Classes for the backdrop, which `className` cannot reach. */
	overlayClassName?: string;
}

export const DrawerContent = forwardRef<ElementRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(
	({ className, children, side = "bottom", handleClassName, overlayClassName, ...props }, ref) => (
		<DrawerPortal>
			<DrawerOverlay className={overlayClassName} />
			<DrawerPrimitive.Content
				ref={ref}
				className={cn(
					"fixed z-50 flex h-auto rounded-t-[10px] border border-border bg-background",
					// `viewport-fit=cover` lets a page run under the notch and the home
					// indicator, so an edge-anchored drawer has to pad itself back out.
					// `env()` resolves to 0 everywhere that has no inset, desktop included.
					"pb-[env(safe-area-inset-bottom)]",
					side !== "bottom" && "pt-[env(safe-area-inset-top)]",
					side === "left" && "inset-y-0 left-0 flex-row-reverse pl-[env(safe-area-inset-left)]",
					side === "right" && "inset-y-0 right-0 flex-row pr-[env(safe-area-inset-right)]",
					side === "bottom" && "inset-x-0 bottom-0 mt-24 flex-col",
					className,
				)}
				{...props}
			>
				<div
					className={cn(
						"mx-auto mt-2 h-2 w-[100px] cursor-grab rounded-full bg-muted active:cursor-grabbing",
						side !== "bottom" && "my-auto h-[100px] w-2",
						side === "left" && "mr-2",
						side === "right" && "ml-2",
						handleClassName,
					)}
				/>
				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
	),
);
DrawerContent.displayName = "DrawerContent";

export const DrawerHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("grid gap-1.5 p-4 text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

export const DrawerFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

export const DrawerTitle = forwardRef<
	ElementRef<typeof DrawerPrimitive.Title>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Title
		ref={ref}
		className={cn("text-lg font-semibold leading-none tracking-tight", className)}
		{...props}
	/>
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

export const DrawerDescription = forwardRef<
	ElementRef<typeof DrawerPrimitive.Description>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Description
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;
