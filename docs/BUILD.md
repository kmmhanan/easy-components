# Build & Run

## Prerequisites

- [Node.js](https://nodejs.org) 18 or later (includes npm)
- [Figma desktop app](https://www.figma.com/downloads/) — plugin development
  is not supported in the browser version

## 1. Install dependencies

```bash
npm install
```

## 2. Build

```bash
npm run build
```

This produces `dist/code.js` and `dist/ui.html` — the latter has its JS
bundle inlined into a single self-contained file, since Figma's plugin UI
can't load external `<script src>` files.

## 3. Load it into Figma

1. Open the Figma desktop app.
2. Open (or create) any Figma file.
3. Open the Quick Actions search bar (`Cmd/Ctrl + /`) and run
   **"Import plugin from manifest…"**.
4. Select `manifest.json` at the root of this repo.
5. Run it via **Plugins → Development → Easy Components**.

## 4. Development loop

```bash
npm run watch:code   # rebuilds dist/code.js on change
npm run watch:ui      # rebuilds dist/ui.bundle.js and re-inlines dist/ui.html on change
```

After a change to `code.ts`, re-run the plugin in Figma (**Plugins →
Development → Easy Components**) to pick it up — this is a fully server-side
change (no UI restart needed, but the main-thread code only reloads on a
fresh run). After a change to `ui.ts`/`ui.html`, just close and reopen the
plugin panel — no need to re-run.

## 5. Type-check

```bash
npm run typecheck
```

Runs `tsc --noEmit` against `src/`. Also what CI runs on every push (see
`.github/workflows/build.yml`).

## 6. Debugging

Figma plugins run inside Figma itself, not in a Node process, so VS Code's
debugger can't attach to them directly. To inspect logs / errors:

- Right-click the canvas → **Plugins → Development → Open Console**
  (or `Cmd/Ctrl + Option/Alt + I`) while the plugin is running.

## 7. Package a distributable build

```bash
npm run package
```

Produces `dist-release/easy-components.zip`, containing only what's needed
to install the plugin (`manifest.json` + `dist/`). See
[`INSTALL.md`](INSTALL.md) for what to do with it.
