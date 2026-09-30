import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";

describe("Card", () => {
	it("renders every slot", () => {
		render(
			<Card>
				<CardHeader>
					<CardTitle>social-network</CardTitle>
					<CardDescription>9,892 nodes</CardDescription>
				</CardHeader>
				<CardContent>Body</CardContent>
				<CardFooter>Footer</CardFooter>
			</Card>,
		);

		expect(screen.getByRole("heading", { name: "social-network" })).toBeInTheDocument();
		expect(screen.getByText("9,892 nodes")).toBeInTheDocument();
		expect(screen.getByText("Body")).toBeInTheDocument();
		expect(screen.getByText("Footer")).toBeInTheDocument();
	});

	it("forwards a ref and merges a className", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Card ref={ref} className="w-80" data-testid="card">
				Body
			</Card>,
		);

		expect(ref.current).toBeInstanceOf(HTMLDivElement);
		expect(screen.getByTestId("card")).toHaveClass("w-80");
	});
});

describe("Table", () => {
	it("renders a semantic table", () => {
		render(
			<Table>
				<TableCaption>Node labels</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Label</TableHead>
						<TableHead>Nodes</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow data-state="selected">
						<TableCell>Person</TableCell>
						<TableCell>9,892</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);

		expect(screen.getByRole("table", { name: "Node labels" })).toBeInTheDocument();
		expect(screen.getAllByRole("columnheader")).toHaveLength(2);
		expect(screen.getByRole("cell", { name: "Person" })).toBeInTheDocument();
		expect(screen.getByRole("row", { name: /Person/ })).toHaveAttribute("data-state", "selected");
	});

	it("renders a footer row", () => {
		render(
			<Table>
				<TableBody>
					<TableRow>
						<TableCell>Person</TableCell>
					</TableRow>
				</TableBody>
				<TableFooter data-testid="footer">
					<TableRow>
						<TableCell>Total</TableCell>
					</TableRow>
				</TableFooter>
			</Table>,
		);

		expect(screen.getByTestId("footer").tagName).toBe("TFOOT");
		expect(screen.getByRole("cell", { name: "Total" })).toBeInTheDocument();
	});
});

describe("Tabs", () => {
	it("shows only the active panel and switches on click", async () => {
		render(
			<Tabs defaultValue="graph">
				<TabsList>
					<TabsTrigger value="graph">Graph</TabsTrigger>
					<TabsTrigger value="table">Table</TabsTrigger>
					<TabsTrigger value="schema" disabled>
						Schema
					</TabsTrigger>
				</TabsList>
				<TabsContent value="graph">Canvas</TabsContent>
				<TabsContent value="table">Rows</TabsContent>
				<TabsContent value="schema">Schema panel</TabsContent>
			</Tabs>,
		);

		expect(screen.getByText("Canvas")).toBeInTheDocument();
		expect(screen.queryByText("Rows")).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole("tab", { name: "Table" }));
		expect(screen.getByText("Rows")).toBeInTheDocument();
		expect(screen.queryByText("Canvas")).not.toBeInTheDocument();
	});

	it("ignores a disabled trigger", async () => {
		render(
			<Tabs defaultValue="graph">
				<TabsList>
					<TabsTrigger value="graph">Graph</TabsTrigger>
					<TabsTrigger value="schema" disabled>
						Schema
					</TabsTrigger>
				</TabsList>
				<TabsContent value="graph">Canvas</TabsContent>
				<TabsContent value="schema">Schema panel</TabsContent>
			</Tabs>,
		);

		await userEvent.click(screen.getByRole("tab", { name: "Schema" }));
		expect(screen.getByText("Canvas")).toBeInTheDocument();
	});
});

describe("Tooltip", () => {
	it("reveals its content on hover", async () => {
		render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger>Info</TooltipTrigger>
					<TooltipContent>Cypher read-only mode</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);

		expect(screen.queryByText("Cypher read-only mode")).not.toBeInTheDocument();

		await userEvent.hover(screen.getByText("Info"));
		await waitFor(() => expect(screen.getAllByText("Cypher read-only mode").length).toBeGreaterThan(0));
	});
});
