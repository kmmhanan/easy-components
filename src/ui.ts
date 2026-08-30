import type { CaseFormat, PluginToUIMessage, ReorderAction, UIToPluginMessage } from './types';

const root = document.getElementById('app') as HTMLDivElement;

let hasSelection = false;

function post(msg: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

const ICONS = {
  components: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  frame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18"/><path d="M21 3v18"/><path d="M3 8h18"/><path d="M3 16h18"/></svg>`,
  toFront: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11" stroke-dasharray="2 2"/></svg>`,
  forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 6 6-6 6"/><path d="m12 4 6 6-6 6" opacity="0.45"/></svg>`,
  backward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m18 4-6 6 6 6"/><path d="m12 4-6 6 6 6" opacity="0.45"/></svg>`,
  toBack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="12" height="12" rx="1"/><path d="M20 8v11a1 1 0 0 1-1 1H8" stroke-dasharray="2 2"/></svg>`
};

function iconEl(svg: string): HTMLSpanElement {
  const span = el('span');
  span.innerHTML = svg;
  return span;
}

const RENAME_FORMATS: { format: CaseFormat; example: string; label: string }[] = [
  { format: 'kebab', example: 'figma-icon', label: 'kebab-case' },
  { format: 'snake', example: 'figma_icon', label: 'snake_case' },
  { format: 'title-space', example: 'Figma Icon', label: 'Title Case' },
  { format: 'pascal', example: 'FigmaIcon', label: 'PascalCase' },
  { format: 'camel', example: 'figmaIcon', label: 'camelCase' },
  { format: 'upper-space', example: 'FIGMA ICON', label: 'UPPER CASE' },
  { format: 'upper-concat', example: 'FIGMAICON', label: 'UPPERCASE' }
];

function render(): void {
  root.innerHTML = '';

  // ---------- Header ----------
  const header = el('div', 'header');
  const title = el('div', 'title');
  title.textContent = 'Easy Components';
  const status = el('div', `status-pill ${hasSelection ? 'ok' : 'muted'}`);
  const dot = el('span', 'dot');
  const statusText = el('span');
  statusText.textContent = hasSelection ? 'Selection ready' : 'No selection';
  status.appendChild(dot);
  status.appendChild(statusText);
  header.appendChild(title);
  header.appendChild(status);
  root.appendChild(header);

  const body = el('div', 'body');

  // ---------- Components section ----------
  const componentsSection = el('div');
  const componentsTitle = el('div', 'section-title');
  componentsTitle.textContent = 'Components';
  componentsSection.appendChild(componentsTitle);

  const createBtn = el('button', 'action-btn');
  createBtn.appendChild(iconEl(ICONS.components));
  const createText = el('span');
  createText.innerHTML = 'Create individual components<span class="sub">Each selected layer becomes its own component</span>';
  createBtn.appendChild(createText);
  createBtn.disabled = !hasSelection;
  createBtn.onclick = () => post({ type: 'create-components' });
  componentsSection.appendChild(createBtn);

  const uncomponentBtn = el('button', 'action-btn');
  uncomponentBtn.appendChild(iconEl(ICONS.frame));
  const uncomponentText = el('span');
  uncomponentText.innerHTML = 'Un-component<span class="sub">Selected components become plain frames</span>';
  uncomponentBtn.appendChild(uncomponentText);
  uncomponentBtn.disabled = !hasSelection;
  uncomponentBtn.onclick = () => post({ type: 'uncomponent' });
  componentsSection.appendChild(uncomponentBtn);

  body.appendChild(componentsSection);

  // ---------- Rearrange section ----------
  const arrangeSection = el('div');
  const arrangeTitle = el('div', 'section-title');
  arrangeTitle.textContent = 'Rearrange';
  arrangeSection.appendChild(arrangeTitle);

  const arrangeRow = el('div', 'arrange-row');
  const arrangeButtons: { action: ReorderAction; icon: string; label: string }[] = [
    { action: 'front', icon: ICONS.toFront, label: 'To front' },
    { action: 'forward', icon: ICONS.forward, label: 'Forward' },
    { action: 'backward', icon: ICONS.backward, label: 'Backward' },
    { action: 'back', icon: ICONS.toBack, label: 'To back' }
  ];
  for (const { action, icon, label } of arrangeButtons) {
    const btn = el('button', 'arrange-btn');
    btn.appendChild(iconEl(icon));
    const span = el('span');
    span.textContent = label;
    btn.appendChild(span);
    btn.disabled = !hasSelection;
    btn.onclick = () => post({ type: 'reorder', action });
    arrangeRow.appendChild(btn);
  }
  arrangeSection.appendChild(arrangeRow);
  body.appendChild(arrangeSection);

  // ---------- Rename section ----------
  const renameSection = el('div');
  const renameTitle = el('div', 'section-title');
  renameTitle.textContent = 'Rename';
  renameSection.appendChild(renameTitle);

  const renameGrid = el('div', 'rename-grid');
  for (const { format, example, label } of RENAME_FORMATS) {
    const btn = el('button', 'rename-btn');
    const exampleEl = el('span', 'example');
    exampleEl.textContent = example;
    const labelEl = el('span', 'label');
    labelEl.textContent = label;
    btn.appendChild(exampleEl);
    btn.appendChild(labelEl);
    btn.disabled = !hasSelection;
    btn.onclick = () => post({ type: 'rename', format });
    renameGrid.appendChild(btn);
  }
  renameSection.appendChild(renameGrid);

  const note = el('div', 'note');
  note.textContent =
    'Names with no separators or capital-letter breaks (e.g. "figmaicon") can only toggle between all-lowercase and all-UPPERCASE — there\'s no way to recover word boundaries.';
  renameSection.appendChild(note);

  body.appendChild(renameSection);
  root.appendChild(body);
}

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
  if (!msg) return;
  if (msg.type === 'selection-changed') {
    hasSelection = msg.hasSelection;
    render();
  }
};

render();
