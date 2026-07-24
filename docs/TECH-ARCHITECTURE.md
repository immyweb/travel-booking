# Tech Architecture

## Project structure

This project will use a monorepo structure with 3 packages:

- Web (front-end)
- Api (backend)
- Core (shared types, schemas, config, utils)

This allows for better code sharing, shared tooling, better dependency management and simpler PR's. It also makes it easier for AI agents as they have the complete context, better understanding and make cross-project changes.

`Bun` will be used as the runtime for the Express API and for monorepo package management/tooling. It supports:

- Monorepo package management
- Zero-config Typescript
- Built-in test runner
- Very fast

The Next.js package runs on Node.js rather than Bun, since Next.js's build pipeline, image optimization, and middleware are less battle-tested under Bun.

`Typescript` will be used throughout the project.
`Zod` will used for type validation.

## Database

This site uses relational data, therefore `PostgresSQL` will used in this project.
The `PostGIS` extension is enabled for geospatial radius search (`Location (center position + radius)` in the search API) — plain Postgres math (e.g. Haversine in SQL) doesn't scale and can't use a spatial index.
For local development, `Docker` will be used.

`Drizzle` for ORM.

## API

`Express` will be used for the API, and is the single source of truth for all data access — Next.js's SSR pages fetch data from Express over an internal/private connection rather than reading the database directly, so that the same API also serves future non-web consumers (mobile apps, third-party integrations). See [ADR-0002](./adr/0002-express-as-single-source-of-truth.md).
Combining with Bun, should allow for significant performance increases as well access to test runner.

## Front-end

`NextJS` will used as the front-end framework, using the App Router with ISR (`generateStaticParams`/`revalidate`) to pre-generate popular-search pages, falling back to full SSR for the long tail of arbitrary search queries.
It supports multiple rendering modes as well being a mature and popular framework.

## Styling / UI

`Tailwind` for CSS styling
Shadcn for UI components, such as carousels and modals.

## Forms

`React Hook Form` + `Zod` validation.

## Code structure

`ESLint` + `Prettier`
`eslint-plugin-jsx-a11y` for accessibility linting, to support the WCAG AA requirement.

## Image storage

`Cloudflare R2` (free tier: 10GB storage, 10M reads/month, no egress fees) for storing listing images.
`next/image` handles resizing and WebP/AVIF conversion at serve time.

## Authenctication

`Better Auth`

- Own your users and data
- Excellent typescript support.
- Supports common auth methods out of the box
- Scales well

## Testing

For unit / component test use `Vitest`.
For E3E tests use `Playwright`.
`@axe-core/playwright` is integrated into the Playwright E2E suite to catch accessibility regressions, to support the WCAG AA requirement.

## Internationalisation

`next-intl` for static UI copy translation.
`DeepL API` (Free tier: 500,000 characters/month) for automatic translation of host-written listing content (titles, descriptions, house rules), which can't be pre-translated. Translations are generated server-side and cached in Postgres per listing+locale, not re-translated on every request.

## Payments

Stripe (test mode)

## Email

react-email
Resend - email provider

## Deployment

`Railway` hosts both the Next.js and Express services, colocated in the same project/private network — required so the internal Next.js → Express data-fetching call (see [ADR-0002](./adr/0002-express-as-single-source-of-truth.md)) stays on a fast private connection rather than crossing the public internet.
