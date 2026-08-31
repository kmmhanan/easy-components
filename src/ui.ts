import type { CaseFormat, DuplicateGroupSummary, PluginToUIMessage, SortCriteria, UIToPluginMessage } from './types';

const root = document.getElementById('app') as HTMLDivElement;

let hasSelection = false;
let duplicateGroups: DuplicateGroupSummary[] = [];
let totalDuplicateLayers = 0;
let hasCheckedDuplicates = false;

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
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/></svg>`
};

// Update these if your website or Buy Me a Coffee link ever change.
const WEBSITE_URL = 'https://kmmhanan.com';
const COFFEE_URL = 'https://www.buymeacoffee.com/kmmhanan';

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

const SORT_OPTIONS: { criteria: SortCriteria; label: string; sub: string }[] = [
  { criteria: 'name-asc', label: 'Name A → Z', sub: 'Alphabetical' },
  { criteria: 'name-desc', label: 'Name Z → A', sub: 'Reverse alphabetical' },
  { criteria: 'x-asc', label: 'Left → Right', sub: 'By horizontal position' },
  { criteria: 'y-asc', label: 'Top → Bottom', sub: 'By vertical position' },
  { criteria: 'size-desc', label: 'Largest → Smallest', sub: 'By area' },
  { criteria: 'size-asc', label: 'Smallest → Largest', sub: 'By area' }
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
  const sortSection = el('div');
  const sortTitle = el('div', 'section-title');
  sortTitle.textContent = 'Rearrange';
  sortSection.appendChild(sortTitle);

  const sortGrid = el('div', 'rename-grid');
  for (const { criteria, label, sub } of SORT_OPTIONS) {
    const btn = el('button', 'rename-btn');
    const labelEl = el('span', 'example');
    labelEl.textContent = label;
    const subEl = el('span', 'label');
    subEl.textContent = sub;
    btn.appendChild(labelEl);
    btn.appendChild(subEl);
    btn.disabled = !hasSelection;
    btn.onclick = () => post({ type: 'sort', criteria });
    sortGrid.appendChild(btn);
  }
  sortSection.appendChild(sortGrid);
  body.appendChild(sortSection);

  // ---------- Duplicate finder section ----------
  const dupeSection = el('div');
  const dupeTitle = el('div', 'section-title');
  dupeTitle.textContent = 'Duplicate finder';
  dupeSection.appendChild(dupeTitle);

  const findDupeBtn = el('button', 'action-btn');
  findDupeBtn.appendChild(iconEl(ICONS.copy));
  const findDupeText = el('span');
  findDupeText.innerHTML = 'Find duplicates<span class="sub">Checks the selection for repeated layers</span>';
  findDupeBtn.appendChild(findDupeText);
  findDupeBtn.disabled = !hasSelection;
  findDupeBtn.onclick = () => post({ type: 'find-duplicates' });
  dupeSection.appendChild(findDupeBtn);

  if (hasCheckedDuplicates) {
    if (duplicateGroups.length === 0) {
      const empty = el('div', 'note');
      empty.textContent = 'No duplicates found in the current selection.';
      dupeSection.appendChild(empty);
    } else {
      const list = el('div', 'dupe-list');
      for (const group of duplicateGroups) {
        const row = el('div', 'dupe-row');
        const label = el('span');
        label.textContent = group.label;
        const count = el('span', 'dupe-count');
        count.textContent = `×${group.count}`;
        row.appendChild(label);
        row.appendChild(count);
        list.appendChild(row);
      }
      dupeSection.appendChild(list);

      const dupeActions = el('div', 'dupe-actions');

      const selectAllBtn = el('button', 'mini-action-btn');
      selectAllBtn.textContent = `Select all ${totalDuplicateLayers}`;
      selectAllBtn.onclick = () => post({ type: 'select-duplicates', mode: 'all' });

      const selectExtrasBtn = el('button', 'mini-action-btn');
      selectExtrasBtn.textContent = 'Select extras only';
      selectExtrasBtn.title = 'Keeps the first of each group, selects the rest — handy for deleting';
      selectExtrasBtn.onclick = () => post({ type: 'select-duplicates', mode: 'extras' });

      dupeActions.appendChild(selectAllBtn);
      dupeActions.appendChild(selectExtrasBtn);
      dupeSection.appendChild(dupeActions);
    }
  }

  body.appendChild(dupeSection);

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
  body.appendChild(renameSection);

  // ---------- Credits ----------
  const credits = el('div', 'credits');

  const siteLink = el('a');
  siteLink.href = WEBSITE_URL;
  siteLink.target = '_blank';
  siteLink.rel = 'noopener noreferrer';
  siteLink.appendChild(iconEl(ICONS.globe));
  const siteLabel = el('span');
  siteLabel.textContent = 'kmmhanan.com';
  siteLink.appendChild(siteLabel);

  const coffeeLink = el('a');
  coffeeLink.href = COFFEE_URL;
  coffeeLink.target = '_blank';
  coffeeLink.rel = 'noopener noreferrer';
  coffeeLink.appendChild(iconEl(ICONS.coffee));
  const coffeeLabel = el('span');
  coffeeLabel.textContent = 'Buy me a coffee';
  coffeeLink.appendChild(coffeeLabel);

  credits.appendChild(siteLink);
  credits.appendChild(coffeeLink);
  body.appendChild(credits);

  root.appendChild(body);
}

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
  if (!msg) return;
  if (msg.type === 'selection-changed') {
    hasSelection = msg.hasSelection;
    render();
  } else if (msg.type === 'duplicates-result') {
    duplicateGroups = msg.groups;
    totalDuplicateLayers = msg.totalDuplicateLayers;
    hasCheckedDuplicates = true;
    render();
  }
};

render();
