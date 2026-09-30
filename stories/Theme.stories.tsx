import type { Meta, StoryObj } from "@storybook/react";

import { ThemeProvider } from "@/theme/theme-provider";
import { ThemeToggle } from "@/theme/theme-toggle";

const surfaces = [
	{ name: "background", className: "bg-background text-foreground border-border" },
	{ name: "card", className: "bg-card text-card-foreground border-border" },
	{ name: "popover", className: "bg-popover text-popover-foreground border-border" },
	{ name: "primary", className: "bg-primary text-primary-foreground border-transparent" },
	{ name: "secondary", className: "bg-secondary text-secondary-foreground border-transparent" },
	{ name: "muted", className: "bg-muted text-muted-foreground border-transparent" },
	{ name: "accent", className: "bg-accent text-accent-foreground border-transparent" },
	{ name: "destructive", className: "bg-destructive text-destructive-foreground border-transparent" },
	{ name: "success", className: "bg-success text-success-foreground border-transparent" },
	{ name: "warning", className: "bg-warning text-warning-foreground border-transparent" },
];

const meta = {
	title: "Theme/Tokens",
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"Every colour is a CSS custom property, so a product can override any of them without forking a component. Use the Theme toolbar to flip light/dark.",
			},
		},
	},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Surfaces: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
			{surfaces.map((surface) => (
				<div
					key={surface.name}
					className={`flex h-24 flex-col justify-end rounded-lg border p-3 text-xs font-medium ${surface.className}`}
				>
					{surface.name}
				</div>
			))}
		</div>
	),
};

export const Brand: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div
				className="flex h-24 items-center justify-center rounded-lg text-sm font-semibold text-white"
				style={{ backgroundImage: "var(--brand-gradient)" }}
			>
				--brand-gradient
			</div>
			<div className="grid grid-cols-3 gap-3">
				{["brand-coral", "brand-orchid", "brand-violet"].map((token) => (
					<div
						key={token}
						className="flex h-20 flex-col justify-end rounded-lg p-3 text-xs font-medium text-white"
						style={{ backgroundColor: `var(--${token})` }}
					>
						{token}
					</div>
				))}
			</div>
		</div>
	),
};

/** ThemeToggle needs a ThemeProvider ancestor and drives the `.dark` class itself. */
export const Toggle: Story = {
	render: () => (
		<ThemeProvider storageKey={null}>
			<div className="flex items-center gap-3 text-sm">
				<ThemeToggle />
				Toggles the `.dark` class on the document element.
			</div>
		</ThemeProvider>
	),
};
