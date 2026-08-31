/**
 * Sort criteria for rearranging the selected layers among the sibling
 * "slots" they currently occupy — non-selected siblings keep their
 * position, only the selected ones get re-sequenced.
 */
export type SortCriteria =
  | 'name-asc' // A → Z
  | 'name-desc' // Z → A
  | 'x-asc' // left → right
  | 'y-asc' // top → bottom
  | 'size-desc' // largest → smallest
  | 'size-asc'; // smallest → largest

/**
 * Naming conventions the rename tool can produce. When a name has no
 * detectable word boundary (no separator, no case transition — e.g.
 * "figmaicon" or "FIGMAICON"), only 'upper-concat'/'upper-space' resolve to
 * an all-uppercase result and everything else falls back to all-lowercase —
 * there's no way to recover where the words split.
 */
export type CaseFormat =
  | 'kebab' // figma-icon
  | 'snake' // figma_icon
  | 'title-space' // Figma Icon
  | 'pascal' // FigmaIcon
  | 'camel' // figmaIcon
  | 'upper-space' // FIGMA ICON
  | 'upper-concat'; // FIGMAICON

/** How to select the results of the last "Find duplicates" run. */
export type DuplicateSelectMode = 'all' | 'extras';

export interface DuplicateGroupSummary {
  label: string;
  count: number;
}

/** Messages sent from the UI (iframe) to the plugin sandbox (code.ts). */
export type UIToPluginMessage =
  | { type: 'create-components' }
  | { type: 'uncomponent' }
  | { type: 'sort'; criteria: SortCriteria }
  | { type: 'rename'; format: CaseFormat }
  | { type: 'find-duplicates' }
  | { type: 'select-duplicates'; mode: DuplicateSelectMode };

/** Messages sent from the plugin sandbox (code.ts) to the UI (iframe). */
export type PluginToUIMessage =
  | { type: 'selection-changed'; hasSelection: boolean; count: number }
  | { type: 'duplicates-result'; groups: DuplicateGroupSummary[]; totalDuplicateLayers: number };
