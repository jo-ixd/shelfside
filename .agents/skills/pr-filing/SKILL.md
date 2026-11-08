---
name: pr-filing
description: "Orchestrate the pipeline that stops bugs reaching production: verify while a fresh reviewer reads the diff, open a draft PR, run the specialised AI gates silently, let a GLM-5.3 judge file one review with every surviving finding, fix and reply inline, run a judge-only round 2, then close out with one final comment carrying the merge verdict. Use when it is time to open a pull request."
---

## The pipeline

0. **Verify and pre-review, in parallel** — spawn the pre-review sub-agent in the background first (`code-review` skill, pipeline mode: one fresh `opencode-go/glm-5.3-flash` sub-agent), then run the verification ladder from `AGENTS.md` in the main session while it works. Both must finish before anything else: the ladder green, the pre-review report in hand.
1. **Fix or push back** — every pre-review finding is fixed or explicitly dismissed with a reason **before the PR opens**; pre-PR fixes are the cheapest there will ever be. Re-run the ladder after any non-trivial fix. Record the dispositions (fixed in `<sha>` / dismissed: reason) — the judge re-checks them.
2. **Open a draft PR and watch CI** — `gh pr create --draft`, filling in `.github/pull_request_template.md`: what changed, systems touched, and the evidence (describe what the screenshots show and reference their `evidence/` paths — the CLI cannot upload images, so the human drags them in). Then watch CI: `gh pr checks <number> --watch`. Every job must pass except `review-gate`, which fails **by design** on PRs that need human review until a human approves — treat its state as information, not a blocker. If anything else fails, fix it and push before running the gates.
3. **Run the recommended gates** — the pre-review's `## Gates` recommendation decides which specialised gates run; the bug hunt always runs. Override a recommendation only with a stated reason, and pass that reason to the judge. Gates are fresh flash sub-agents running in parallel — they return scored findings to you and never post to the PR.
4. **Judge, round 1** — a fresh `opencode-go/glm-5.3` sub-agent runs the `review-judge` skill (round 1): it re-checks every gate finding against the code, drops the noise, assesses the PR's risk, and returns one review. You file it as a single GitHub review — body plus inline comments. Apply the tier label from its risk assessment.
5. **Fix and reply inline** — fix or rebut every inline finding, push commits, then reply to each thread. These replies are the collapsed-by-default comments; the PR conversation stays clean.
6. **Judge, round 2** — a fresh `opencode-go/glm-5.3` sub-agent runs `review-judge` (round 2): did the fixes land, does the risk still apply, has the PR bloated or drifted. Its verdict returns to you — no comment of its own.
7. **Close out** — fix anything round 2 raised, then post exactly one final comment: the round-2 outcome and the merge verdict. Update labels to the final tier. Mark the PR ready (`gh pr ready`).

## Roles

- `pre-reviewer:` one fresh `opencode-go/glm-5.3-flash` sub-agent (`code-review` skill). Pure review, no scoring; recommends the gates. Runs in the background during the ladder.
- `gate reviewers:` fresh `opencode-go/glm-5.3-flash` sub-agents, one per gate, in parallel. They score findings and return them; they never post to the PR.
- `judge:` a fresh `opencode-go/glm-5.3` sub-agent (`review-judge` skill). The only findings that reach the PR are ones it has confirmed. It files nothing itself — you file its round-1 review, and its round-2 verdict goes into your final comment.
- `builder:` you. You fix, you rebut, you file the judge's review, you reply inline, you write the final comment. Context flows agent-to-agent, never through PR comments.

## The gates

| Gate            | Runs when                                                   | Skill                  |
| --------------- | ----------------------------------------------------------- | ---------------------- |
| Bug hunt        | always                                                      | `bug-hunt`             |
| Security review | pre-review recommends (backend, auth, input, dependencies)  | `security-review`      |
| Accessibility   | pre-review recommends (`src/app/**` or `src/components/**`) | `accessibility-review` |
| Design system   | dormant — never recommended, see the skill                  | `design-system`        |

Each gate is one fresh flash sub-agent. Its prompt carries everything it cannot look up: the PR number and diff command (`gh pr diff <number>`), the changed-file list, and the **full text of its own skill brief** — the sub-agent has no other access to it. Independent gates run in parallel.

## Round 1 — filing the judge's review

Collect the gate reports, then spawn the judge with the **full `review-judge` brief** plus: the PR number and diff command, the changed-file list, all gate findings verbatim, the pre-review findings with your dispositions, and the GitHub username for the signature line.

The judge returns a fenced `json` block: a review body and one inline comment per surviving finding. File it verbatim as ONE review:

```
cat > /tmp/opencode/review.json <<'EOF'
{"body":"…","event":"COMMENT","comments":[{"path":"…","line":42,"body":"…"}]}
EOF
gh api repos/{owner}/{repo}/pulls/{number}/reviews --input /tmp/opencode/review.json
```

`line` must be a line that appears in the diff hunk; the judge anchors to the nearest changed line and puts unanchorable findings in the body. If `comments` is empty, file the body alone.

## Round 1 — fixes and inline replies

Record the head SHA before fixing (`git rev-parse HEAD`) — round 2 needs it. Fix or rebut every inline finding and push. Then reply to each thread — one short reply per comment; these are the collapsed-by-default comments on GitHub. Keep each reply to **one or two plain lines** — the compact pattern, not the finding's full story. Write the reply into a JSON file and post it with `gh api --input`, never through shell escaping; after posting, reread the rendered body to catch leaked escapes:

```
gh api repos/{owner}/{repo}/pulls/{number}/comments --jq '.[].id'    # list inline comment ids
printf '{"body":"Fixed in <sha> — what changed"}' > reply.json
gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies --input reply.json
gh api -X PATCH repos/{owner}/{repo}/pulls/comments/{id} --input reply.json    # edit a reply later
```

## Round 2

Spawn a fresh judge with the **full `review-judge` brief** (round 2) plus: the round-1 review as filed, your inline replies verbatim, the commits since round 1 (`git log <round1-sha>..HEAD --oneline`), the fix diff (`git diff <round1-sha>...HEAD`), and the full PR diff command. Its verdict returns to you only.

If it proposes an edit to the size/tier rule in round 2's fifth question, apply it as part of the close-out — it keeps `review-gate.yml` honest — or record in the final comment why not.

## Close out

One final comment, under 150 words, and nothing else on the PR after it:

- Round-2 outcome in two or three lines: fixes verified, tier confirmed or escalated, bloat or drift if any, anything you chose not to fix and why.
- The verdict line. `quick merge` requires all three: the tier is `auto`, the judge's recommendation is `quick merge`, and CI is green with no unresolved judge findings — then say plainly: "LGTM — let's get this merged." Otherwise say plainly: "Needs human review — the `review-gate` job stays red and the `needs review` label stays until you approve."
- Update labels to the final tier. Never downgrade; never create labels.
- End with the signature line: `Replying as {MODEL_NAME} on behalf of {GITHUB_USERNAME}`.
- Mark the PR ready: `gh pr ready`.

The finished PR reads as exactly four things: the template body, the judge's round-1 review, your collapsed inline replies, and your final comment. A human opening it can see what changed, what was checked, and whether to just merge.

## Red lines

- Never open a PR that has not passed step 0 — no exceptions for "small" changes.
- Reviewers never post to the PR. The PR carries the template body, the judge's round-1 review (filed by you), your inline replies, and your final comment — nothing else.
- Two judge rounds, hard stop. The pipeline ends; the human decides. Unresolved findings stay visible in the final comment — the pipeline surfaces disagreement, it never buries it.
- Never merge a pull request, period.
- Never create labels. Never downgrade a tier.
- Never run a gate, the pre-review, or the judge in the main context — fresh sub-agents only. The token budget depends on it: flash reviewers, word caps in every skill, one judge review instead of per-gate comment threads, and findings addressed once — after judgement, not before.
