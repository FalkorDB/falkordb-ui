import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";

const meta = {
	title: "Primitives/Card",
	component: Card,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="max-w-sm">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Card {...args}>
			<CardHeader>
				<CardTitle>social-network</CardTitle>
				<CardDescription>114,342 nodes · 291,880 relationships</CardDescription>
			</CardHeader>
			<CardContent className="text-sm text-muted-foreground">
				Last queried 4 minutes ago. Indexes are up to date.
			</CardContent>
			<CardFooter className="gap-2">
				<Button size="sm">Open</Button>
				<Button size="sm" variant="destructive">
					Delete
				</Button>
			</CardFooter>
		</Card>
	),
};

export const ContentOnly: Story = {
	render: (args) => (
		<Card {...args}>
			<CardContent className="p-6 text-sm">A bare container with no header or footer.</CardContent>
		</Card>
	),
};
