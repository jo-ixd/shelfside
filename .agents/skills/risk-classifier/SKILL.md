---
name: risk-classifier
description: "Classify a change on size and blast radius into a tier and a set of labels, deciding whether human review is required. Runs once, before the PR opens; the round-2 judge re-checks the tier after the fixes. Which review gates run is decided by the code-review pre-review, not here. The rule mirrors the one enforced by .github/workflows/review-gate.yml — keep the two in sync."
---

Classify every change on two axes — size and critical paths — and turn the result into a tier, labels, and a human-review decision. Run it once, after the pre-review fixes and before the PR opens: it sets the labels and the tier the pipeline treats as ground truth. The round-2 judge re-checks the tier once the fixes are in. The `pr-filing` skill says where this sits in the flow.

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

## Gates

Gate selection is not done here — the `code-review` pre-review recommends which gates run, and the judge re-checks the recommendation. Being excused from human review never skips AI review: the `auto` tier still gets the bug hunt plus whatever specialised gates the diff warrants.

## Output

Report compactly, under 150 words: size, lines counted, critical paths hit (if any), tier, and a one-line rationale. Once the PR exists, apply the matching `size-*` label and, for the `human` tier, the `needs review` label. Only use labels that already exist (`gh label list`) — never create labels.

## Re-check rules

The round-2 judge re-checks the tier against the post-fix diff. If it escalates, the builder updates the labels before marking the PR ready. Never downgrade a tier to dodge the gate — only the numbers decide, and CI recomputes them independently anyway.
