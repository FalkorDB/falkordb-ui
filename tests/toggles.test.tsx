import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/components/checkbox";
import { Switch } from "@/components/switch";

describe("Checkbox", () => {
	it("toggles when clicked", async () => {
		const onCheckedChange = vi.fn();
		render(<Checkbox aria-label="Include orphans" onCheckedChange={onCheckedChange} />);

		const checkbox = screen.getByRole("checkbox", { name: "Include orphans" });
		expect(checkbox).toHaveAttribute("data-state", "unchecked");

		await userEvent.click(checkbox);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("renders the indeterminate indicator when checked is 'indeterminate'", () => {
		const { container } = render(<Checkbox aria-label="Select all" checked="indeterminate" />);

		expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "indeterminate");
		// The Minus glyph has a single horizontal path; Check has a tick.
		expect(container.querySelector(".lucide-minus")).toBeInTheDocument();
	});

	it("renders the check indicator when checked", () => {
		const { container } = render(<Checkbox aria-label="Select all" checked />);

		expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked");
		expect(container.querySelector(".lucide-check")).toBeInTheDocument();
	});

	it("does not toggle while disabled", async () => {
		const onCheckedChange = vi.fn();
		render(<Checkbox aria-label="Include orphans" disabled onCheckedChange={onCheckedChange} />);

		await userEvent.click(screen.getByRole("checkbox"));
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("merges a consumer className", () => {
		render(<Checkbox aria-label="Include orphans" className="size-6" />);
		expect(screen.getByRole("checkbox")).toHaveClass("size-6");
	});
});

describe("Switch", () => {
	it("toggles when clicked", async () => {
		function Controlled() {
			const [checked, setChecked] = useState(false);
			return <Switch aria-label="Read only" checked={checked} onCheckedChange={setChecked} />;
		}
		render(<Controlled />);

		const toggle = screen.getByRole("switch", { name: "Read only" });
		expect(toggle).toHaveAttribute("data-state", "unchecked");

		await userEvent.click(toggle);
		expect(toggle).toHaveAttribute("data-state", "checked");
	});

	it("does not toggle while disabled", async () => {
		const onCheckedChange = vi.fn();
		render(<Switch aria-label="Read only" disabled onCheckedChange={onCheckedChange} />);

		await userEvent.click(screen.getByRole("switch"));
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("merges a consumer className", () => {
		render(<Switch aria-label="Read only" className="w-16" />);
		expect(screen.getByRole("switch")).toHaveClass("w-16");
	});
});
