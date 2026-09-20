/**
 * Vercel build: compile the Nest app, then bundle it with the request handler
 * into a single self-contained function file.
 *
 * Step 1 uses `nest build` because Nest's dependency injection needs the
 * decorator metadata that the TypeScript compiler emits (a bundler cannot
 * produce it). Step 2 inlines the compiled output into `api/index.js` so the
 * function never has to reach outside its own directory; packages stay external
 * because the runtime resolves them from `node_modules` on its own.
 */
const { execFileSync } = require('node:child_process');
const { mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const apiDir = join(root, 'api');

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
}

run('npx', ['nest', 'build']);

rmSync(apiDir, { recursive: true, force: true });
mkdirSync(apiDir, { recursive: true });

run('npx', [
  'esbuild',
  join('serverless', 'handler.js'),
  '--bundle',
  '--platform=node',
  '--target=node22',
  '--outfile=api/index.js',
  '--packages=external',
  '--log-level=warning',
]);

console.log('Built api/index.js for Vercel.');
