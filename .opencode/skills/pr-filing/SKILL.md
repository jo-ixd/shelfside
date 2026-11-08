When opening a PR or issue, tag it with labels that already exist (`gh label list`). Never create labels. Every PR should get a `size` label that's appropriate for the change.

Use a plain English title to describe what you did, not how you did, follow the `.github/pull_request_template.md`. If the PR is tied to an issue use `ISSUE #X: ...` in the PR title as a prefix.

When reviewing a PR, diff with `gh pr diff`, read the full changed files (not just the chunks), then post findings with `gh pr review`. Try to determine whether the PR is mergeable or not, if the code changes are too large and risky to merge, tag the PR with `review required`.

Always end every comment with a signature line so it's clear a comment was made by AI, for example, `Replying as {MODEL_NAME} on behalf of {GITHUB_USERNAME}`
