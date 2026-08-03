## Agent skills

### Issue tracker

Issues live as GitHub Issues (github.com/immyweb/travel-booking). Use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Accessibility scans and entrance animations

Pages that wrap their content in the `rise-in` entrance animation (`motion-safe:animate-[rise-in_...]`, fade + translateY) can produce false-positive color-contrast violations in automated a11y scans (e.g. accesslint) if the scan samples computed styles mid-transition rather than after it settles. Before trusting a contrast finding, re-scan against an already-loaded/settled tab (or otherwise wait out the animation) and compare — don't change color tokens based on a scan that ran during a fade-in.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `packages/web/node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
