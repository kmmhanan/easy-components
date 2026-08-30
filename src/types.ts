/** Z-order actions, matching the standard "arrange" verbs. */
export type ReorderAction = 'front' | 'forward' | 'backward' | 'back';

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

/** Messages sent from the UI (iframe) to the plugin sandbox (code.ts). */
export type UIToPluginMessage =
  | { type: 'create-components' }
  | { type: 'uncomponent' }
  | { type: 'reorder'; action: ReorderAction }
  | { type: 'rename'; format: CaseFormat };

/** Messages sent from the plugin sandbox (code.ts) to the UI (iframe). */
export type PluginToUIMessage = {
  type: 'selection-changed';
  hasSelection: boolean;
  count: number;
};
