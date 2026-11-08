---

---

## PR filing

This skill helps you ochestrate the review gateway before a human reviews the code (if needed).

You must ochestrate the review pipeline by following the steps laid out below:

1. Code review
2. Security review
3. Design system
4. Accessibility review
5. Risk classifier

## How to ochestrate

The terms we'll use are:
- `reviewer:` specialised subagents spun up to review code
- `builder:` you as the main agent to fix the issues raised by reviewers

Use `glm-5.3-flash` subagents to do each gate, this the reviewer. For every issue it finds it must rate it on a scale of 1 to 10, for example, in a security review a 9 would be a very high risk blocker like memory leaks, or a 2 in code review might be a minor styling issue.

Once all the scores and issue have been found the reviewer must post a review summary of the issues it found and the score as an inline PR comment, that reviewer's job is done. The builder must pick up each review as round 1 to either fix or address why it's not fixing each review comment, but must post a reason why. Once that's done move onto round 2 with another subagent reviewer, see `Red lines` for the guardrails.

Once every gate has passed run the `Risk classifier` gate then file the PR using the `.github/pull_request_template.md` and fill in the relevant boxes.

## Code review

Adverserially review the code, refer to `code-review` skill.

When reviewing a PR, diff with `gh pr diff`, read the full changed files (not just the chunks), then post findings with `gh pr review`.

## Security review

Check for security issues, refer to `security-review` skill.

## Design system review

Check for frontend and accessibility issues, refer to `design-system` skill.

## Risk classifier

Given the code as it stands after all the review gates are done rank how risky this PR is to merge, refer to `risk-classifier` skill.

## Red lines

Each review cycle should get 2 rounds of review and fix by builder and reviewer to prevent an endless loop.

Always end every comment with a signature line so which model left the comment, for example, `Replying as {MODEL_NAME} on behalf of {GITHUB_USERNAME}`.
