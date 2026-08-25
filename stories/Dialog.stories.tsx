import type { Meta, StoryObj } from "@storybook/react";

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
import { Input } from "@/components/input";

const meta = {
	title: "Primitives/Dialog",
	component: Dialog,
	tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<Dialog {...args}>
			<DialogTrigger asChild>
				<Button>Create graph</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create a graph</DialogTitle>
					<DialogDescription>
						Names must be unique per connection and cannot be changed later.
					</DialogDescription>
				</DialogHeader>
				<Input placeholder="Graph name" />
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Cancel</Button>
					</DialogClose>
					<Button>Create</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const Destructive: Story = {
	render: (args) => (
		<Dialog {...args}>
			<DialogTrigger asChild>
				<Button variant="destructive">Delete graph</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete social-network?</DialogTitle>
					<DialogDescription>
						This permanently removes 114,342 nodes and 291,880 relationships. It cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Cancel</Button>
					</DialogClose>
					<Button variant="destructive">Delete</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};
