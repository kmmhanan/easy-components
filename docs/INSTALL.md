# Installing Easy Components

There's no `.dmg`, `.exe`, or other native installer — that's not a gap in
this repo, **Figma plugins don't work that way.** A plugin is JavaScript +
HTML that Figma's desktop app loads and runs inside itself. The closest
thing to an "installer" is a folder Figma imports via a manifest file,
which is exactly what's below.

## What you actually need

Only three files, all produced by `npm run build`:

```
manifest.json
dist/code.js
dist/ui.html
```

Nothing else — not `src/`, not `node_modules/` — is needed at runtime.
`npm run package` (see [`BUILD.md`](BUILD.md)) collects exactly these into
`dist-release/easy-components.zip` for you.

## Option A — Install from source (you have the repo)

1. `npm install && npm run build` (see [`BUILD.md`](BUILD.md) for details).
2. In the Figma desktop app: Quick Actions (`Cmd/Ctrl + /`) →
   **"Import plugin from manifest…"** → select `manifest.json`.
3. Run it from **Plugins → Development → Easy Components**.

## Option B — Install from a shared zip

1. Unzip `easy-components.zip` anywhere on disk — you should see
   `manifest.json` and a `dist/` folder next to each other.
2. In the Figma desktop app: Quick Actions → **"Import plugin from
   manifest…"** → select the `manifest.json` you just unzipped.
3. Run it from **Plugins → Development → Easy Components**.

No build step needed on the installing machine — the zip already contains
the compiled `dist/code.js` and `dist/ui.html`.

> **Note:** locally-imported plugins ("Development" plugins) are private to
> the Figma account/machine that imported them. For team-wide access
> without everyone importing a zip, an admin on a Figma Organization or
> Enterprise plan can publish it as a **private plugin** scoped to your org.

## Publishing publicly to Figma Community

Manual, through the Figma desktop UI (no public API for this):

1. `npm run build` to make sure `dist/` is current.
2. **Plugins → Development → Easy Components → Publish**.
3. Fill in the listing (description, tags, cover image, icon — see
   [`ICON.md`](ICON.md)) and submit for review.

See [`PUBLISH.md`](PUBLISH.md) for updating an already-published version.
