import type { CaseFormat, PluginToUIMessage, ReorderAction, UIToPluginMessage } from './types';

figma.showUI(__html__, { width: 320, height: 480, title: 'Easy Components', themeColors: true });

function post(msg: PluginToUIMessage): void {
  figma.ui.postMessage(msg);
}

function isContainerNode(node: SceneNode): node is SceneNode & ChildrenMixin {
  return 'children' in node;
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
    node.remove();
  } else {
    component.appendChild(node);
    node.x = 0;
    node.y = 0;
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
// Feature 3: rearrange (z-order) selected layers
// ---------------------------------------------------------------------------

function reorderSelection(action: ReorderAction): void {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify('Easy Components: select at least one layer first');
    return;
  }

  const byParent = new Map<BaseNode & ChildrenMixin, SceneNode[]>();
  for (const node of selection) {
    const parent = node.parent;
    if (!parent || !('children' in parent)) continue;
    const list = byParent.get(parent as BaseNode & ChildrenMixin) ?? [];
    list.push(node);
    byParent.set(parent as BaseNode & ChildrenMixin, list);
  }

  for (const [parent, nodes] of byParent) {
    const children = parent.children;
    const sorted = [...nodes].sort((a, b) => children.indexOf(a) - children.indexOf(b));

    if (action === 'front') {
      // children[last] renders on top — appendChild moves to the end.
      for (const node of sorted) parent.appendChild(node);
    } else if (action === 'back') {
      for (const node of [...sorted].reverse()) parent.insertChild(0, node);
    } else if (action === 'forward') {
      for (const node of [...sorted].reverse()) {
        const idx = children.indexOf(node);
        if (idx < children.length - 1) parent.insertChild(idx + 1, node);
      }
    } else {
      for (const node of sorted) {
        const idx = children.indexOf(node);
        if (idx > 0) parent.insertChild(idx - 1, node);
      }
    }
  }

  figma.notify('Easy Components: reordered');
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
    case 'reorder':
      reorderSelection(msg.action);
      break;
    case 'rename':
      renameSelection(msg.format);
      break;
  }
};

function pushSelection(): void {
  const selection = figma.currentPage.selection;
  post({ type: 'selection-changed', hasSelection: selection.length > 0, count: selection.length });
}

figma.on('selectionchange', pushSelection);
pushSelection();
