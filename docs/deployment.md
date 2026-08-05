# Deployment

## Local development

```bash
npm install
npm run dev
```

## Local production hosting

```bash
npm run build
npx serve dist
```

Direct `file://` use is not supported because PWA service workers require HTTP or HTTPS.

The 1.0 release requires a manual smoke run against this production build path. Record the result together with the real-device and service-worker-update evidence in [manual-acceptance-1.0.md](manual-acceptance-1.0.md).

## Netlify

Use the included `netlify.toml`.

Build command:

```text
npm run build
```

Publish directory:

```text
dist
```

Learner data remains in the browser's IndexedDB and is not sent to Netlify.

For the 1.0 service-worker gate, exercise an actual two-version deployment. The update notice must appear while the old version remains usable, and reload must occur only after the learner explicitly activates the waiting update.
