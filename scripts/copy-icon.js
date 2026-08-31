// Copies assets/icon.png into dist/ so it travels alongside the built
// plugin (handy for your own reference/tooling). Figma's actual listing
// icon still has to be uploaded separately through the Publish dialog —
// see docs/ICON.md — this script doesn't affect that.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'assets', 'icon.png');
const destDir = path.join(__dirname, '..', 'dist');
const dest = path.join(destDir, 'icon.png');

if (!fs.existsSync(src)) {
  console.log('No assets/icon.png yet — skipping icon copy (see docs/ICON.md).');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied assets/icon.png → dist/icon.png');
