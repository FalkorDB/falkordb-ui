import {
	forwardRef,
	type HTMLAttributes,
	type Ref,
	type TdHTMLAttributes,
	type ThHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
	/**
	 * Props for the scrolling wrapper around the `<table>`. A virtualised or
	 * infinitely scrolling table needs its ref and `onScroll`, since that wrapper,
	 * not the table, is what scrolls.
	 */
	containerProps?: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
	({ className, containerProps, ...props }, ref) => {
		const { className: containerClassName, ...container } = containerProps ?? {};

		return (
			<div className={cn("relative w-full overflow-auto", containerClassName)} {...container}>
				<table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
			</div>
		);
	},
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
	),
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
	),
);
TableBody.displayName = "TableBody";

export const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<tfoot
			ref={ref}
			className={cn("border-t border-border bg-secondary font-medium [&>tr]:last:border-b-0", className)}
			{...props}
		/>
	),
);
TableFooter.displayName = "TableFooter";

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
	({ className, ...props }, ref) => (
		<tr
			ref={ref}
			className={cn(
				"border-b border-border transition-colors hover:bg-secondary/60 data-[state=selected]:bg-accent",
				className,
			)}
			{...props}
		/>
	),
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<th
			ref={ref}
			className={cn(
				"h-10 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	),
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<td ref={ref} className={cn("p-3 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
	),
);
TableCell.displayName = "TableCell";

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
	({ className, ...props }, ref) => (
		<caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
	),
);
TableCaption.displayName = "TableCaption";
