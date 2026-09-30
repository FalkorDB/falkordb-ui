import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { installMatchMedia } from "./match-media";

// Radix relies on browser APIs jsdom does not implement.
beforeEach(() => {
	installMatchMedia();
	Element.prototype.scrollIntoView = vi.fn();
	Element.prototype.hasPointerCapture = vi.fn(() => false);
	Element.prototype.setPointerCapture = vi.fn();
	Element.prototype.releasePointerCapture = vi.fn();

	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};

	globalThis.DOMRect = class {
		constructor(
			public x = 0,
			public y = 0,
			public width = 0,
			public height = 0,
		) {}
		top = 0;
		right = 0;
		bottom = 0;
		left = 0;
		toJSON() {
			return this;
		}
		static fromRect(rect?: DOMRectInit) {
			return new DOMRect(rect?.x, rect?.y, rect?.width, rect?.height);
		}
	} as unknown as typeof DOMRect;
});

afterEach(() => {
	cleanup();
	document.documentElement.className = "";
	document.documentElement.style.colorScheme = "";
	window.localStorage.clear();
});
