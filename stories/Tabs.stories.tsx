import type { Meta, StoryObj } from "@storybook/react";
import { Network, Table2, Tag } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";

const meta = {
	title: "Primitives/Tabs",
	component: Tabs,
	tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { defaultValue: "graph" },
	render: (args) => (
		<Tabs {...args}>
			<TabsList>
				<TabsTrigger value="graph">Graph</TabsTrigger>
				<TabsTrigger value="table">Table</TabsTrigger>
				<TabsTrigger value="metadata">Metadata</TabsTrigger>
			</TabsList>
			<TabsContent value="graph" className="text-sm text-muted-foreground">
				The force-directed canvas renders here.
			</TabsContent>
			<TabsContent value="table" className="text-sm text-muted-foreground">
				Raw result rows render here.
			</TabsContent>
			<TabsContent value="metadata" className="text-sm text-muted-foreground">
				Query plan and timings render here.
			</TabsContent>
		</Tabs>
	),
};

export const WithIcons: Story = {
	args: { defaultValue: "graph" },
	render: (args) => (
		<Tabs {...args}>
			<TabsList>
				<TabsTrigger value="graph">
					<Network />
					Graph
				</TabsTrigger>
				<TabsTrigger value="table">
					<Table2 />
					Table
				</TabsTrigger>
				<TabsTrigger value="schema" disabled>
					<Tag />
					Schema
				</TabsTrigger>
			</TabsList>
			<TabsContent value="graph" className="text-sm text-muted-foreground">
				Icons come from lucide-react and are sized automatically.
			</TabsContent>
			<TabsContent value="table" className="text-sm text-muted-foreground">
				Disabled triggers are skipped by keyboard navigation.
			</TabsContent>
		</Tabs>
	),
};
