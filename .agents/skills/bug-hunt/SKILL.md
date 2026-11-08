---
name: bug-hunt
description: "A specialised review gate hunting correctness bugs in the diff: broken logic, unhandled errors, edge cases, state and data-flow mistakes, and frontend/backend contract mismatches across the Next.js frontend and the axum/sqlx/SQLite Rust server. Runs as a fresh-context flash sub-agent on every PR; invoked by the pr-filing skill. Findings return to the judge — this gate never posts to the PR."
---

Hunt for ways the change breaks at runtime. Not style — the `code-review` pre-review covered that. Not security — that is the `security-review` gate. Not WCAG — that is the `accessibility-review` gate. Only findings where behaviour goes wrong: something crashes, returns wrong data, loses data, dead-ends a user, or races another request.

## Scope

Diff-scoped, never a whole-app audit. Read the changed files in full (not just the hunks), plus whatever they call into where behaviour could break — callers, handlers, and consumers. If the diff changes a contract (an API route, a component's props, a database schema), check both sides of it: a frontend that sends what the old handler accepted, or a migration the code never reads, is a finding.

## Bug classes

Tuned to this stack — skip anything tooling already enforces (TypeScript, the sqlx compile-time macros, clippy).

**Frontend (Next.js / React)**

- State bugs: stale closures, effects with wrong dependency arrays, `setState` after unmount, derived state that drifts from props.
- Hydration mismatches: server and client rendering diverging, `Date`/randomness/locale used during render.
- Async discipline: swallowed promise rejections, missing loading and error states, requests that race and land out of order.
- Forms and lists: controlled/uncontrolled flips, keys that aren't stable, values dropped on submit or refetch.
- Routing: deep links that 404, navigation assumptions that break on refresh.

**Backend (axum, sqlx, SQLite)**

- `unwrap`/`expect` on paths user input can reach; panics instead of error responses.
- Dynamic (non-macro) queries whose shape doesn't match what the handler expects.
- Transaction boundaries: multi-step writes without a transaction, leaving partial-write states behind.
- Filter drift: a user-scoping filter applied in one query but missing from its sibling (the correctness twin of IDOR).
- SQLite assumptions: single-writer serialization taken for granted, migrations that don't match the queries.

**Both**

- Off-by-one and boundary conditions; empty-input and empty-result paths.
- Parse and timezone assumptions that hold in tests but not in production data.
- Error paths that strand the UI: an error the frontend never renders, so the user sees nothing happen.

## Severity anchors

- 9–10 — data loss or corruption, a crash on a common path, broken auth or sessions.
- 7–8 — broken on a realistic path: an action that fails for real users, wrong data displayed as truth.
- 4–6 — broken on edge cases, or degrades silently under load or unusual data.
- 1–3 — latent risk: a fragile pattern that happens to work today.

## Report

One finding per issue, under 400 words total: severity, title, `file:line`, the trigger path (what a user or request does to hit it), and the smallest fix. Distinguish confirmed bugs (quoted from the code) from suspicions (what you would need to check). End with a verdict line: worst severity found, and whether the gate passes — any finding at 7 or above fails the gate.

Return this report to the orchestrator. You never post to the PR — the judge reads your findings, re-checks them, and decides what reaches the PR.
