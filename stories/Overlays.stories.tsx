import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/drawer";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";

const meta = {
	title: "Primitives/Overlays",
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Menu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary">Layout</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuLabel>Canvas</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value="force">
					<DropdownMenuRadioItem value="force">Force</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="tree">Tree</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem checked>Show labels</DropdownMenuCheckboxItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>PNG</DropdownMenuItem>
						<DropdownMenuItem>JSON</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem>
					Fit to screen
					<DropdownMenuShortcut>⇧F</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const PopoverPanel: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="secondary">Graph info</Button>
			</PopoverTrigger>
			<PopoverContent className="text-sm">social-network · 1,204 nodes · 3,981 edges</PopoverContent>
		</Popover>
	),
};

export const Hints: Story = {
	render: () => (
		<div className="flex items-center gap-8 text-sm">
			<span className="flex items-center gap-2">
				Hover <HintTip>Defaults to localhost.</HintTip>
			</span>
			<span className="flex items-center gap-2">
				Tap <HintTip mode="popover">Opens on tap, for touch screens.</HintTip>
			</span>
		</div>
	),
};

export const BottomDrawer: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger asChild>
				<Button>Open drawer</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Add user</DrawerTitle>
					<DrawerDescription>Grant access to this FalkorDB instance.</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter>
					<Button>Create</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
};
