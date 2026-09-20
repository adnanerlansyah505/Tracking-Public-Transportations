/**
 * Vercel request handler.
 *
 * Vercel cannot run the long-lived HTTP server that `src/main.ts` starts, so the
 * same Nest application is exposed as a request handler instead: it is built once
 * per instance and reused across invocations.
 *
 * `scripts/build-vercel.cjs` bundles this file together with the compiled `dist/`
 * output into a single self-contained `api/index.js`, because the runtime only
 * ships the files that live inside the function itself.
 */
const express = require('express');
const { createApp } = require('../dist/app.setup');

const server = express();
let ready;

function boot() {
  if (!ready) {
    ready = Promise.resolve()
      .then(() => createApp(server))
      .then((app) => app.init())
      .catch((error) => {
        // Allow the next invocation to retry a failed cold start.
        ready = undefined;
        throw error;
      });
  }

  return ready;
}

/**
 * `vercel.json` forwards the original path as `__path` so the Nest global prefix
 * (`api/v1`) always sees the path the client asked for, no matter how the
 * platform hands the URL to the function.
 */
function restoreOriginalPath(req) {
  const url = new URL(req.url || '/', 'http://internal');

  const original = url.searchParams.get('__path');
  if (original === null) return;

  url.searchParams.delete('__path');
  const search = url.searchParams.toString();
  const path = original.replace(/^\/+/, '');

  req.url = `/${path}${search ? `?${search}` : ''}`;
}

module.exports = async function handler(req, res) {
  restoreOriginalPath(req);

  try {
    await boot();
  } catch (error) {
    console.error('Nest application failed to start', error);

    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: false, message: 'Server failed to start' }));

    return;
  }

  server(req, res);
};
