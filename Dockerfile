# Stage 1: Build React app
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Build-time defaults (baked into the bundle). At runtime /config.js overrides
# VITE_* values from container env, so these ARGs are only a convenience.
# Deliberately absent: VITE_OPENROUTER_API_KEY and VITE_FACEBOOK_ACCESS_TOKEN —
# token-like values are supplied at runtime via env/config.js, never baked in.
ARG VITE_API_BASE_URL
ARG VITE_APP_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FACEBOOK_APP_ID
ARG VITE_FACEBOOK_REDIRECT_URI

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
ENV VITE_FACEBOOK_REDIRECT_URI=$VITE_FACEBOOK_REDIRECT_URI

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default Nginx HTML
RUN rm -rf /usr/share/nginx/html/*

# Copy React build to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runtime config layer: rewrites /usr/share/nginx/html/config.js from the
# container's VITE_* environment before nginx starts.
COPY docker/frontend-entrypoint.sh /docker-entrypoint.d/40-frontend-config.sh
RUN chmod +x /docker-entrypoint.d/40-frontend-config.sh

# Expose port 80
EXPOSE 80

# nginx's own docker-entrypoint.sh runs every script in /docker-entrypoint.d/
# before exec'ing nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
