import { Moon, Sun } from "lucide-react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/theme-provider";

export type ThemeToggleProps = Omit<ButtonProps, "children" | "onClick">;

export function ThemeToggle({ variant = "none", size = "none", className, ...props }: ThemeToggleProps) {
	const { resolvedTheme, toggleTheme } = useTheme();
	const label = resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";

	return (
		<Button
			variant={variant}
			size={size}
			// Unstyled by default, it still needs an icon-button hit target.
			className={cn(
				variant === "none" &&
					size === "none" &&
					"size-9 justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
				className,
			)}
			onClick={toggleTheme}
			aria-label={label}
			{...props}
		>
			{resolvedTheme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
		</Button>
	);
}
