#!/bin/sh
# Runtime config layer: Vite bakes import.meta.env at build time, so a prebuilt
# image cannot be reconfigured via compose env_file. This hook regenerates
# config.js from the container's VITE_* environment on every start; the app
# reads window.__APP_CONFIG__ (served by this file) before its build-time
# fallbacks.
set -eu

CONFIG_FILE=/usr/share/nginx/html/config.js

{
  printf '// Generated at container start from VITE_* environment. Do not edit.\n'
  printf 'window.__APP_CONFIG__ = {\n'
  env | grep '^VITE_' | sort | while IFS='=' read -r key value; do
    escaped=$(printf '%s' "$value" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
    printf '  %s: "%s",\n' "$key" "$escaped"
  done
  printf '};\n'
} > "$CONFIG_FILE"

echo "frontend-entrypoint: wrote $CONFIG_FILE with $(grep -c ':' "$CONFIG_FILE") VITE_* entries"
