# duka_frontend

React frontend for **Biashara Connect / Twende Duka** — a multi-tenant POS, inventory and
marketplace platform for East African SMEs. This single-page app serves four audiences from one
build: the **merchant console** (sales, stock, transfers, marketing, reports), the **public shop
directory** and SEO landing pages, the **customer portal** (orders, invoices, wishlist, corporate
buying) and the **platform admin console**. It talks exclusively to the Django REST backend in the
companion repository [`twende-org/duka_backend`](https://github.com/twende-org/duka_backend).

---

## Table of contents

- [Stack](#stack)
- [How it is organized](#how-it-is-organized)
- [Runtime configuration](#runtime-configuration)
- [Getting started](#getting-started)
- [Testing and quality gates](#testing-and-quality-gates)
- [Building for production](#building-for-production)
- [Docker](#docker)
- [Production deployment](#production-deployment)
- [Project layout](#project-layout)

---

## Stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | React 18.3 + TypeScript 5.8                                             |
| Build        | Vite 7 (`vite-plugin-pwa` service worker, code-split lazy routes)       |
| State        | Redux Toolkit 2.11 + TanStack Query 5.83                                |
| Routing      | React Router 7                                                          |
| UI           | Tailwind CSS 3.4, shadcn/ui + Radix primitives, Framer Motion, Recharts |
| i18n         | English / Kiswahili string tables (`src/lib/i18n.tsx`)                  |
| API client   | Typed domain clients under `src/lib/api/domains/` (JWT bearer)          |
| Tests        | Vitest 3 + Testing Library, jsdom (41 suites in `src/tests/`)           |
| Lint         | ESLint 9 (`typescript-eslint`, react-hooks, react-refresh)              |
| Serve        | nginx (multi-stage image, SPA fallback + SEO pre-rendered routes)       |
| Toolchain    | Node 20, npm                                                            |

## How it is organized

```
Public (no auth)          Merchant console (JWT)        Customer portal      Admin
├─ / Landing              ├─ /dashboard                 ├─ /portal           ├─ /admin
├─ /nyumbani (SEO)        │   Sales · Orders · B2B      │   Home · Orders    │   Dashboard
├─ /explore (SEO)         │   Inventory · Intake        │   Invoices ·       │   Users · Shops
├─ /duka-pos-system (SEO) │   Stock transfers           │   Receipts ·       │   Payments
├─ /twende-duka (SEO)     │   Suppliers · Purchases     │   Wishlist ·       │   Activity
├─ /twendedigital (SEO)   │   AP/AR · Expenses          │   Addresses        │   Errors
├─ Shop directory         │   Marketing · Social        │   Corporate:       │   Announcements
│   /shops · /shop/:id    │   Reports · Command Center  │   departments,     │   Support
└─ Auth: Login / Register │   Branches · Settings       │   buyers, POs      │   Wholesale
    / Google sign-in      │   User management           │                    │
```

Everything under `/dashboard` sits behind `AuthGuard` + per-route `RoleGuard`; the API layer
attaches the JWT from `src/lib/api/token.ts` (refresh-token rotation with a single-flight
deduplicator) to every Django call.

Key design points:

- **Zero Firebase.** Auth is Google Identity Services → Django JWT. Storage uploads, AI features
  and social integrations are all proxied through the backend.
- **Lazy routes.** Every page is `React.lazy`, so first paint only ships the shell.
- **Runtime config.** The same image runs against any backend — see below.
- **PWA.** Installable, offline shell via Workbox; the service worker and manifest are never
  cached so updates roll out immediately.

## Runtime configuration

`import.meta.env` values are baked in at build time, which is wrong for a promoted image: you
would have to rebuild to retarget an environment. This app therefore resolves every `VITE_*`
variable with **runtime precedence** (`src/lib/api/config.ts`):

1. `window.__APP_CONFIG__` — served as `/config.js`. In Docker, the container entrypoint
   regenerates that file from the container's environment on every start, so a config change is
   `docker compose up -d`, never a rebuild.
2. `import.meta.env` — the build-time fallback local dev uses.

| Variable                  | Purpose                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL`       | Base URL of the Django API, no trailing slash. Empty = same origin.                              |
| `VITE_APP_URL`            | Public site URL (canonical links, OG tags, SEO pages).                                           |
| `VITE_GOOGLE_CLIENT_ID`   | Google Identity Services client ID for the Django Google sign-in flow.                           |
| `VITE_FACEBOOK_APP_ID`    | Facebook login / pages integration.                                                              |
| `VITE_FACEBOOK_REDIRECT_URI` | OAuth redirect target; empty = derived from the API base or page origin.                    |
| `VITE_FACEBOOK_ACCESS_TOKEN` | Page access token for direct browser-side posting (legacy escape hatch).                    |
| `VITE_OPENROUTER_API_KEY` | Only for components that still call OpenRouter from the browser; server-side AI uses the        |
|                           | backend's `OPENROUTER_API_KEY` and is the preferred path.                                        |

Copy `.env.example` to `.env` for local development; in Docker the compose `env_file` plays the
same role at runtime.

## Getting started

Requires Node 20 and the backend running (see the backend repo — locally on `http://127.0.0.1:8009`).

```bash
npm ci
cp .env.example .env        # at minimum VITE_API_BASE_URL=http://127.0.0.1:8009
npm run dev                 # http://localhost:8080 (Vite dev server)
```

Other scripts: `npm run build` (production build), `npm run preview`, `npm test`, `npm run lint`.

## Testing and quality gates

```bash
npx tsc --noEmit -p tsconfig.app.json   # the real type gate
npm test                                # vitest run — 41 suites, jsdom
npm run lint                            # eslint 9 flat config
```

CI runs all three plus a production build on every push and pull request.

## Building for production

`npm run build` emits `dist/` and then runs `scripts/generate-seo-pages.mjs`, which clones
`index.html` per public marketing route (`/nyumbani`, `/explore`, `/duka-pos-system`,
`/twende-duka`, `/twendedigital`) with page-specific title, description, keywords, canonical and
OG tags baked into static HTML. Google therefore indexes correct metadata without executing
JavaScript, and nginx serves each `dist/<route>/index.html` via its `$uri/` fallback.

## Docker

Multi-stage `Dockerfile`: Node 20 builds the bundle (optional `--build-arg VITE_*` bake defaults),
nginx serves it. The image's startup hook (`docker/frontend-entrypoint.sh`, mounted into
`/docker-entrypoint.d/`) rewrites `/config.js` from the container's `VITE_*` environment before
nginx starts — **server configuration is data, not code**.

```bash
docker build -t duka_frontend:local .
# Local smoke test on a loopback port:
docker compose up --build      # serves http://127.0.0.1:8811
```

`docker-compose.yml` is a convenience for local image verification only (no `env_file` is
required; defaults point the app at the local Django dev server). `docker-compose.prod.yml` is the
server stack — Traefik terminates TLS on the `proxy` network and the image is pulled from a
registry. See the deployment section below.

## Production deployment

Topology: Traefik (shared, on the external `proxy` network) terminates TLS for
`duka.twendedigital.tech` and routes to this container on port 80; the Django API is served from
`backend.twendedigital.tech` by the backend repo's stack. `VITE_API_BASE_URL` in `.env` must point
there.

One-time server setup:

```bash
git clone git@github.com:twende-org/duka_frontend-.git ~/duka_frontend
cd ~/duka_frontend
cp .env.example .env   # fill in: VITE_API_BASE_URL=https://backend.twendedigital.tech,
                       # VITE_APP_URL, VITE_GOOGLE_CLIENT_ID, Facebook values
docker compose -f docker-compose.prod.yml up -d
```

To change runtime configuration afterwards, edit `.env` and run
`docker compose -f docker-compose.prod.yml up -d <service>` — the entrypoint regenerates
`config.js` on start; a rebuild is never needed for config changes.

CI/CD (`.github/workflows/ci.yml`) gates on typecheck, tests and build, then on `main` builds and
pushes the image and rolls it out over SSH. Required repository secrets: `DOCKER_USERNAME`,
`DOCKER_PASSWORD`, `SERVER_HOST`, `SERVER_USER`, `SERVER_KEY`.

> Cutover note: while the monorepo (`biashara-connect-4c1472b1`) still runs, its compose owns the
> `Host(\`duka.twendedigital.tech\`)` Traefik rule and its image was built from this same source.
> Stop that container before bringing this stack up, or Traefik will load-balance across two
> containers for the same host.

## Project layout

```
├── index.html                  # SPA shell (meta tags are the SEO-page templates)
├── public/
│   ├── config.js               # local-dev stub; Docker entrypoint overwrites it from env
│   └── favicon / manifest / robots / sitemap
├── src/
│   ├── main.tsx, App.tsx       # providers + route table (all pages lazy-loaded)
│   ├── components/             # 160+ components: ui/, layout/, guards, dialogs, seo/
│   ├── pages/                  # 64 pages: marketing, directory, dashboard, portal, admin
│   ├── lib/
│   │   ├── api/                # client.ts, token.ts, config.ts, domains/, errors.ts
│   │   ├── i18n.tsx            # English / Kiswahili tables
│   │   └── *.ts                # excel, qr, googleIdentity, pricing, whatsapp, …
│   ├── store/                  # Redux Toolkit slices
│   ├── hooks/, services/, data/, types/, config/
│   └── tests/                  # 41 vitest suites + setup.ts
├── scripts/generate-seo-pages.mjs   # post-build SEO pre-render (run by npm run build)
├── docker/frontend-entrypoint.sh    # runtime config.js regeneration hook
├── nginx.conf                  # caching, SPA fallback, /config.js never cached
├── Dockerfile, .dockerignore
├── docker-compose.yml          # local image smoke test
└── docker-compose.prod.yml     # Traefik production stack
```
