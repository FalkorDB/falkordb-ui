import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/drawer";
import { Label } from "@/components/label";
import { Progress } from "@/components/progress";
import { RadioGroup, RadioGroupItem } from "@/components/radio-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
import { Skeleton } from "@/components/skeleton";
import { Slider } from "@/components/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/table";

describe("Label", () => {
	it("labels its control", () => {
		render(
			<>
				<Label htmlFor="name">Token name</Label>
				<input id="name" />
			</>,
		);
		expect(screen.getByLabelText("Token name")).toBeInTheDocument();
	});
});

describe("Progress", () => {
	it("reports its value and fills that share of the bar", () => {
		render(<Progress value={40} indicatorClassName="custom" />);

		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuenow", "40");
		const indicator = bar.firstElementChild as HTMLElement;
		expect(indicator).toHaveClass("custom");
		expect(indicator.style.transform).toBe("translateX(-60%)");
	});

	it("draws an empty bar without a value", () => {
		render(<Progress />);
		expect((screen.getByRole("progressbar").firstElementChild as HTMLElement).style.transform).toBe(
			"translateX(-100%)",
		);
	});
});

describe("RadioGroup", () => {
	it("picks one option", async () => {
		const onValueChange = vi.fn();
		render(
			<RadioGroup defaultValue="host" onValueChange={onValueChange}>
				<RadioGroupItem value="host" aria-label="Host" />
				<RadioGroupItem value="url" aria-label="URL" />
			</RadioGroup>,
		);

		expect(screen.getByRole("radio", { name: "Host" })).toBeChecked();
		await userEvent.click(screen.getByRole("radio", { name: "URL" }));
		expect(onValueChange).toHaveBeenCalledWith("url");
	});
});

describe("Skeleton", () => {
	it("pulses and forwards props", () => {
		render(<Skeleton data-testid="skeleton" className="h-4" />);
		expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse", "h-4");
	});
});

describe("Slider", () => {
	it("renders one thumb per value", () => {
		render(<Slider defaultValue={[2, 8]} max={10} />);
		expect(screen.getAllByRole("slider")).toHaveLength(2);
	});

	it("defaults to a single thumb", () => {
		render(<Slider />);
		expect(screen.getAllByRole("slider")).toHaveLength(1);
	});

	it("lets the caller wrap each thumb", () => {
		render(
			<Slider
				value={[5]}
				max={10}
				renderThumb={(thumb, index) => <div data-testid={`wrap-${index}`}>{thumb}</div>}
			/>,
		);

		expect(screen.getByTestId("wrap-0")).toContainElement(screen.getByRole("slider"));
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "5");
	});
});

describe("Drawer", () => {
	it("opens its content with a grab handle", async () => {
		render(
			<Drawer>
				<DrawerTrigger>Menu</DrawerTrigger>
				<DrawerContent side="right" handleClassName="custom-handle">
					<DrawerHeader>
						<DrawerTitle>Settings</DrawerTitle>
						<DrawerDescription>Browser preferences</DrawerDescription>
					</DrawerHeader>
					<DrawerFooter>footer</DrawerFooter>
				</DrawerContent>
			</Drawer>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Menu" }));
		const drawer = screen.getByRole("dialog", { name: "Settings" });
		expect(drawer).toHaveClass("right-0");
		expect(drawer.querySelector(".custom-handle")).toBeInTheDocument();
	});
});

describe("Drawer sides", () => {
	it.each([
		["bottom", "bottom-0", "w-[100px]"],
		["left", "left-0", "mr-2"],
	] as const)("anchors a %s drawer and turns its handle to match", async (side, edge, handle) => {
		render(
			<Drawer>
				<DrawerTrigger>Open</DrawerTrigger>
				<DrawerContent side={side} overlayClassName="custom-overlay">
					<DrawerTitle>Panel</DrawerTitle>
					<DrawerDescription>Details</DrawerDescription>
				</DrawerContent>
			</Drawer>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Open" }));
		const drawer = screen.getByRole("dialog", { name: "Panel" });
		expect(drawer).toHaveClass(edge);
		expect(drawer.firstElementChild).toHaveClass(handle);
		expect(document.querySelector(".custom-overlay")).toBeInTheDocument();
	});
});

describe("Resizable", () => {
	it("renders panels around a handle with a grip", () => {
		render(
			<ResizablePanelGroup orientation="horizontal">
				<ResizablePanel>left</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel>right</ResizablePanel>
			</ResizablePanelGroup>,
		);

		expect(screen.getByText("left")).toBeInTheDocument();
		expect(screen.getByRole("separator").querySelector("svg")).toBeInTheDocument();
	});
});

describe("Table container", () => {
	it("passes a ref, scroll handler and attributes to the scrolling wrapper", () => {
		const containerRef = createRef<HTMLDivElement>();
		const onScroll = vi.fn();
		render(
			<Table containerProps={{ ref: containerRef, id: "tableContent", className: "h-40", onScroll }}>
				<TableBody>
					<TableRow>
						<TableCell>row</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);

		const container = containerRef.current!;
		expect(container).toHaveAttribute("id", "tableContent");
		expect(container).toHaveClass("relative", "overflow-auto", "h-40");
		expect(container.firstElementChild?.tagName).toBe("TABLE");

		container.dispatchEvent(new Event("scroll"));
		expect(onScroll).toHaveBeenCalledOnce();
	});
});
