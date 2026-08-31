# Publishing a New Version

Publishing to Figma Community is manual, tied to a Figma account, and has
no public API — CI can build and package a zip, but the actual "Publish"
click always happens in Figma desktop.

## First-time publish

1. Open the plugin in Figma desktop (import via manifest if you haven't).
2. **Plugins → Development → Easy Components → Publish**.
3. Figma assigns a real numeric plugin `id` the first time you publish and
   rewrites `manifest.json` with it — commit that change back to the repo.
4. Fill in the listing (icon, cover, description — see [`ICON.md`](ICON.md))
   and submit for review.

## Updating an already-published version

1. Build the latest code:
   ```bash
   npm run build
   ```
2. (Optional) bump `version` in `package.json` for your own tracking —
   Figma doesn't read it.
3. Run the plugin once in Figma to confirm the new build behaves.
4. **Plugins → Development → Easy Components → Manage plugins in-file →
   Publish**. Since `manifest.json`'s `id` already matches your live
   listing, this opens the update flow rather than creating a duplicate.
5. Update the description's changelog with what's new in this release.
6. Submit. Updates typically get a lighter review than the initial publish.

Whoever is logged into Figma desktop when they hit Publish becomes the
listed author — add collaborators on the plugin's Community page if more
than one person might publish updates.
