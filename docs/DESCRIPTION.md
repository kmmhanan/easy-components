Fast component creation and smart renaming

## Why Easy Components

Figma's own tools have a few gaps around components and layer hygiene:
selecting several layers and hitting Create Component can merge them into
one component instead of giving each its own, there's no built-in way to
turn a component back into a frame, reordering more than a couple of
layers means dragging them one at a time, and renaming a batch of layers
into a consistent format means doing it by hand.

Easy Components is five small, focused tools for exactly these gaps — no
setup, no persistent state, just select some layers and click a button.

## Features

- **Create individual components** — select several layers and each one
  becomes its own separate component, not one component containing all of
  them. Works on frames, groups, and loose shapes/vectors/text alike.
- **Un-component** — select one or more components and convert them
  straight back into plain frames, in one click.
- **Rearrange** — sort the selection by name (A→Z or Z→A), horizontal or
  vertical position, or size (largest or smallest first). Non-selected
  layers keep their exact position.
- **Rename** — batch-convert selected layer names into a consistent naming
  convention: kebab-case, snake_case, Title Case, PascalCase, camelCase,
  UPPER CASE, or UPPERCASE. Works in either direction, so you can freely
  re-convert between formats.
- **Duplicate finder** — checks the selection for layers that look like
  accidental duplicates and lists each group with a count, with one-click
  actions to select all of them or just the redundant extras.

## How renaming works

Given a name like "Figma icon", the rename tool can produce:

- figma-icon
- figma_icon
- Figma Icon
- FigmaIcon
- figmaIcon
- FIGMA ICON
- FIGMAICON

It detects word boundaries from separators (space, -, \_, .) and from
camelCase/PascalCase transitions, so any of these can be re-converted into
any other, in either direction.

One limitation, by design: a name with no separator and no case
transition at all — like figmaicon or FIGMAICON — has no recoverable word
boundary. For those, the tool can only toggle between all-lowercase and
all-UPPERCASE.

## Example

Select a batch of icon layers named inconsistently — some "Icon Name",
some "icon-name", a couple of accidental duplicates mixed in. Run Find
Duplicates to spot and remove the extras, Rearrange to sort them
alphabetically, then Rename to bring every name into the same format —
all in a few clicks, no manual cleanup.

## Privacy

Easy Components runs entirely locally. It doesn't send your designs, layer
names, or any other data anywhere — network access is disabled in the
plugin itself.

## Feedback

Found a bug or have a feature idea? Leave a comment below — I read all of
them.

## Support this plugin

If Easy Components saves you time, consider [buying me a coffee](https://www.buymeacoffee.com/kmmhanan).
More at [kmmhanan.com](https://kmmhanan.com).

## Changelog

**v1.0.0** — Initial release: individual component creation, un-component,
rearrange by name/position/size, batch rename into 7 naming conventions,
duplicate finder.
