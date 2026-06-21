// Wrapper to fix Node.js 24 compatibility with Eve's createRequire
// Eve's resolveCurrentModulePath() fails when called from [eval] context
// This sets a valid __filename before importing Eve

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Ensure __filename and __dirname are set to a valid path
// so Eve's createRequire doesn't fail with [eval]
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patch globalThis to ensure Eve can resolve its module path
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = __filename;
  globalThis.__dirname = __dirname;
}

// Now import and run Eve build
const { buildApplication } = await import('/mnt/c/Users/PC/Desktop/Eve%20agent/commit-voice/node_modules/eve/dist/src/internal/nitro/host.js');

try {
  const result = await buildApplication();
  console.log('Build succeeded:', result);
} catch (e) {
  console.error('Build failed:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 15).join('\n'));
  process.exit(1);
}
