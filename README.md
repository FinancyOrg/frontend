# Financy frontend

React + TypeScript single-page application built with Vite. It talks to the [Financy backend](https://github.com/FinancyOrg/backend) over `/api`.

For stack details and feature history, see [docs/frontend-tech.md](docs/frontend-tech.md).

Hosting and Firebase deploy live in a separate deploy repository. This repository only publishes tested builds and versioned container images.

## Prerequisites

- Node.js 22+
- The backend API running at http://localhost:8081. In the backend repository, `make up` starts CockroachDB, MongoDB, and the API with development login enabled.

## Local development

```bash
cp .env.example .env.local
# Optional: cp public/oauth-config.example.js public/oauth-config.js
npm install
npm run dev
```

The dev server listens on http://localhost:5173 and proxies `/api` to `http://localhost:8081` by default.

While developing (`npm run dev`), the sign-in screen offers **Continue locally**, so Google Sign-In is not required when the backend has `DEV_LOGIN=1`.

### Environment variables

| Variable | When | Purpose |
|----------|------|---------|
| `VITE_OAUTH_CLIENT_ID` | `.env.local` | Optional Google client ID override for local dev |
| `VITE_DEV_LOGIN=1` | build time | Show **Continue locally** in non-dev builds (for local compose images) |
| `API_PROXY_TARGET` | `npm run dev` | Override the `/api` proxy target (default `http://localhost:8081`) |
| `OAUTH_CLIENT_ID` | container runtime | Writes `/oauth-config.js` when the production container starts |

Google Sign-In reads the client ID at runtime from `public/oauth-config.js`, not from the image build. Copy [`public/oauth-config.example.js`](public/oauth-config.example.js) for local static hosting, or set `OAUTH_CLIENT_ID` when running the container.

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

# Local compose image with Continue locally instead of Google Sign-In
podman build --build-arg VITE_DEV_LOGIN=1 -t financy-frontend:local .
```

Run the production container with Google Sign-In configured at runtime:

```bash
podman run --rm -e OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com -p 5173:80 financy-frontend
```

The production container expects a backend service named `backend` on port 8081 (see `nginx.conf`).

## CI and published artifacts

On every push to `main`, GitHub Actions runs typecheck and build. When that passes, CI publishes:

- **Container image:** `ghcr.io/financyorg/frontend:<VERSION>` and `:latest`
- **Git tag:** `<VERSION>` from the [`VERSION`](VERSION) file

Pull a published image:

```bash
docker pull ghcr.io/financyorg/frontend:0.0.1
docker pull ghcr.io/financyorg/frontend:latest
```

Reference it from compose or another deploy repo:

```yaml
frontend:
  image: ghcr.io/financyorg/frontend:0.0.1
  ports:
    - "5173:80"
```

For Firebase Hosting in the deploy repo, extract the built static files from the image, add `oauth-config.js`, then deploy:

```bash
cid=$(docker create ghcr.io/financyorg/frontend:0.0.1)
docker cp "${cid}:/usr/share/nginx/html" ./dist
docker rm "${cid}"
cp public/oauth-config.example.js dist/oauth-config.js
# edit dist/oauth-config.js with the real client ID
```

PRs run the same typecheck and build. The semver workflow keeps [`VERSION`](VERSION) ahead of the latest git tag.
