import { describe, expect, it } from "vitest";

import { cn } from "@/lib/cn";

describe("cn", () => {
	it("joins class names", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("drops falsy values", () => {
		expect(cn("a", false, undefined, null, "b")).toBe("a b");
	});

	it("resolves conditional objects and arrays", () => {
		expect(cn(["a", { b: true, c: false }])).toBe("a b");
	});

	it("lets a later Tailwind utility win over an earlier conflicting one", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
		expect(cn("text-sm text-muted-foreground", "text-destructive")).toBe("text-sm text-destructive");
	});
});
