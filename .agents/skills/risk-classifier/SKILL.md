---
name: risk-classifier
description: "Classify a change on size and blast radius, then decide which review gates run and whether a human review is required. Runs before the review gates to set the pipeline, and again after the fixes to re-check the tier. The rule mirrors the one enforced by .github/workflows/review-gate.yml — keep the two in sync."
---

Classify every change on two axes — size and critical paths — and turn the result into a tier, a gate list, and a human-review decision. Run it twice when filing a PR: once before any review gate runs (it decides the pipeline), and once after the builder's fixes (it re-checks the tier still holds). The `pr-filing` skill says where this sits in the flow.

## Size

Count additions plus deletions against the merge-base with main: `git diff --stat main...HEAD`. Exclude lockfiles (`package-lock.json`, `server/Cargo.lock`) — churn there is not authored code.

| Size | Lines (additions + deletions) | Label     |
| ---- | ----------------------------- | --------- |
| s    | under 100                     | `size-s`  |
| m    | 100–499                       | `size-m`  |
| l    | 500–999                       | `size-l`  |
| xl   | 1000 or more                  | `size-xl` |

These thresholds match `review-gate.yml`, which enforces the same rule in CI. If the thresholds change here, change them there too.

## Critical paths

A change is critical if it touches any of:

- `.github/workflows/**` — CI pipelines
- `server/migrations/**`, `server/src/**`, `server/tests/**`, `server/Cargo.toml` — the API server and database
- `src/lib/**` — core domain logic and app state
- `next.config.ts`, `tsconfig.json`, `vitest.config.mts`, `eslint.config.mjs` — build and pipeline config

Any touch counts, however small. A one-line edit to a migration is as risky as a thousand-line rewrite of it.

## Tier decision

- `auto` — size s or m, and no critical path touched. No human review required. Styling tweaks, small bug fixes, and medium features that stay off critical paths land here.
- `human` — size l or xl, or any critical path touched at any size. Human review required; the `review-gate` CI job blocks the merge until a human approves.

## Gate selection

Both tiers get the AI gates that match the diff — being excused from human review never skips AI review:

- **Code review** — always runs.
- **Security review** — when the diff touches `server/**`, anything auth or session related, any input handling, or adds a dependency.
- **Accessibility review** — when the diff touches `src/app/**` or `src/components/**`.
- **Design system review** — dormant, never runs (see the `design-system` skill).

## Output

Report compactly, under 150 words: size, lines counted, critical paths hit (if any), tier, the gates to run, and a one-line rationale. Once the PR exists, apply the matching `size-*` label and, for the `human` tier, the `needs review` label. Only use labels that already exist (`gh label list`) — never create labels.

## Re-check rules

After the builder's fixes, classify again. If the fixes pushed the change over 500 lines or into a critical path, escalate to `human` and say so plainly. Never downgrade a tier to dodge the gate — only the numbers decide, and CI recomputes them independently anyway.
