# Documentation

Guides and reference for [`@falkordb/ui`](../README.md). Every component also has live, interactive examples in [Storybook](https://falkordb.github.io/falkordb-ui/).

## Guides

- [Getting started](./getting-started.md): install the package, load the styles and render your first component.
- [Theming](./theming.md): design tokens, dark mode, `ThemeProvider`, `ThemeToggle` and `cn()`.
- [Releasing](./releasing.md): how the packages in this repository are published (for maintainers).

## Components

### Form controls

| Component                                 | Description                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| [Button](./components/button.md)          | Button with variants, a loading state, a trailing label and a tooltip. |
| [Input](./components/input.md)            | Single-line text field.                                                |
| [Textarea](./components/textarea.md)      | Multi-line text field.                                                 |
| [Label](./components/label.md)            | Accessible label for a control.                                        |
| [Select](./components/select.md)          | Dropdown for choosing one value.                                       |
| [Checkbox](./components/checkbox.md)      | Checkbox with an indeterminate state.                                  |
| [Switch](./components/switch.md)          | On/off toggle.                                                         |
| [RadioGroup](./components/radio-group.md) | Pick exactly one option.                                               |
| [Slider](./components/slider.md)          | Draggable value or range.                                              |
| [Form](./components/form.md)              | Validated field stack built from a config, plus composable parts.      |

### Display

| Component                            | Description                            |
| ------------------------------------ | -------------------------------------- |
| [Badge](./components/badge.md)       | Pill for a status, count or tag.       |
| [Card](./components/card.md)         | Bordered surface for grouped content.  |
| [Table](./components/table.md)       | Styled table with a scrolling wrapper. |
| [Progress](./components/progress.md) | Progress bar.                          |
| [Skeleton](./components/skeleton.md) | Pulsing loading placeholder.           |

### Overlays

| Component                                     | Description                                        |
| --------------------------------------------- | -------------------------------------------------- |
| [Tooltip](./components/tooltip.md)            | Short label on hover or focus.                     |
| [HintTip](./components/hint-tip.md)           | Info icon that reveals a hint, also on touch.      |
| [Popover](./components/popover.md)            | Floating panel anchored to a trigger.              |
| [DropdownMenu](./components/dropdown-menu.md) | Menu of actions, with checkboxes and submenus.     |
| [Dialog](./components/dialog.md)              | Modal window for a focused task.                   |
| [AlertDialog](./components/alert-dialog.md)   | Confirm or cancel a destructive action.            |
| [Drawer](./components/drawer.md)              | Draggable panel from the screen edge.              |
| [Toast](./components/toast.md)                | Non-blocking notification, callable from anywhere. |

### Layout and patterns

| Component                              | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [Tabs](./components/tabs.md)           | Switch between views in the same space.                |
| [Resizable](./components/resizable.md) | Panels with draggable dividers.                        |
| [Chat](./components/chat.md)           | Header, conversation, input row and footer for a chat. |

## Web components

Framework-free web components, such as [`@falkordb/canvas`](../web-components/canvas/README.md), are documented in their own READMEs. See the [web components overview](../web-components/README.md).
