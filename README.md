# Easy Components

A Figma plugin with four small utilities for component and layer workflows
that Figma's native tools make awkward:

1. **Create individual components** — select several layers and each one
   becomes its own separate component (Figma's native "Create Component"
   can bundle a multi-selection into one merged component instead).
2. **Un-component** — select one or more components and convert them back
   into plain frames (no native way to do this at all).
3. **Rearrange** — bring to front / forward / backward / send to back for
   the current selection.
4. **Rename** — batch-convert selected layer names into a consistent
   naming convention.

## Rename behavior

Given a name like "Figma icon", the rename tool can produce any of:

| Format       | Example       |
|--------------|---------------|
| kebab-case   | `figma-icon`  |
| snake_case   | `figma_icon`  |
| Title Case   | `Figma Icon`  |
| PascalCase   | `FigmaIcon`   |
| camelCase    | `figmaIcon`   |
| UPPER CASE   | `FIGMA ICON`  |
| UPPERCASE    | `FIGMAICON`   |

It works by detecting word boundaries from existing separators (space,
`-`, `_`, `.`) and from camelCase/PascalCase case transitions — so it can
freely re-convert between any of the formats above, in either direction.

**The one limitation:** a name with no separator and no case transition at
all — like `figmaicon` or `FIGMAICON` — has no recoverable word boundary.
For those, the tool can only toggle between all-lowercase and
all-UPPERCASE; it can't guess where "figma" ends and "icon" begins.

## Setup

```bash
npm install
npm run build
```

In Figma desktop: **Plugins → Development → Import plugin from manifest…**,
select `manifest.json`, then run it from **Plugins → Development → Easy
Components**.

## Development

```bash
npm run watch:code   # rebuild code.ts on change
npm run watch:ui      # rebuild ui.ts + re-inline ui.html on change
npm run typecheck
```

`code.ts` changes need the plugin re-run in Figma to take effect; `ui.ts`/
`ui.html` changes just need the panel reopened.

## Notes

- Un-componenting breaks the link for any existing instances of that
  component — same consequence as deleting a component in Figma's own UI.
- Variant sets (`COMPONENT_SET`) and Sections are skipped by "create
  individual components" — converting a variant set isn't a meaningful
  single-node operation.
- Rearrange groups the selection by parent and reorders each group
  independently, so multi-parent selections behave sensibly.
