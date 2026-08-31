# Changing the Plugin Icon

Figma plugin icons are **not** set in `manifest.json` — there's no `icon`
field for regular plugins (that's only a thing for Figma *widgets*, which
this isn't). Instead, the icon is uploaded through Figma's own **Publish**
flow, so it's set entirely inside the Figma desktop app.

## Steps

1. Prepare a **128×128 PNG** (or JPG). Keep it simple — it gets scaled down
   to ~24×24 in the Plugins panel, so fine detail disappears.
2. In Figma desktop, open **Plugins → Development → Easy Components**, then
   choose **Publish** (or **Edit**/**Manage** if already published).
3. Click the icon area in the publish dialog and upload your PNG.
4. Fill in / update the rest of the listing and submit.

## If you're only running it locally

Locally-imported "Development" plugins show a generic default icon in the
Plugins panel — there's no way to set a custom one without publishing at
least once.

## Where to keep the source icon file in this repo

```
assets/icon.png       128×128 source icon, uploaded manually during Publish
assets/cover.png       Larger cover image for the Community listing
assets/screenshot.png    Panel screenshot for the README
```

`scripts/copy-icon.js` copies `assets/icon.png` into `dist/` at build
time — that's for your own reference/tooling, not something Figma reads
directly; the actual listing icon still has to go through the Publish
dialog above.
