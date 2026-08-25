import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
	/** What the user picked, which may be `"system"`. */
	theme: Theme;
	/** What is actually on screen — never `"system"`. */
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
	/** Flips between light and dark, resolving `"system"` first. */
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const prefersDark = () =>
	typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolve = (theme: Theme): ResolvedTheme =>
	theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

// Storage can throw when it is disabled or the quota is full; persistence is optional.
const readStoredTheme = (storageKey: string): Theme | null => {
	try {
		const stored = window.localStorage.getItem(storageKey);
		return stored === "light" || stored === "dark" || stored === "system" ? stored : null;
	} catch {
		return null;
	}
};

const writeStoredTheme = (storageKey: string, theme: Theme) => {
	try {
		window.localStorage.setItem(storageKey, theme);
	} catch {
		// Ignore — the theme still applies for this session.
	}
};

export interface ThemeProviderProps {
	children: ReactNode;
	defaultTheme?: Theme;
	/** Set to `null` to opt out of persistence. */
	storageKey?: string | null;
	/** Element the `.dark` class is applied to. Defaults to `<html>`. */
	element?: HTMLElement | null;
}

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "falkordb-ui-theme",
	element,
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window === "undefined" || !storageKey) return defaultTheme;
		return readStoredTheme(storageKey) ?? defaultTheme;
	});
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(theme));

	useEffect(() => {
		const target = element ?? document.documentElement;
		const apply = () => {
			const next = resolve(theme);
			target.classList.toggle("dark", next === "dark");
			target.style.colorScheme = next;
			setResolvedTheme(next);
		};

		apply();
		if (theme !== "system") return;

		// Only "system" needs to react to the OS flipping mid-session.
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		media.addEventListener("change", apply);
		return () => media.removeEventListener("change", apply);
	}, [theme, element]);

	const setTheme = useCallback(
		(next: Theme) => {
			setThemeState(next);
			if (storageKey) writeStoredTheme(storageKey, next);
		},
		[storageKey],
	);

	const toggleTheme = useCallback(() => {
		setTheme(resolve(theme) === "dark" ? "light" : "dark");
	}, [theme, setTheme]);

	const value = useMemo(
		() => ({ theme, resolvedTheme, setTheme, toggleTheme }),
		[theme, resolvedTheme, setTheme, toggleTheme],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used within a <ThemeProvider>");
	return context;
}
