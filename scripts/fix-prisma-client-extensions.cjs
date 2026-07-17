// Prisma's "prisma-client" generator sometimes emits relative import/require
// specifiers pointing at ".ts" siblings instead of ".js" (observed to depend
// on the machine `prisma generate` runs on, not just the Node/Prisma version).
// Since our build compiles these generated ".ts" files down to ".js" via tsc,
// any leftover ".ts" specifier breaks module resolution at runtime.
// This normalizes all relative ".ts" specifiers under the generated client
// output to ".js" right after generation, before tsc ever sees them.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'src', 'generated', 'prisma');

if (!fs.existsSync(root)) {
  process.exit(0);
}

const specifierPattern =
  /((?:from|require\()\s*['"])(\.\.?\/[^'"]+)\.ts(['")])/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) {
      continue;
    }
    const original = fs.readFileSync(fullPath, 'utf8');
    const fixed = original.replace(specifierPattern, '$1$2.js$3');
    if (fixed !== original) {
      fs.writeFileSync(fullPath, fixed);
      console.log(`fix-prisma-client-extensions: rewrote ${path.relative(process.cwd(), fullPath)}`);
    }
  }
}

walk(root);
