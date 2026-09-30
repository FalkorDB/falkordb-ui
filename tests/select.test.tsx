import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/select";

function renderSelect(props: { onValueChange?: (value: string) => void; disabled?: boolean } = {}) {
	return render(
		<Select onValueChange={props.onValueChange}>
			<SelectTrigger aria-label="Graph" className="w-60">
				<SelectValue placeholder="Pick a graph" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Graphs</SelectLabel>
					<SelectItem value="social-network">social-network</SelectItem>
					<SelectItem value="movies">movies</SelectItem>
					<SelectSeparator />
					<SelectItem value="archived" disabled={props.disabled}>
						archived
					</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>,
	);
}

describe("Select", () => {
	it("shows the placeholder until a value is picked", () => {
		renderSelect();
		expect(screen.getByRole("combobox", { name: "Graph" })).toHaveTextContent("Pick a graph");
	});

	it("opens on click and reports the picked value", async () => {
		const onValueChange = vi.fn();
		renderSelect({ onValueChange });

		await userEvent.click(screen.getByRole("combobox", { name: "Graph" }));

		const listbox = await screen.findByRole("listbox");
		expect(within(listbox).getByText("Graphs")).toBeInTheDocument();

		await userEvent.click(within(listbox).getByRole("option", { name: "movies" }));
		expect(onValueChange).toHaveBeenCalledWith("movies");
	});

	it("renders the selected value in the trigger", async () => {
		renderSelect();

		await userEvent.click(screen.getByRole("combobox", { name: "Graph" }));
		await userEvent.click(await screen.findByRole("option", { name: "social-network" }));

		expect(screen.getByRole("combobox", { name: "Graph" })).toHaveTextContent("social-network");
	});

	it("does not select a disabled item", async () => {
		const onValueChange = vi.fn();
		renderSelect({ onValueChange, disabled: true });

		await userEvent.click(screen.getByRole("combobox", { name: "Graph" }));
		const option = await screen.findByRole("option", { name: "archived" });
		expect(option).toHaveAttribute("data-disabled");

		await userEvent.click(option);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("merges a consumer className on the trigger", () => {
		renderSelect();
		expect(screen.getByRole("combobox", { name: "Graph" })).toHaveClass("w-60");
	});
});
