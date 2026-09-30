import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/badge";
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

const rows = [
	{ label: "Person", nodes: 9_892, indexed: true },
	{ label: "Movie", nodes: 3_741, indexed: true },
	{ label: "Genre", nodes: 21, indexed: false },
];

const meta = {
	title: "Primitives/Table",
	component: Table,
	tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Table {...args}>
			<TableCaption>Node labels in social-network.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Label</TableHead>
					<TableHead className="text-right">Nodes</TableHead>
					<TableHead>Indexed</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.label}>
						<TableCell className="font-medium">{row.label}</TableCell>
						<TableCell className="text-right font-mono">{row.nodes.toLocaleString()}</TableCell>
						<TableCell>
							<Badge variant={row.indexed ? "success" : "secondary"}>{row.indexed ? "Yes" : "No"}</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell>Total</TableCell>
					<TableCell className="text-right font-mono">
						{rows.reduce((sum, row) => sum + row.nodes, 0).toLocaleString()}
					</TableCell>
					<TableCell />
				</TableRow>
			</TableFooter>
		</Table>
	),
};

export const WithSelectedRow: Story = {
	render: (args) => (
		<Table {...args}>
			<TableHeader>
				<TableRow>
					<TableHead>Label</TableHead>
					<TableHead className="text-right">Nodes</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => (
					<TableRow key={row.label} data-state={index === 1 ? "selected" : undefined}>
						<TableCell className="font-medium">{row.label}</TableCell>
						<TableCell className="text-right font-mono">{row.nodes.toLocaleString()}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};
