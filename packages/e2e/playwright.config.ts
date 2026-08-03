import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Both servers are started from the repo root (not this package) as a
// production build, not `next dev` — Next's own Playwright testing guide
// recommends this: dev mode compiles routes on-demand on first visit, which
// delays the client bundle (and hydration) past the point where Playwright
// already sees the SSR-rendered form as clickable, causing a real race where
// a click lands before the onSubmit handler is attached and falls through to
// a native form GET submission. A production build hydrates fast and
// consistently enough that this race doesn't happen in practice.
// build:web/start:web/start:api load env the same way dev:web/dev:api do
// (Next's own dotenv loading; the api's own --env-file flags) — see
// package.json. Assumes Postgres is already up (`bun run db:up`) — this
// config doesn't own the DB's lifecycle, only the two app servers'.
const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Order matters: Playwright starts webServer array entries one at a time,
  // fully awaiting each one's own readiness before starting the next (see
  // playwright's runner/tasks.ts — each entry is its own sequential plugin
  // setup task). The web app's SSR pages call the api on every render (even
  // the homepage), so if web started first its own health check would 500
  // forever waiting on an api that Playwright hasn't started yet. The api
  // has no such dependency, so it goes first.
  webServer: [
    {
      command: 'bun run start:api',
      cwd: REPO_ROOT,
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun run build:web && bun run start:web',
      cwd: REPO_ROOT,
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
