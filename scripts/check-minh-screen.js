const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'apps', 'portal');
const allowed = [
  'app/layout-client.tsx',
  'app/layout.tsx', // explicit full-layout allowed
];
const exts = new Set(['.tsx', '.ts', '.jsx', '.js', '.css', '.html']);

function walk(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results.push(...walk(full));
    } else {
      if (exts.has(path.extname(full))) results.push(full);
    }
  }
  return results;
}

function isIgnored(full) {
  if (full.includes(`${path.sep}.next${path.sep}`)) return true;
  if (full.includes(`${path.sep}node_modules${path.sep}`)) return true;
  return false;
}

const files = walk(baseDir).filter((f) => !isIgnored(f));
let found = [];
for (const f of files) {
  const rel = path.relative(process.cwd(), f);
  const contents = fs.readFileSync(f, 'utf8');
  if (contents.includes('min-h-screen') || contents.includes('h-screen')) {
    // allow explicit layout files
    if (!allowed.some((p) => rel.endsWith(p))) {
      found.push(rel);
    }
  }
}

if (found.length > 0) {
  console.error('Found min-h-screen/h-screen in nested files:');
  found.forEach((r) => console.error(' -', r));
  process.exit(1);
}

console.log('No disallowed min-h-screen/h-screen found in portal app.');
process.exit(0);
