# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues (`github.com/immyweb/travel-booking`).

The GitHub MCP server is available in this environment — prefer its tools over the `gh` CLI when both can do the job. Fall back to the `gh` CLI (shown alongside each convention) when no MCP tool covers the operation, or when MCP is unavailable.

## Conventions

- **Create an issue**: `mcp__github__issue_write` (method `create`). Fallback: `gh issue create --title "..." --body "..."` (heredoc for multi-line bodies).
- **Read an issue**: `mcp__github__issue_read`. Fallback: `gh issue view <number> --comments`.
- **List / search issues**: `mcp__github__list_issues` for broad listing with simple filters; `mcp__github__search_issues` for targeted/keyword queries — check before creating new issues to avoid duplicates. Fallback: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label`/`--state` filters.
- **Comment on an issue**: `mcp__github__add_issue_comment`. Fallback: `gh issue comment <number> --body "..."`.
- **Apply / remove labels**: `mcp__github__issue_write` (method `update`, `labels` field). Fallback: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- **Close**: `mcp__github__issue_write` (method `update`, `state: closed`) — always set `state_reason`. Fallback: `gh issue close <number> --comment "..."`.
- **Sub-issues**: `mcp__github__sub_issue_write`. Fallback: `gh api` on the sub-issues endpoint.

Call `mcp__github__get_me` first when you need to understand current user permissions/context (e.g. for `@me` assignment). Infer the repo from `git remote -v` when using `gh` — it does this automatically inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues:

- **Read a PR**: `mcp__github__pull_request_read`, or `gh pr view <number> --comments` / `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `mcp__github__list_pull_requests` / `mcp__github__search_pull_requests`, or `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `mcp__github__update_pull_request`, or `gh pr comment` / `gh pr edit --add-label`/`--remove-label` / `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `pull_request_read`/`gh pr view 42` and fall back to `issue_read`/`gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read the issue via `mcp__github__issue_read` (or `gh issue view <number> --comments`).

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. Create via `mcp__github__issue_write` or `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`mcp__github__sub_issue_write`, or `gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children, drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: assign via `mcp__github__issue_write` or `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: comment the answer (`mcp__github__add_issue_comment` or `gh issue comment <n> --body "<answer>"`), then close, then append a context pointer (gist + link) to the map's Decisions-so-far.
