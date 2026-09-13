# Financy frontend

The frontend is a React + TypeScript single-page application built with Vite.
The development server proxies `/api` to the Go backend on port `8081`.

From the repo root, `make up` starts CockroachDB, MongoDB, the backend
(GHCR prod image), and this Vite server in Podman. The sign-in screen offers
**Continue locally** so Google is not required. See
[docs/runbook/local-dev.md](../../docs/runbook/local-dev.md).

To run the frontend by itself on the host (backend already up):

```bash
cp .env.example .env.local
# set VITE_OAUTH_CLIENT_ID in .env.local
npm install
npm run dev
```

Validation and production build:

```bash
npm run typecheck
npm run build
```

Firebase Hosting deploys the generated `dist/` directory. Authentication
continues to use the same-origin session cookie issued by the Go backend.
