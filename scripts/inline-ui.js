const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'src', 'ui.html');
const bundlePath = path.join(__dirname, '..', 'dist', 'ui.bundle.js');
const outPath = path.join(__dirname, '..', 'dist', 'ui.html');

const html = fs.readFileSync(htmlPath, 'utf8');
const bundle = fs.readFileSync(bundlePath, 'utf8');

if (!html.includes('/*__INLINE_SCRIPT__*/')) {
  throw new Error('src/ui.html is missing the /*__INLINE_SCRIPT__*/ placeholder');
}

const output = html.replace('/*__INLINE_SCRIPT__*/', bundle);
fs.writeFileSync(outPath, output);
console.log('Wrote dist/ui.html (' + Math.round(output.length / 1024) + ' KB)');
