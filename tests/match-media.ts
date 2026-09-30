type Listener = (event: MediaQueryListEvent) => void;

let prefersDark = false;
const listeners = new Set<Listener>();

/** Flips the OS colour-scheme preference and notifies subscribers. */
export function setPrefersDark(value: boolean) {
	prefersDark = value;
	listeners.forEach((listener) => listener({ matches: value } as MediaQueryListEvent));
}

export function installMatchMedia() {
	prefersDark = false;
	listeners.clear();

	window.matchMedia = ((query: string) => ({
		matches: query.includes("prefers-color-scheme: dark") && prefersDark,
		media: query,
		onchange: null,
		addEventListener: (_: string, listener: Listener) => void listeners.add(listener),
		removeEventListener: (_: string, listener: Listener) => void listeners.delete(listener),
		addListener: (listener: Listener) => void listeners.add(listener),
		removeListener: (listener: Listener) => void listeners.delete(listener),
		dispatchEvent: () => false,
	})) as unknown as typeof window.matchMedia;
}
