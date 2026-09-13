# Financy frontend

React + TypeScript single-page application built with Vite. It talks to the [Financy backend](https://github.com/FinancyOrg/backend) over `/api`.

For stack details and feature history, see [docs/frontend-tech.md](docs/frontend-tech.md).

## Prerequisites

- Node.js 22+
- The backend API running at http://localhost:8081. In the backend repository, `make up` starts CockroachDB, MongoDB, and the API with development login enabled.

## Local development

```bash
cp .env.example .env.local
# Optional: set VITE_OAUTH_CLIENT_ID for Google Sign-In
npm install
npm run dev
```

The dev server listens on http://localhost:5173 and proxies `/api` to `http://localhost:8081` by default.

While developing (`npm run dev`), the sign-in screen offers **Continue locally**, so Google Sign-In is not required when the backend has `DEV_LOGIN=1`.

### Environment variables

| Variable | When | Purpose |
|----------|------|---------|
| `VITE_OAUTH_CLIENT_ID` | `.env.local` / build | Google OAuth client ID for production sign-in |
| `VITE_DEV_LOGIN=1` | build time | Show **Continue locally** in non-dev builds (Docker default) |
| `API_PROXY_TARGET` | `npm run dev` | Override the `/api` proxy target (default `http://localhost:8081`) |

## Validation and production build

```bash
npm run typecheck
npm run build
npm run preview   # serve dist/ locally
```

Output is written to `dist/`.

## Docker

Build from this repository root:

```bash
# Production image: nginx serves dist/ and proxies /api to backend:8081
podman build -t financy-frontend .

# Dev image: Vite with HMR on port 80 (for compose stacks)
podman build --target dev -t financy-frontend:dev .
```

For a Google Sign-In production build:

```bash
podman build \
  --build-arg VITE_DEV_LOGIN=0 \
  --build-arg VITE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  -t financy-frontend .
```

The production container expects a backend service named `backend` on port 8081 (see `nginx.conf`).

## Deployment

Firebase Hosting serves the compiled `dist/` directory. Authentication uses the same-origin session cookie issued by the Go backend; Hosting rewrites `/api` to Cloud Run.
