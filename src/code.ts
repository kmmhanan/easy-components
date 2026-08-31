import type { CaseFormat, PluginToUIMessage, SortCriteria, UIToPluginMessage } from './types';

figma.showUI(__html__, { width: 320, height: 480, title: 'Easy Components', themeColors: true });

function post(msg: PluginToUIMessage): void {
  figma.ui.postMessage(msg);
}

function isContainerNode(node: SceneNode): node is SceneNode & ChildrenMixin {
  return 'children' in node;
}

function hasExpandedProp(node: BaseNode): node is BaseNode & { expanded: boolean } {
  return 'expanded' in node;
}

/**
 * Figma's API always shows a freshly-created container expanded in the
 * layers panel, regardless of what its source node looked like — this is a
 * known API quirk, not something we're causing. Explicitly set `expanded`
 * AFTER children have been moved in (moving children can itself flip it
 * back to true), so the final state matches the original node's collapsed/
 * expanded state instead of forcing it open.
 */
function matchExpandedState(source: SceneNode, target: BaseNode): void {
  if (hasExpandedProp(target)) {
    target.expanded = hasExpandedProp(source) ? source.expanded : false;
  }
}

// ---------------------------------------------------------------------------
// Shared: copying frame-like visual properties across a type change
// ---------------------------------------------------------------------------

const FRAME_LIKE_PROPS = [
  'fills',
  'strokes',
  'strokeWeight',
  'strokeAlign',
  'strokeCap',
  'strokeJoin',
  'dashPattern',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'clipsContent',
  'opacity',
  'blendMode',
  'effects',
  'rotation',
  'layoutMode',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'layoutWrap',
  'constraints'
] as const;

/** Copies whichever of the above properties exist on `source` onto `target`. */
function copyFrameLikeProperties(source: SceneNode, target: FrameNode | ComponentNode): void {
  const anySource = source as unknown as Record<string, unknown>;
  const anyTarget = target as unknown as Record<string, unknown>;
  for (const prop of FRAME_LIKE_PROPS) {
    if (prop in anySource) {
      try {
        anyTarget[prop] = anySource[prop];
      } catch {
        // A handful of these are read-only or invalid in some combinations
        // (e.g. cornerRadius on an auto-layout frame) — skip and move on.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Feature 1: create individual components (not one merged component)
// ---------------------------------------------------------------------------

/**
 * Converts a single node into its own ComponentNode, in place (same parent,
 * same index, same position). Containers (frames, groups, boolean ops...)
 * keep their children directly inside the new component. Leaf nodes
 * (vectors, text, shapes with no children) get wrapped as the component's
 * sole child, matching how Figma's own "Create Component" behaves on a
 * single shape.
 */
function convertNodeToComponent(node: SceneNode): ComponentNode {
  const parent = node.parent;
  const index = parent && 'children' in parent ? (parent as BaseNode & ChildrenMixin).children.indexOf(node) : -1;

  const component = figma.createComponent();
  component.name = node.name;
  component.resize(Math.max(node.width, 1), Math.max(node.height, 1));
  component.x = node.x;
  component.y = node.y;

  if (isContainerNode(node)) {
    copyFrameLikeProperties(node, component);
    for (const child of [...node.children]) {
      component.appendChild(child);
    }
    matchExpandedState(node, component);
    node.remove();
  } else {
    component.appendChild(node);
    node.x = 0;
    node.y = 0;
    component.expanded = false;
  }

  if (parent && 'insertChild' in parent && index >= 0) {
    (parent as BaseNode & ChildrenMixin).insertChild(index, component);
  }

  return component;
}

async function createComponentsIndividually(): Promise<void> {
  const selection = [...figma.currentPage.selection];
  if (selection.length === 0) {
    figma.notify('Easy Components: select at least one layer first');
    return;
  }

  const result: SceneNode[] = [];
  let created = 0;
  let skipped = 0;

  for (const original of selection) {
    let node: SceneNode = original;

    if (node.type === 'COMPONENT_SET' || node.type === 'SECTION') {
      skipped++;
      continue;
    }

    if (node.type === 'COMPONENT') {
      // Already its own component — leave it alone.
      result.push(node);
      continue;
    }

    if (node.type === 'INSTANCE') {
      // Detach first so we're componentizing a plain copy, not the
      // original instance (mirrors what Figma's own UI does here).
      node = node.detachInstance();
    }

    result.push(convertNodeToComponent(node));
    created++;
  }

  figma.currentPage.selection = result;

  const skippedNote = skipped > 0 ? `, skipped ${skipped} (variant sets/sections aren't supported)` : '';
  figma.notify(`Easy Components: created ${created} component${created === 1 ? '' : 's'}${skippedNote}`);
}

// ---------------------------------------------------------------------------
// Feature 2: un-component — converts a COMPONENT back into a plain FRAME
// ---------------------------------------------------------------------------

function convertComponentToFrame(component: ComponentNode): FrameNode {
  const parent = component.parent;
  const index =
    parent && 'children' in parent ? (parent as BaseNode & ChildrenMixin).children.indexOf(component) : -1;

  const frame = figma.createFrame();
  frame.name = component.name;
  frame.resize(Math.max(component.width, 1), Math.max(component.height, 1));
  frame.x = component.x;
  frame.y = component.y;
  copyFrameLikeProperties(component, frame);

  for (const child of [...component.children]) {
    frame.appendChild(child);
  }
  matchExpandedState(component, frame);

  component.remove();

  if (parent && 'insertChild' in parent && index >= 0) {
    (parent as BaseNode & ChildrenMixin).insertChild(index, frame);
  }

  return frame;
}

/**
 * Un-components every COMPONENT node in the current selection back into a
 * plain FRAME (non-component nodes in the selection are left untouched).
 * Any instances of an affected component will lose their link — same
 * consequence as deleting a component in Figma's own UI.
 */
async function uncomponentSelection(): Promise<void> {
  const selection = [...figma.currentPage.selection];
  if (selection.length === 0) {
    figma.notify('Easy Components: select at least one component first');
    return;
  }

  const componentsInSelection = selection.filter((n): n is ComponentNode => n.type === 'COMPONENT');
  if (componentsInSelection.length === 0) {
    figma.notify('Easy Components: nothing in the selection is a component');
    return;
  }

  const result: SceneNode[] = [];
  for (const node of selection) {
    result.push(node.type === 'COMPONENT' ? convertComponentToFrame(node) : node);
  }
  figma.currentPage.selection = result;

  const skipped = selection.length - componentsInSelection.length;
  const skippedNote = skipped > 0 ? ` (left ${skipped} non-component layer${skipped === 1 ? '' : 's'} untouched)` : '';
  figma.notify(
    `Easy Components: converted ${componentsInSelection.length} component${
      componentsInSelection.length === 1 ? '' : 's'
    } back to frame${componentsInSelection.length === 1 ? '' : 's'}${skippedNote}. Any instances of them will lose their link.`
  );
}

// ---------------------------------------------------------------------------
// Feature 3: rearrange — sort the selected layers by a chosen criteria
// ---------------------------------------------------------------------------

function getComparator(criteria: SortCriteria): (a: SceneNode, b: SceneNode) => number {
  switch (criteria) {
    case 'name-asc':
      return (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    case 'name-desc':
      return (a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
    case 'x-asc':
      return (a, b) => a.x - b.x;
    case 'y-asc':
      return (a, b) => a.y - b.y;
    case 'size-desc':
      return (a, b) => b.width * b.height - a.width * a.height;
    case 'size-asc':
      return (a, b) => a.width * a.height - b.width * b.height;
  }
}

/**
 * Re-sequences the selected layers, per parent, into the order given by
 * `criteria` — non-selected siblings keep their exact position; only the
 * "slots" the selection currently occupies get filled with the newly
 * sorted selection. Rebuilds each affected parent's full child order via
 * sequential appendChild rather than juggling individual indices, which
 * sidesteps the index-shifting bugs that come from repeated insertChild
 * calls into a mutating array.
 */
function sortSelection(criteria: SortCriteria): void {
  const selection = figma.currentPage.selection;
  if (selection.length < 2) {
    figma.notify('Easy Components: select at least two layers to rearrange');
    return;
  }

  const selectedSet = new Set<SceneNode>(selection);
  const parents = new Set<BaseNode & ChildrenMixin>();
  for (const node of selection) {
    const parent = node.parent;
    if (parent && 'children' in parent) parents.add(parent as BaseNode & ChildrenMixin);
  }

  const comparator = getComparator(criteria);

  for (const parent of parents) {
    const originalChildren = [...parent.children];
    const selectedHere = originalChildren.filter((n): n is SceneNode => selectedSet.has(n as SceneNode));
    if (selectedHere.length < 2) continue;

    const sortedQueue = [...selectedHere].sort(comparator);
    let queueIndex = 0;

    const finalOrder = originalChildren.map((node) =>
      selectedSet.has(node as SceneNode) ? sortedQueue[queueIndex++] : node
    );

    for (const node of finalOrder) {
      parent.appendChild(node);
    }
  }

  figma.notify('Easy Components: rearranged');
}

// ---------------------------------------------------------------------------
// Feature 4: batch rename into a consistent naming convention
// ---------------------------------------------------------------------------

/**
 * Splits a name into words using existing separators (space, hyphen,
 * underscore, dot) AND camelCase/PascalCase case transitions. If nothing
 * splits it (e.g. "figmaicon" or "FIGMAICON" — no separators, no case
 * transition), this returns a single-element array, which is the signal
 * upstream that word boundaries can't be recovered.
 */
function splitWords(name: string): string[] {
  const normalized = name
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
  return normalized.split(/\s+/).filter(Boolean);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function applyCaseFormat(name: string, format: CaseFormat): string {
  const words = splitWords(name);

  if (words.length <= 1) {
    // No recoverable word boundary — only uppercase/lowercase is possible.
    const single = words[0] ?? name;
    return format === 'upper-concat' || format === 'upper-space' ? single.toUpperCase() : single.toLowerCase();
  }

  switch (format) {
    case 'kebab':
      return words.map((w) => w.toLowerCase()).join('-');
    case 'snake':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'title-space':
      return words.map(capitalize).join(' ');
    case 'pascal':
      return words.map(capitalize).join('');
    case 'camel':
      return words.map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w))).join('');
    case 'upper-space':
      return words.map((w) => w.toUpperCase()).join(' ');
    case 'upper-concat':
      return words.map((w) => w.toUpperCase()).join('');
  }
}

function renameSelection(format: CaseFormat): void {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify('Easy Components: select at least one layer first');
    return;
  }
  for (const node of selection) {
    node.name = applyCaseFormat(node.name, format);
  }
  figma.notify(`Easy Components: renamed ${selection.length} layer${selection.length === 1 ? '' : 's'}`);
}

// ---------------------------------------------------------------------------
// Feature 5: duplicate finder
// ---------------------------------------------------------------------------

/**
 * A rough "is this the same layer, twice" signature: type + trimmed
 * lowercase name + rounded width/height. Deliberately not comparing fills
 * or children content — that's a much heavier check for marginal benefit,
 * since accidental duplicates (copy-paste, repeated drag) almost always
 * keep the same name, type, and size.
 */
function nodeSignature(node: SceneNode): string {
  const w = Math.round(node.width);
  const h = Math.round(node.height);
  const name = node.name.trim().toLowerCase();
  return `${node.type}|${name}|${w}x${h}`;
}

// Kept in the plugin sandbox (not sent to the UI) so "select duplicates" /
// "select extras" can act on the real node references from the last run.
let lastDuplicateGroups: SceneNode[][] = [];

function findDuplicates(): void {
  const selection = figma.currentPage.selection;
  if (selection.length < 2) {
    figma.notify('Easy Components: select at least two layers to check for duplicates');
    lastDuplicateGroups = [];
    post({ type: 'duplicates-result', groups: [], totalDuplicateLayers: 0 });
    return;
  }

  const bySignature = new Map<string, SceneNode[]>();
  for (const node of selection) {
    const sig = nodeSignature(node);
    const list = bySignature.get(sig) ?? [];
    list.push(node);
    bySignature.set(sig, list);
  }

  lastDuplicateGroups = [...bySignature.values()].filter((nodes) => nodes.length > 1);

  const totalDuplicateLayers = lastDuplicateGroups.reduce((sum, group) => sum + group.length, 0);
  const summaries = lastDuplicateGroups.map((group) => ({
    label: `${group[0].name} (${Math.round(group[0].width)}×${Math.round(group[0].height)})`,
    count: group.length
  }));

  post({ type: 'duplicates-result', groups: summaries, totalDuplicateLayers });

  figma.notify(
    lastDuplicateGroups.length === 0
      ? 'Easy Components: no duplicates found in the selection'
      : `Easy Components: found ${lastDuplicateGroups.length} duplicate group${lastDuplicateGroups.length === 1 ? '' : 's'}`
  );
}

function selectDuplicates(mode: 'all' | 'extras'): void {
  if (lastDuplicateGroups.length === 0) {
    figma.notify('Easy Components: run "Find duplicates" first');
    return;
  }

  const result: SceneNode[] = [];
  for (const group of lastDuplicateGroups) {
    // "extras" keeps the first node of each group untouched and only
    // selects the redundant copies — handy for a quick delete pass.
    result.push(...(mode === 'all' ? group : group.slice(1)));
  }

  figma.currentPage.selection = result;
  figma.notify(`Easy Components: selected ${result.length} layer${result.length === 1 ? '' : 's'}`);
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  switch (msg.type) {
    case 'create-components':
      await createComponentsIndividually();
      break;
    case 'uncomponent':
      await uncomponentSelection();
      break;
    case 'sort':
      sortSelection(msg.criteria);
      break;
    case 'rename':
      renameSelection(msg.format);
      break;
    case 'find-duplicates':
      findDuplicates();
      break;
    case 'select-duplicates':
      selectDuplicates(msg.mode);
      break;
  }
};

function pushSelection(): void {
  const selection = figma.currentPage.selection;
  post({ type: 'selection-changed', hasSelection: selection.length > 0, count: selection.length });
}

figma.on('selectionchange', pushSelection);
pushSelection();
