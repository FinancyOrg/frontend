# Frontend image: builds the Vite app and serves it with nginx, proxying
# /api to the backend service. Build from the repo root:
#   podman build -t localhost/financy-frontend apps/frontend

# Dev stage: Vite dev server with HMR. Used by compose.live-frontend.yaml
# with the source mounted at /app. Serves on port 80 so the base compose
# port mapping (5173:80) applies unchanged.
FROM docker.io/library/node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

FROM docker.io/library/node:22-alpine AS build
WORKDIR /app

# Cache dependency install separately from source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite embeds env vars at build time. VITE_DEV_LOGIN=1 makes the production
# build show the "Continue locally" button (used by the compose stack).
# Set to 0 and pass VITE_OAUTH_CLIENT_ID for a Google sign-in build:
#   podman build --build-arg VITE_DEV_LOGIN=0 \
#     --build-arg VITE_OAUTH_CLIENT_ID=real-id.apps.googleusercontent.com ...
ARG VITE_DEV_LOGIN=1
ARG VITE_OAUTH_CLIENT_ID=""
ENV VITE_DEV_LOGIN=$VITE_DEV_LOGIN VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID
RUN npm run build

FROM docker.io/library/nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
