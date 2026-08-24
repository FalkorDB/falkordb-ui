import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "@/components/badge";

describe("Badge", () => {
	it("renders its children", () => {
		render(<Badge>Indexed</Badge>);
		expect(screen.getByText("Indexed")).toBeInTheDocument();
	});

	it("forwards a ref and arbitrary props", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Badge ref={ref} data-testid="badge" title="Node label">
				Person
			</Badge>,
		);

		expect(ref.current).toBeInstanceOf(HTMLSpanElement);
		expect(screen.getByTestId("badge")).toHaveAttribute("title", "Node label");
	});

	it("merges a consumer className", () => {
		render(<Badge className="uppercase">Person</Badge>);
		expect(screen.getByText("Person")).toHaveClass("uppercase");
	});

	it.each([
		["default", "bg-primary"],
		["secondary", "bg-secondary"],
		["outline", "border-border"],
		["destructive", "bg-destructive"],
		["success", "bg-success"],
		["warning", "bg-warning"],
	] as const)("applies the %s variant", (variant, expected) => {
		expect(badgeVariants({ variant })).toContain(expected);
	});
});
