#!/bin/sh
set -eu

if [ -n "${OAUTH_CLIENT_ID:-}" ]; then
  escaped=$(printf '%s' "${OAUTH_CLIENT_ID}" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf 'window.__FINANCY_OAUTH_CLIENT_ID__="%s";\n' "${escaped}" \
    > /usr/share/nginx/html/oauth-config.js
fi

exec "$@"
