import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createStaticServer } from '../server.mjs';

async function withServer(run) {
  const root = await mkdtemp(join(tmpdir(), 'etf-static-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<!doctype html><title>ETF</title><div id="app"></div>');
  await writeFile(join(root, 'sw.js'), 'self.addEventListener("fetch",()=>{});');
  await writeFile(join(root, 'manifest.webmanifest'), '{"name":"ETF"}');
  await writeFile(join(root, 'assets', 'app-abc123.js'), 'console.log("asset");');

  const server = createStaticServer({ root });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  try {
    await run(base);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
}

test('health endpoint is explicit and never cached', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/healthz`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('hashed assets are immutable while service worker and shell stay revalidatable', async () => {
  await withServer(async base => {
    const asset = await fetch(`${base}/assets/app-abc123.js`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    const worker = await fetch(`${base}/sw.js`);
    assert.equal(worker.status, 200);
    assert.equal(worker.headers.get('cache-control'), 'no-cache');

    const shell = await fetch(`${base}/`);
    assert.equal(shell.status, 200);
    assert.equal(shell.headers.get('cache-control'), 'no-cache');
  });
});

test('HTML navigations receive SPA fallback without turning missing assets into HTML', async () => {
  await withServer(async base => {
    const navigation = await fetch(`${base}/learning/session`, { headers: { accept: 'text/html' } });
    assert.equal(navigation.status, 200);
    assert.match(await navigation.text(), /<title>ETF<\/title>/);

    const missingAsset = await fetch(`${base}/assets/missing.js`);
    assert.equal(missingAsset.status, 404);
    assert.equal(await missingAsset.text(), 'Not Found');
  });
});
