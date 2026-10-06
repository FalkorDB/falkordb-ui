# Web Components

Framework-agnostic components published from this repository, next to `@falkordb/ui`. Each one works in React, Angular, Vue, Svelte or plain HTML. Styles live in the component's shadow DOM, so the host app needs neither React nor Tailwind.

| Package | Element | Docs |
| --- | --- | --- |
| `@falkordb/canvas` | `<falkordb-canvas>` | [canvas/README.md](./canvas/README.md) |

## How web components differ from the React components

| | React components | Web components |
| --- | --- | --- |
| Import | `@falkordb/ui` | one package per component |
| Requires React | Yes | No |
| Requires Tailwind | Yes | No |
| Works in Angular/Vue | With wrappers | Natively |
| Styled by host app | Tailwind classes and theme tokens | CSS variables, slots and `::part` |
| Data passed via | Props | JS methods and attributes |
| Events | React callbacks | DOM CustomEvents |

## Adding a web component

1. Create `web-components/<name>/` with its own `package.json`. Give it a `build` script, plus `lint`, `typecheck` and `test` scripts if it has them; CI runs whichever exist.
2. Add `<name>` to the `web-components` matrix in `.github/workflows/ci.yml`.
3. Release it by creating a GitHub Release tagged `<name>-v<version>`.
