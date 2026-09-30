import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "@/components/button";

describe("Button", () => {
	it("renders its children in a button that defaults to type=button", () => {
		render(<Button>Run query</Button>);

		const button = screen.getByRole("button", { name: "Run query" });
		expect(button).toHaveAttribute("type", "button");
	});

	it("keeps an explicit type", () => {
		render(<Button type="submit">Save</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("calls onClick", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Run</Button>);

		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not call onClick while disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Run
			</Button>,
		);

		await userEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("swaps children for a spinner and disables itself while loading", () => {
		render(<Button isLoading>Run query</Button>);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).not.toHaveTextContent("Run query");
		expect(button.querySelector("svg")).toBeInTheDocument();
	});

	it("lets an explicit disabled=false survive isLoading", () => {
		render(
			<Button isLoading disabled={false}>
				Run
			</Button>,
		);
		expect(screen.getByRole("button")).toBeEnabled();
	});

	it("renders as the child element when asChild is set", () => {
		render(
			<Button asChild>
				<a href="/graphs">Graphs</a>
			</Button>,
		);

		const link = screen.getByRole("link", { name: "Graphs" });
		expect(link).toHaveAttribute("href", "/graphs");
		// The child owns its own type; we must not stamp a button type onto an anchor.
		expect(link).not.toHaveAttribute("type");
	});

	it("shows a tooltip on hover without a consumer-mounted provider", async () => {
		render(
			<Button size="icon" tooltip="Export graph">
				<svg />
			</Button>,
		);

		await userEvent.hover(screen.getByRole("button"));
		await waitFor(() => expect(screen.getAllByText("Export graph").length).toBeGreaterThan(0));
	});

	it("forwards a ref to the underlying button", () => {
		const ref = createRef<HTMLButtonElement>();
		render(<Button ref={ref}>Run</Button>);
		expect(ref.current).toBeInstanceOf(HTMLButtonElement);
	});

	it("merges a consumer className over the variant classes", () => {
		render(<Button className="w-full">Run</Button>);
		expect(screen.getByRole("button")).toHaveClass("w-full");
	});

	it.each([
		["default", "bg-primary"],
		["secondary", "bg-secondary"],
		["outline", "border-primary"],
		["ghost", "bg-transparent"],
		["destructive", "border-destructive"],
		["link", "underline-offset-4"],
	] as const)("applies the %s variant", (variant, expected) => {
		expect(buttonVariants({ variant })).toContain(expected);
	});

	it.each([
		["sm", "h-8"],
		["default", "h-10"],
		["lg", "h-12"],
		["icon", "size-10"],
	] as const)("applies the %s size", (size, expected) => {
		expect(buttonVariants({ size })).toContain(expected);
	});
});
