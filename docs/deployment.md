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
