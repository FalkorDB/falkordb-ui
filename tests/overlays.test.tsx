import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { HintTip } from "@/components/hint-tip";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/popover";

describe("AlertDialog", () => {
	function Confirm({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
		return (
			<AlertDialog>
				<AlertDialogTrigger>Delete users</AlertDialogTrigger>
				<AlertDialogContent overlayClassName="custom-overlay">
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					</AlertDialogHeader>
					<AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	it("asks for confirmation and runs the action", async () => {
		const onConfirm = vi.fn();
		render(<Confirm onConfirm={onConfirm} />);

		await userEvent.click(screen.getByRole("button", { name: "Delete users" }));
		const dialog = screen.getByRole("alertdialog", { name: "Are you absolutely sure?" });
		expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
		expect(document.querySelector(".custom-overlay")).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(onConfirm).toHaveBeenCalledOnce();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("closes without acting on cancel", async () => {
		const onConfirm = vi.fn();
		render(<Confirm onConfirm={onConfirm} />);

		await userEvent.click(screen.getByRole("button", { name: "Delete users" }));
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onConfirm).not.toHaveBeenCalled();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});
});

describe("DropdownMenu", () => {
	function Menu({ preventOutsideClose = false, onSelect = vi.fn() }) {
		return (
			<>
				<button type="button">outside</button>
				<DropdownMenu>
					<DropdownMenuTrigger>Layout</DropdownMenuTrigger>
					<DropdownMenuContent preventOutsideClose={preventOutsideClose}>
						<DropdownMenuLabel inset>Layouts</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem inset onSelect={onSelect}>
							Force
							<DropdownMenuShortcut>⌘F</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuCheckboxItem checked>Labels</DropdownMenuCheckboxItem>
						<DropdownMenuRadioGroup value="tree">
							<DropdownMenuRadioItem value="tree">Tree</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	}

	it("opens, selects an item and closes", async () => {
		const onSelect = vi.fn();
		render(<Menu onSelect={onSelect} />);

		await userEvent.click(screen.getByRole("button", { name: "Layout" }));
		expect(screen.getByRole("menuitemcheckbox", { name: "Labels" })).toHaveAttribute("aria-checked", "true");
		expect(screen.getByRole("menuitemradio", { name: "Tree" })).toHaveAttribute("aria-checked", "true");

		await userEvent.click(screen.getByRole("menuitem", { name: /Force/ }));
		expect(onSelect).toHaveBeenCalledOnce();
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("closes on Escape by default", async () => {
		render(<Menu />);

		await userEvent.click(screen.getByRole("button", { name: "Layout" }));
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("stays open on Escape and outside clicks when told to", async () => {
		render(<Menu preventOutsideClose />);

		await userEvent.click(screen.getByRole("button", { name: "Layout" }));
		await userEvent.keyboard("{Escape}");
		expect(screen.getByRole("menu")).toBeInTheDocument();
	});
});

describe("DropdownMenu submenu", () => {
	function Nested({ preventOutsideClose = false }) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger>Layout</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger inset>Tree</DropdownMenuSubTrigger>
						<DropdownMenuSubContent preventOutsideClose={preventOutsideClose}>
							<DropdownMenuItem>Top down</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	async function openSub() {
		await userEvent.click(screen.getByRole("button", { name: "Layout" }));
		const trigger = screen.getByRole("menuitem", { name: "Tree" });
		expect(trigger).toHaveClass("pl-8");
		trigger.focus();
		await userEvent.keyboard("{ArrowRight}");
		return screen.findByRole("menuitem", { name: "Top down" });
	}

	it("opens a submenu and closes it on Escape", async () => {
		render(<Nested />);

		expect(await openSub()).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("menuitem", { name: "Top down" })).not.toBeInTheDocument();
	});

	it("keeps a submenu open on Escape when told to", async () => {
		render(<Nested preventOutsideClose />);

		expect(await openSub()).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		expect(screen.getByRole("menuitem", { name: "Top down" })).toBeInTheDocument();
	});
});

describe("Popover", () => {
	it("opens on click and closes from inside", async () => {
		render(
			<Popover>
				<PopoverTrigger>Graphs</PopoverTrigger>
				<PopoverContent className="custom">
					<p>Pick a graph</p>
					<PopoverClose>Done</PopoverClose>
				</PopoverContent>
			</Popover>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Graphs" }));
		expect(screen.getByRole("dialog")).toHaveClass("custom");

		await userEvent.click(screen.getByRole("button", { name: "Done" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

describe("HintTip", () => {
	it("shows the hint on hover as a tooltip", async () => {
		render(<HintTip data-testid="hint">Defaults to localhost.</HintTip>);

		const trigger = screen.getByRole("button", { name: "More information" });
		expect(trigger).toHaveAttribute("data-testid", "hint");
		await userEvent.hover(trigger);
		expect(await screen.findAllByText("Defaults to localhost.")).not.toHaveLength(0);
	});

	it("opens on tap as a popover", async () => {
		render(
			<HintTip mode="popover" contentClassName="custom">
				Defaults to localhost.
			</HintTip>,
		);

		await userEvent.click(screen.getByRole("button", { name: "More information" }));
		expect(screen.getByRole("dialog")).toHaveClass("custom");
		expect(screen.getByRole("dialog")).toHaveTextContent("Defaults to localhost.");
	});

	it("uses a custom trigger", () => {
		render(<HintTip trigger={<span>?</span>}>Hint</HintTip>);
		expect(screen.getByRole("button", { name: "More information" })).toHaveTextContent("?");
	});
});
