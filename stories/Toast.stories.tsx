import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/button";
import { ToastAction } from "@/components/toast";
import { Toaster } from "@/components/toaster";
import { toast } from "@/hooks/use-toast";

const meta = {
	title: "Primitives/Toast",
	component: Toaster,
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"Mount `<Toaster />` once near the app root, then call `toast()` from anywhere — no context needed.",
			},
		},
	},
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
	render: (args) => (
		<>
			<div className="flex flex-wrap gap-3">
				<Button onClick={() => toast({ title: "Query finished", description: "25 rows in 4 ms." })}>
					Default
				</Button>
				<Button
					variant="destructive"
					onClick={() =>
						toast({
							variant: "destructive",
							title: "Query failed",
							description: "Invalid input 'RETURN': expected an expression.",
						})
					}
				>
					Destructive
				</Button>
				<Button variant="outline" onClick={() => toast({ variant: "success", title: "Graph created" })}>
					Success
				</Button>
				<Button
					variant="secondary"
					onClick={() =>
						toast({ variant: "warning", title: "Read-only connection", description: "Writes are disabled." })
					}
				>
					Warning
				</Button>
			</div>
			<Toaster {...args} />
		</>
	),
};

export const WithAction: Story = {
	render: (args) => (
		<>
			<Button
				onClick={() =>
					toast({
						title: "Graph deleted",
						description: "social-network was removed.",
						action: <ToastAction altText="Undo the deletion">Undo</ToastAction>,
					})
				}
			>
				Delete graph
			</Button>
			<Toaster {...args} />
		</>
	),
};
