import { act, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastAction } from "@/components/toast";
import { Toaster } from "@/components/toaster";
import { dismiss, toast, useToast } from "@/hooks/use-toast";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	// The store is module state, so drain it before the next test.
	act(() => {
		dismiss();
		vi.advanceTimersByTime(1000);
	});
	vi.useRealTimers();
});

describe("toast store", () => {
	it("renders a toast raised from outside React", () => {
		render(<Toaster />);

		act(() => {
			toast({ title: "Query finished", description: "42 rows" });
		});

		expect(screen.getByText("Query finished")).toBeInTheDocument();
		expect(screen.getByText("42 rows")).toBeInTheDocument();
	});

	it("keeps at most three toasts, newest first", () => {
		render(<Toaster />);

		act(() => {
			toast({ title: "one" });
			toast({ title: "two" });
			toast({ title: "three" });
			toast({ title: "four" });
		});

		expect(screen.queryByText("one")).not.toBeInTheDocument();
		expect(screen.getByText("four")).toBeInTheDocument();
		expect(screen.getAllByRole("status")).toHaveLength(3);
	});

	it("updates one toast in place and leaves its siblings untouched", () => {
		render(<Toaster />);

		let handle!: ReturnType<typeof toast>;
		act(() => {
			handle = toast({ title: "Uploading" });
			toast({ title: "Indexing" });
		});

		act(() => {
			handle.update({ title: "Uploaded" });
		});

		expect(screen.queryByText("Uploading")).not.toBeInTheDocument();
		expect(screen.getByText("Uploaded")).toBeInTheDocument();
		expect(screen.getByText("Indexing")).toBeInTheDocument();
	});

	it("keeps a dismissed toast in the store until the exit-animation grace period elapses", () => {
		// Radix unmounts the node right away in jsdom (no animation to wait on),
		// so the grace period is only observable in the store itself.
		function StoreProbe() {
			const { toasts } = useToast();
			return <span data-testid="store">{toasts.map((item) => `${item.id}:${item.open}`).join(",")}</span>;
		}
		render(<StoreProbe />);

		let handle!: ReturnType<typeof toast>;
		act(() => {
			handle = toast({ title: "Query finished" });
		});
		expect(screen.getByTestId("store")).toHaveTextContent(`${handle.id}:true`);

		act(() => {
			handle.dismiss();
		});
		expect(screen.getByTestId("store")).toHaveTextContent(`${handle.id}:false`);

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(screen.getByTestId("store")).toBeEmptyDOMElement();
	});

	it("only schedules one removal when dismissed twice", () => {
		render(<Toaster />);

		let handle!: ReturnType<typeof toast>;
		act(() => {
			handle = toast({ title: "Query finished" });
		});

		act(() => {
			handle.dismiss();
			handle.dismiss();
			vi.advanceTimersByTime(300);
		});

		expect(screen.queryByText("Query finished")).not.toBeInTheDocument();
	});

	it("dismisses every toast when called with no id", () => {
		render(<Toaster />);

		act(() => {
			toast({ title: "one" });
			toast({ title: "two" });
		});

		act(() => {
			dismiss();
			vi.advanceTimersByTime(300);
		});

		expect(screen.queryByText("one")).not.toBeInTheDocument();
		expect(screen.queryByText("two")).not.toBeInTheDocument();
	});

	it("leaves other toasts alone when dismissing one by id", () => {
		render(<Toaster />);

		let first!: ReturnType<typeof toast>;
		act(() => {
			first = toast({ title: "one" });
			toast({ title: "two" });
		});

		act(() => {
			dismiss(first.id);
			vi.advanceTimersByTime(300);
		});

		expect(screen.queryByText("one")).not.toBeInTheDocument();
		expect(screen.getByText("two")).toBeInTheDocument();
	});

	it("closes a toast through its close button and forwards onOpenChange", () => {
		const onOpenChange = vi.fn();
		render(<Toaster />);

		act(() => {
			toast({ title: "Query finished", onOpenChange });
		});

		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.queryByText("Query finished")).not.toBeInTheDocument();
	});

	it("closes through its close button when no onOpenChange was supplied", () => {
		render(<Toaster />);

		act(() => {
			toast({ title: "Query finished" });
		});

		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.queryByText("Query finished")).not.toBeInTheDocument();
	});

	it("renders a toast action", () => {
		render(<Toaster />);

		act(() => {
			toast({
				title: "Query failed",
				variant: "destructive",
				action: <ToastAction altText="Retry the query">Retry</ToastAction>,
			});
		});

		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});

	it("is a no-op when dismissing an id that is not mounted", () => {
		render(<Toaster />);

		act(() => {
			toast({ title: "one" });
		});

		act(() => {
			dismiss("does-not-exist");
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByText("one")).toBeInTheDocument();
	});
});
