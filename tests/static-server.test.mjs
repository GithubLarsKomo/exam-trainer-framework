import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createStaticServer } from '../server.mjs';

async function withServer(run, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'etf-static-'));
  await mkdir(join(root, 'assets'));
  await mkdir(join(root, 'private-catalogs'));

  await writeFile(join(root, 'index.html'), '<!doctype html><title>ETF</title><div id="app"></div>');
  await writeFile(join(root, 'sw.js'), 'self.addEventListener("fetch",()=>{});');
  await writeFile(join(root, 'manifest.webmanifest'), '{"name":"ETF"}');
  await writeFile(join(root, 'assets', 'app-abc123.js'), 'console.log("asset");');
  await writeFile(join(root, 'private-catalogs', 'secret.json'), '{"catalog":"secret"}');

  const server = createStaticServer({ root, ...options });
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


test('trusted Authentik proxy identity is exposed only when proxy trust is enabled', async () => {
  await withServer(async base => {
    const disabled = await fetch(`${base}/auth/user`, {
      headers: {
        'x-authentik-uid': 'user-123',
        'x-authentik-email': 'person@example.invalid',
      },
    });
    assert.equal(disabled.status, 503);
  });

  await withServer(async base => {
    const missing = await fetch(`${base}/auth/user`);
    assert.equal(missing.status, 401);

    const response = await fetch(`${base}/auth/user`, {
      headers: {
        'x-authentik-uid': 'user-123',
        'x-authentik-email': 'person@example.invalid',
        'x-authentik-name': 'Example Person',
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
      authenticated: true,
      principal: {
        userId: 'user-123',
        userDetails: 'Example Person',
      },
    });

    const logout = await fetch(`${base}/auth/logout`, { redirect: 'manual' });
    assert.equal(logout.status, 302);
    assert.equal(logout.headers.get('location'), '/outpost.goauthentik.io/sign_out');
  }, { trustAuthProxy: true });
});


test('private catalog bytes are hidden without a trusted authenticated proxy identity', async () => {
  await withServer(async base => {
    const hidden = await fetch(`${base}/private-catalogs/secret.json`);
    assert.equal(hidden.status, 404);
  });

  await withServer(async base => {
    const anonymous = await fetch(`${base}/private-catalogs/secret.json`);
    assert.equal(anonymous.status, 401);

    const authorized = await fetch(`${base}/private-catalogs/secret.json`, {
      headers: { 'x-authentik-uid': 'user-123' },
    });
    assert.equal(authorized.status, 200);
    assert.deepEqual(await authorized.json(), { catalog: 'secret' });
  }, { trustAuthProxy: true });
});
