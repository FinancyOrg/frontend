# Dev stage: Vite dev server with HMR. Used by compose overrides with the
# source mounted at /app. Serves on port 80 so port mapping 5173:80 applies.
FROM docker.io/library/node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

FROM docker.io/library/node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite embeds env vars at build time. OAuth client IDs are injected at runtime
# via OAUTH_CLIENT_ID (container env) or oauth-config.js (static hosting).
# For local compose stacks, pass VITE_DEV_LOGIN=1 instead:
#   podman build --build-arg VITE_DEV_LOGIN=1 -t financy-frontend .
ARG VITE_DEV_LOGIN=0
ENV VITE_DEV_LOGIN=$VITE_DEV_LOGIN
RUN npm run typecheck && npm run build

FROM docker.io/library/nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
