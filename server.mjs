import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = fileURLToPath(new URL('.', import.meta.url));

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function cacheControl(pathname) {
  if (pathname.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (pathname === '/sw.js' || pathname === '/service-worker.js') return 'no-cache';
  if (pathname.endsWith('.html') || pathname === '/' || pathname.endsWith('.webmanifest')) return 'no-cache';
  return 'public, max-age=3600';
}

function safeFilePath(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes('\0')) return undefined;
  const normalized = normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = resolve(root, normalized);
  const rel = relative(root, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) return undefined;
  return candidate;
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function commonHeaders(pathname) {
  return {
    'Cache-Control': cacheControl(pathname),
    'Referrer-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  };
}

function sendFile(req, res, filePath, pathname) {
  res.writeHead(200, {
    ...commonHeaders(pathname),
    'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }).pipe(res);
}

export function createStaticServer({ root = join(moduleDir, 'dist') } = {}) {
  const absoluteRoot = resolve(root);
  return createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const pathname = requestUrl.pathname;

    if (pathname === '/healthz') {
      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      });
      if (method === 'HEAD') res.end();
      else res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const candidate = safeFilePath(absoluteRoot, requestedPath);
    if (candidate && await fileExists(candidate)) {
      sendFile(req, res, candidate, requestedPath);
      return;
    }

    const acceptsHtml = (req.headers.accept ?? '').includes('text/html');
    if (acceptsHtml) {
      const indexPath = join(absoluteRoot, 'index.html');
      if (await fileExists(indexPath)) {
        sendFile(req, res, indexPath, '/index.html');
        return;
      }
    }

    res.writeHead(404, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end('Not Found');
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  const root = process.env.DIST_DIR ?? join(moduleDir, 'dist');
  const server = createStaticServer({ root });
  server.listen(port, host, () => {
    console.log(`ETF production server listening on http://${host}:${port}`);
  });
}
