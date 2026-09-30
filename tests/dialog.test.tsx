import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/dialog";

function renderDialog(contentProps: { hideCloseButton?: boolean } = {}) {
	return render(
		<Dialog>
			<DialogTrigger asChild>
				<Button>Delete graph</Button>
			</DialogTrigger>
			<DialogContent {...contentProps}>
				<DialogHeader>
					<DialogTitle>Delete social-network?</DialogTitle>
					<DialogDescription>This removes every node and relationship.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="secondary">Cancel</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>,
	);
}

describe("Dialog", () => {
	it("stays closed until the trigger is used", () => {
		renderDialog();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("opens with an accessible title and description", async () => {
		renderDialog();

		await userEvent.click(screen.getByRole("button", { name: "Delete graph" }));

		const dialog = await screen.findByRole("dialog");
		expect(dialog).toHaveAccessibleName("Delete social-network?");
		expect(dialog).toHaveAccessibleDescription("This removes every node and relationship.");
	});

	it("closes via the built-in close button", async () => {
		renderDialog();

		await userEvent.click(screen.getByRole("button", { name: "Delete graph" }));
		await screen.findByRole("dialog");

		await userEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("closes via DialogClose", async () => {
		renderDialog();

		await userEvent.click(screen.getByRole("button", { name: "Delete graph" }));
		await screen.findByRole("dialog");

		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("closes on Escape", async () => {
		renderDialog();

		await userEvent.click(screen.getByRole("button", { name: "Delete graph" }));
		await screen.findByRole("dialog");

		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("omits the close button when hideCloseButton is set", async () => {
		renderDialog({ hideCloseButton: true });

		await userEvent.click(screen.getByRole("button", { name: "Delete graph" }));
		await screen.findByRole("dialog");

		expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
	});
});
