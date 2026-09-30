import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Input } from "@/components/input";
import { Select, SelectTrigger, SelectValue } from "@/components/select";
import { Switch } from "@/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Textarea } from "@/components/textarea";

// FalkorDB products draw no focus border on anything, so no primitive may
// bring one back through a ring (box-shadow) that `outline: none` can't reach.
describe("focus styling", () => {
	it("leaves every focusable primitive without a focus ring", () => {
		const { container } = render(
			<>
				<Button>Run</Button>
				<Input aria-label="name" />
				<Textarea aria-label="notes" />
				<Checkbox aria-label="agree" />
				<Switch aria-label="dark" />
				<Select>
					<SelectTrigger aria-label="graph">
						<SelectValue />
					</SelectTrigger>
				</Select>
				<Tabs defaultValue="a">
					<TabsList>
						<TabsTrigger value="a">A</TabsTrigger>
					</TabsList>
					<TabsContent value="a">Panel</TabsContent>
				</Tabs>
			</>,
		);

		const focusable = container.querySelectorAll("button, input, textarea, [role='tabpanel']");
		expect(focusable.length).toBeGreaterThanOrEqual(8);
		for (const el of focusable) {
			expect(el.className, el.outerHTML).not.toMatch(/(^|\s)(focus(-visible)?:)?ring-(?!0)/);
		}
	});
});
