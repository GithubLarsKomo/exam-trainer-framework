# Deployment

## Local development

```bash
npm install
npm run dev
```

## Local production hosting

Build the PWA and serve it through the same dependency-free production server used by the Docker image:

```bash
npm install
npm run build
npm start
```

The server listens on `0.0.0.0:3000` by default. Override `HOST`, `PORT` or `DIST_DIR` only when the hosting environment requires it.

Direct `file://` use is not supported because PWA service workers require HTTP or HTTPS.

The production server deliberately applies different cache policies:

- hashed `/assets/*`: `public, max-age=31536000, immutable`;
- `index.html`, `/` and web manifest: `no-cache`;
- `/sw.js` / `/service-worker.js`: `no-cache`;
- `/healthz`: `no-store`;
- HTML navigation to an unknown application route falls back to `index.html`;
- missing assets do not fall back to HTML.

This prevents a long-lived HTTP cache from hiding a new PWA shell or service worker while still allowing immutable Vite assets to be cached aggressively.

The 1.0 release requires a manual smoke run against the production build path. Record the result together with the real-device and service-worker-update evidence in [manual-acceptance-1.0.md](manual-acceptance-1.0.md).

## Docker

The repository contains a multi-stage `Dockerfile`:

```bash
docker build -t exam-trainer-framework .
docker run --rm -p 3000:3000 exam-trainer-framework
```

Health endpoint:

```text
GET /healthz
```

The final image contains only Node, `server.mjs` and the built `dist/` output. Build dependencies and source files are not copied into the runtime stage.

CI builds and starts this exact image and requires both `/healthz` and the application shell to respond before a PR can be considered deployable.

## Coolify on Hetzner

The canonical hosted deployment for Teach integration is a **single ETF runtime** on the existing Hetzner/Coolify environment. Do not create one application/container per course, mission or exam.

Create one Coolify application from the GitHub repository with these settings:

- repository: `GithubLarsKomo/exam-trainer-framework`;
- branch: `main`;
- build pack: Dockerfile;
- Dockerfile: `/Dockerfile`;
- exposed application port: `3000`;
- health check path: `/healthz`;
- HTTPS: enabled through the Coolify proxy for the chosen ETF hostname;
- auto-deploy on push to `main`: enabled.

No database, persistent server volume or learner account backend is required. Learner progress, ReviewEvents, sessions and scheduler state remain in browser IndexedDB.

### Deployment gate

The intended path is:

```text
Pull request
  -> ETF CI
     -> unit tests
     -> production server tests
     -> TypeScript/Vite build
     -> production Docker image build + health smoke
     -> Chromium/WebKit/mobile acceptance
  -> merge to main
  -> Coolify Git auto-deploy
  -> Hetzner runtime
  -> HTTPS PWA
```

Coolify should deploy only the repository's `main` branch. Pull-request branches are validated by GitHub Actions but are not production deployment sources.

A separate GitHub-to-Coolify webhook workflow is intentionally unnecessary when Coolify's Git integration and automatic deployment on the tracked branch are enabled. This also avoids storing a Coolify deploy token in the repository unless a future operational requirement justifies it.

### Privacy boundary

The production container serves static application/content bytes only. It does not receive ETF learner state by design. Adding server-side progress synchronization, user accounts, telemetry or ReviewEvent upload requires a separate privacy and architecture decision and is not part of this deployment path.

## Netlify

Netlify remains a supported alternate static deployment path through the included `netlify.toml`.

Build command:

```text
npm run build
```

Publish directory:

```text
dist
```

Learner data remains in the browser's IndexedDB and is not sent to Netlify by ETF itself.

For the 1.0 service-worker gate, exercise an actual two-version deployment. The update notice must appear while the old version remains usable, and reload must occur only after the learner explicitly activates the waiting update.
