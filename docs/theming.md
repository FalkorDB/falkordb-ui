# Theming

Every colour, radius and font in `@falkordb/ui` is a CSS custom property, defined in [`src/theme/theme.css`](../src/theme/theme.css). A product can rebrand without forking a component.

[Storybook: Theme tokens](https://falkordb.github.io/falkordb-ui/?path=/docs/theme-tokens--docs)

## Override a token

```css
:root {
	--primary: hsl(200 100% 50%);
}

.dark {
	--primary: hsl(200 100% 60%);
}
```

Light values live on `:root` and dark values on `.dark`, so override both when a colour should differ between themes.

## Tokens

| Group    | Tokens                                                                                      |
| -------- | ------------------------------------------------------------------------------------------- |
| Surfaces | `--background`, `--foreground`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent` |
| Intent   | `--primary`, `--destructive`, `--success`, `--warning`                                      |
| Chrome   | `--border`, `--input`, `--ring`, `--radius`                                                 |
| Brand    | `--brand-coral`, `--brand-orchid`, `--brand-violet`, `--brand-gradient`                     |
| Type     | `--font-sans`, `--font-mono`                                                                |

- Surface and intent tokens have a matching `-foreground` pair, for example `--primary-foreground`. `--background` pairs with `--foreground`.
- `--radius` drives the Tailwind `rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-xl` scale.
- With the [Tailwind v4 setup](./getting-started.md#option-2--tailwind-v4-source), every solid colour token is also a utility: `bg-primary`, `text-muted-foreground`, `border-border`, `bg-brand-coral` and so on. `--brand-gradient` has no utility; use it as `background-image: var(--brand-gradient)`.

## Dark mode

The dark palette applies under a `dark` class on any ancestor element. `ThemeProvider` manages that class for you.

```tsx
import { ThemeProvider } from "@falkordb/ui";

<ThemeProvider defaultTheme="system">
	<App />
</ThemeProvider>;
```

### `ThemeProvider`

| Prop           | Type                            | Default               | Description                                                             |
| -------------- | ------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `defaultTheme` | `"light" \| "dark" \| "system"` | `"system"`            | Theme used until the user picks one.                                    |
| `storageKey`   | `string \| null`                | `"falkordb-ui-theme"` | `localStorage` key for the user's choice. `null` turns off persistence. |
| `element`      | `HTMLElement \| null`           | `<html>`              | Element that receives the `dark` class and `color-scheme`.              |

While the theme is `"system"`, the provider follows the OS setting, including changes mid-session. Storage errors, for example in private browsing, are ignored, and the theme still applies for the session.

### `useTheme()`

Reads and changes the theme. It throws when called outside a `ThemeProvider`.

```tsx
import { useTheme } from "@falkordb/ui";

function ThemeLabel() {
	const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
	return <button onClick={toggleTheme}>{resolvedTheme}</button>;
}
```

| Field           | Type                            | Description                                               |
| --------------- | ------------------------------- | --------------------------------------------------------- |
| `theme`         | `"light" \| "dark" \| "system"` | What the user picked.                                     |
| `resolvedTheme` | `"light" \| "dark"`             | What is on screen; never `"system"`.                      |
| `setTheme`      | `(theme) => void`               | Sets and persists the theme.                              |
| `toggleTheme`   | `() => void`                    | Flips between light and dark, resolving `"system"` first. |

### `ThemeToggle`

A ready-made icon button that calls `toggleTheme`. It shows a sun in dark mode and a moon in light mode, and labels itself "Switch to light theme" or "Switch to dark theme". It accepts every [`Button`](https://falkordb.github.io/falkordb-ui/?path=/docs/primitives-button--docs) prop except `children` and `onClick`. With `variant` and `size` left at `"none"`, it adds a 36px square hit target, rounded corners and an accent hover.

```tsx
<ThemeToggle tooltip="Toggle theme" />
```

## Merging classes with `cn()`

`cn()` combines [`clsx`](https://github.com/lukeed/clsx) and [`tailwind-merge`](https://github.com/dcastil/tailwind-merge): it accepts strings, arrays and conditional objects, and a later Tailwind class overrides a conflicting earlier one. Every component merges its `className` this way.

```tsx
import { cn } from "@falkordb/ui";

<div className={cn("p-4 text-sm", isActive && "bg-accent", className)} />;
```

## Fonts

`--font-sans` names `HyperlegibleSans` and `--font-mono` names `JetBrains Mono`, each followed by system fallbacks. The library does not ship the font files: apps that already load the FalkorDB webfonts get them for free, and other apps fall back to system fonts. To use different fonts, override the two tokens.
