# Frontend folders are created on demand, not scaffolded upfront

`packages/web/src` stays as `app/`, `components/ui/`, and `lib/` — the shape it's already in — rather than adopting a template structure with `components/{common,layout,pages}`, `hooks/`, `stores/`, `services/`, and `utils/` scaffolded in advance. Page-specific components stay colocated under their route (e.g. `app/search/_components/`), per Next.js's own colocation convention, instead of being centralized into a shared components tree. Each additional folder is created only when real code needs it, not speculatively:

- `components/pages/` — once a component is reused across 2+ routes (until then, colocate under the route as `_components/`)
- `components/layout/` — once a cross-page layout piece exists (e.g. a shared `Header`/`Footer`/`Navbar`)
- `components/common/` — once a reusable global component (e.g. `Modal`, `Tooltip`) is needed by more than one feature area
- `hooks/` — once the first custom React hook is written
- `stores/` — once client-side state actually needs a store (Zustand/Redux); none exists today
- `services/` (not `api/` — that name collides with the `packages/api` Express backend, per [ADR-0002](0002-express-as-single-source-of-truth.md)) — only if a second outbound HTTP client shows up; the existing Express client stays at `lib/api.ts` until then
- `utils/` — split out of `lib/` only once several unrelated formatting/helper functions accumulate; today `lib/utils.ts` is just the one `cn()` classname helper and stays next to `lib/api.ts`

This avoids empty directories signaling structure that doesn't exist yet, and keeps colocation — which the codebase already follows — as the default over premature centralization.
