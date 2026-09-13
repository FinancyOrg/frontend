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

# Vite embeds env vars at build time. Production images default to Google
# Sign-In. For local compose stacks, pass VITE_DEV_LOGIN=1 instead:
#   podman build --build-arg VITE_DEV_LOGIN=1 -t financy-frontend .
ARG VITE_DEV_LOGIN=0
ARG VITE_OAUTH_CLIENT_ID=""
ENV VITE_DEV_LOGIN=$VITE_DEV_LOGIN VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID
RUN npm run typecheck && npm run build

FROM docker.io/library/nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
