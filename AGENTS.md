# AGENTS.md

Instructions for AI coding agents working on this repository. To _use_ `@falkordb/ui` in an app, read [`llms.txt`](./README.md#ai-agents) instead.

## Layout

- `src/components/<name>.tsx`: one component, or one family of parts such as `Dialog` and `DialogContent`, per file. Built on Radix UI where a primitive fits, and styled with Tailwind CSS v4 classes.
- `src/index.ts`: the package's only entry point. Export every public component, hook and type from here.
- `src/theme/`: design tokens (`theme.css`), base rules (`base.css`), `ThemeProvider` and `ThemeToggle`.
- `src/lib/cn.ts`: `cn()`, which merges class names with `clsx` and `tailwind-merge`.
- `tests/`: Vitest and Testing Library tests (jsdom).
- `stories/`: Storybook stories and the component reference, one `<Component>.mdx` page per component.
- `docs/`: guides. `scripts/build-llms.ts` turns them and the MDX pages into the docs for AI agents.
- `web-components/`: framework-free packages, each with its own build, lint, test and style config.

## Commands

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test              # or npm run coverage, which CI runs and which requires 100% coverage of src/
npm run build
npm run build-storybook
```

CI runs all of these on pull requests to `main`. Run them before you finish.

## Conventions

- Prettier formats with tabs and a 110-character line width. Run `npm run format` rather than formatting by hand.
- Merge class names with `cn()`, so a consumer's `className` overrides the defaults.
- Forward refs and spread the remaining props onto the underlying element, as the existing components do.
- Keep `src/` at 100% test coverage.
- When you change a component's API or behaviour, update its `stories/<Component>.mdx` page in the same change. Write the page in plain Markdown: the agent docs build fails on MDX syntax other than imports and the `<Meta>` and `<Canvas>` lines.
- When you add a component, also export it from `src/index.ts`, add a row to the component table in `README.md`, and register its MDX page in `COMPONENTS` in `scripts/build-llms.ts`. Register a new guide in `docs/` in `GUIDES`, or in `EXCLUDED_DOCS` if it is not about using the package.
- Write commit messages as Conventional Commits, for example `feat(button): add a size` or `docs: fix the Tabs example`.
