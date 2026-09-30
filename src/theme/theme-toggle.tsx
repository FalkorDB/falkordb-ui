import { Moon, Sun } from "lucide-react";

import { Button, type ButtonProps } from "@/components/button";
import { useTheme } from "@/theme/theme-provider";

export type ThemeToggleProps = Omit<ButtonProps, "children" | "onClick">;

export function ThemeToggle({ variant = "ghost", size = "icon", ...props }: ThemeToggleProps) {
	const { resolvedTheme, toggleTheme } = useTheme();
	const label = resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";

	return (
		<Button variant={variant} size={size} onClick={toggleTheme} aria-label={label} {...props}>
			{resolvedTheme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
		</Button>
	);
}
