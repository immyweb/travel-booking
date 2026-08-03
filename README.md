# Travel Booking

A travel booking site where users search listings, view details, and make bookings.

## Architecture

This is a Bun workspaces monorepo with four packages:

- **`packages/web`** — Next.js 16 app (App Router). Renders search, listing, booking, and account pages, and calls the API over an internal connection for all data access.
- **`packages/api`** — Express app, the single source of truth for data access (see [ADR 0002](./docs/adr/0002-express-as-single-source-of-truth.md)). Owns the Postgres database, auth, pricing, and transactional email.
- **`packages/core`** — Shared types/contracts (Zod schemas) used by both `web` and `api`.
- **`packages/e2e`** — Playwright end-to-end tests covering the booking journey against real `web`/`api`/Postgres instances. A separate package rather than living inside `web`, since its fixtures need to reach into `api`'s own DB/auth internals (see [ADR 0006](./docs/adr/0006-e2e-tests-as-separate-package.md)).

Key technologies:

- [Bun](https://bun.sh) — package manager and runtime (workspaces, running the API, running tests)
- [Next.js 16](https://nextjs.org) + React 19 — frontend, styled with Tailwind CSS v4 and Radix UI primitives
- [Express 5](https://expressjs.com) — API server
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL/PostGIS — persistence and geo queries
- [Better Auth](https://www.better-auth.com) — authentication, mounted inside Express (see [ADR 0005](./docs/adr/0005-better-auth-mounted-in-express.md))
- [Resend](https://resend.com) + React Email — transactional email
- [MapLibre GL](https://maplibre.org) / `react-map-gl` — maps, tiles fetched directly by the browser (see [ADR 0004](./docs/adr/0004-map-tiles-fetched-directly-by-browser.md))
- [Vitest](https://vitest.dev) — testing for both `web` and `api`
- [Playwright](https://playwright.dev) — end-to-end tests in `packages/e2e`
- [Zod](https://zod.dev) — schema validation shared via `core`

## Prerequisites

- [Bun](https://bun.sh) >= 1.3.0
- [Docker](https://www.docker.com/) (for the local Postgres/PostGIS database)
- A [Resend](https://resend.com) API key (for sending email; a test key is fine for local dev)

## Setup

1. **Install dependencies**

   ```sh
   bun install
   ```

2. **Configure environment variables**

   Copy the example env files and fill in the values:

   ```sh
   cp .env.example .env
   cp packages/web/.env.example packages/web/.env
   ```

   Then set the API's own env file (not covered by an example, since it holds secrets):

   ```sh
   packages/api/.env
   ```

   with:

   ```
   RESEND_API_KEY=your-resend-api-key
   BETTER_AUTH_SECRET=a-long-random-string
   ```

   | File                | Variables                                                           | Purpose                                                   |
   | ------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
   | `.env`              | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` | Postgres container + Drizzle connection string            |
   | `packages/web/.env` | `API_URL`, `SITE_URL`                                               | Where the web app reaches the API, and its own public URL |
   | `packages/api/.env` | `RESEND_API_KEY`, `BETTER_AUTH_SECRET`                              | Email sending and Better Auth session signing             |

3. **Start the database**

   ```sh
   bun run db:up
   ```

4. **Run migrations and seed data**

   ```sh
   bun run --filter='@travel-booking/api' db:migrate
   bun run --filter='@travel-booking/api' db:seed
   ```

5. **Start the app**

   ```sh
   bun run dev
   ```

   This runs the API and web app in parallel:
   - Web: http://localhost:3000
   - API: http://localhost:4000

## Common scripts

Run from the repo root:

| Command           | Description                |
| ----------------- | -------------------------- |
| `bun run dev`     | Run web + API together     |
| `bun run dev:web` | Run only the Next.js app   |
| `bun run dev:api` | Run only the Express API   |
| `bun run test`    | Run tests for all packages |

Package-specific commands (run from `packages/api`):

| Command               | Description                        |
| --------------------- | ---------------------------------- |
| `bun run db:generate` | Generate a Drizzle migration       |
| `bun run db:migrate`  | Apply migrations                   |
| `bun run db:seed`     | Seed the database with sample data |
| `bun run db:studio`   | Open Drizzle Studio                |

## End-to-end tests

`packages/e2e` runs Playwright against real `web`/`api`/Postgres instances — it builds and starts both apps itself, but expects Postgres already running with migrations and seed data applied (steps 3–4 of [Setup](#setup)).

```sh
bun run --filter='@travel-booking/e2e' test
```

`bun run test` from the repo root runs this alongside every other package's tests.

## Project docs

- [`CONTEXT.md`](./CONTEXT.md) — domain language
- [`docs/adr/`](./docs/adr) — architecture decision records
- [`docs/agents/`](./docs/agents) — agent-specific workflows (issue tracker, domain docs)
