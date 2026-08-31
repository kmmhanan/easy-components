// Packages the built plugin into dist-release/easy-components.zip — the
// file you'd attach to a GitHub Release or hand to someone to install
// manually. Requires `npm run build` to have already produced dist/code.js
// and dist/ui.html.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const releaseDir = path.join(root, 'dist-release');
const stageDir = path.join(releaseDir, 'easy-components');

for (const required of ['dist/code.js', 'dist/ui.html', 'manifest.json']) {
  if (!fs.existsSync(path.join(root, required))) {
    console.error(`Missing ${required} — run "npm run build" first.`);
    process.exit(1);
  }
}

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });
fs.mkdirSync(path.join(stageDir, 'dist'), { recursive: true });

fs.copyFileSync(path.join(root, 'manifest.json'), path.join(stageDir, 'manifest.json'));
fs.copyFileSync(path.join(root, 'dist', 'code.js'), path.join(stageDir, 'dist', 'code.js'));
fs.copyFileSync(path.join(root, 'dist', 'ui.html'), path.join(stageDir, 'dist', 'ui.html'));
if (fs.existsSync(path.join(root, 'README.md'))) {
  fs.copyFileSync(path.join(root, 'README.md'), path.join(stageDir, 'README.md'));
}

execSync(`zip -r -q easy-components.zip easy-components`, { cwd: releaseDir });
console.log('Packaged dist-release/easy-components.zip (manifest.json + dist/)');
