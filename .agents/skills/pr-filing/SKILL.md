---
name: pr-filing
description: "Orchestrate the tiered review pipeline that stops bugs reaching production: verify the change, classify its risk, open a draft PR, run the specialised AI review gates in bounded rounds, re-classify, then hand off — with a human gate only when the change is large or touches critical paths. Use when it is time to open a pull request."
---

## The pipeline

Run these steps in order. No step starts until the previous one passes.

0. **Verify** — the change works. Follow "Verifying changes" in `AGENTS.md`: lint, typecheck, test, format check, build. For changes touching `src/app/**` or `src/components/**`, also do end-to-end verification: start the dev server, exercise the changed flow, and capture screenshot evidence with `npm run screenshot -- <url>`. If your model can view images, read the PNGs in `evidence/` yourself — verify with your eyes before anyone else has to; if it cannot, note in the PR that visual confirmation is the human's. Stop the server when done.
1. **Classify** — run the `risk-classifier` skill on the diff. It yields the tier (`auto` or `human`), the size, and which gates run. Its decision shapes everything below.
2. **Open a draft PR** — `gh pr create --draft`, filling in `.github/pull_request_template.md`: what changed, the evidence (describe what the screenshots show and reference their paths in `evidence/` — the CLI cannot upload images, so the human drags them in from there), and the checklist. Apply the classifier's labels (`size-*`, plus `needs review` for the `human` tier). Never create labels; only use ones that exist (`gh label list`).
3. **Run the gates** — see below. The draft exists so gates can post real PR comments and fixes land as real commits.
4. **Fix rounds** — the builder addresses every finding; reviewers re-check. Two rounds per gate, hard stop.
5. **Re-classify** — run `risk-classifier` again. If the fixes pushed the change over a line, escalate the tier and update labels.
6. **Hand off** — mark the PR ready (`gh pr ready`). For the `human` tier, say plainly that the `review-gate` CI job blocks the merge until a human approves, and stop. Never merge (see `AGENTS.md`).

## Roles

- `reviewer:` a specialised sub-agent spun up per gate, on `glm-5.3-flash`, always with a fresh context. It reviews, scores, posts its summary as a PR comment, and is done.
- `builder:` you, the main agent. You fix the findings — or rebut them with a posted reason — and push.

## The gates

Each gate is one fresh `glm-5.3-flash` sub-agent. Its prompt must carry everything it cannot look up itself: the PR number and diff command (`gh pr diff <number>`), the list of changed files, and the **full text of its own skill brief** — the sub-agent has no other access to it. Independent gates run in parallel.

| Gate            | Runs when                                                  | Skill                  |
| --------------- | ---------------------------------------------------------- | ---------------------- |
| Code review     | always                                                     | `code-review`          |
| Security review | `server/**`, auth, input handling, or a dependency changed | `security-review`      |
| Accessibility   | `src/app/**` or `src/components/**` changed                | `accessibility-review` |
| Design system   | dormant — commented out, see the skill                     | `design-system`        |

Every finding gets a severity from 1 to 10 — the anchors live in each skill. Severity decides what the builder must do:

- **7 and above** (a11y: 8 and above) — gate-blocking. Fix it, or rebut it so convincingly the reviewer withdraws it.
- **4–6** — fix or rebut with a reason.
- **1–3** — advisory; fix if cheap.

## Fix rounds

For each gate, at most two rounds:

1. The reviewer posts one summary comment (`gh pr comment`): findings, severities, verdict, and the signature line below.
2. The builder fixes or rebuts **every** finding, pushing commits, and replies to the comment with what changed and why per finding.
3. The reviewer re-checks only those responses, then posts a final verdict.

Round two is the last word. Anything still unresolved stays visible on the PR for the human — the pipeline surfaces disagreement, it never buries it.

## Red lines

- Never open a PR that has not passed step 0 — no exceptions for "small" changes.
- Two rounds per gate, hard stop. The pipeline ends; the human decides.
- Never merge a pull request, period.
- Never create labels.
- Never downgrade a tier.
- Every PR comment ends with a signature line naming the model that wrote it, e.g. `Replying as {MODEL_NAME} on behalf of {GITHUB_USERNAME}`.
- Never run a gate in the main context — always a fresh sub-agent. The token budget depends on it: selective gates, flash reviewers, word caps in each skill, and findings addressed once, not relitigated.
