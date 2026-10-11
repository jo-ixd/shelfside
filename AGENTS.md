<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Jake's repo rules

- Commit as you go: one conventional commit per logical piece, as it lands. Subject is plain English describing what you did, not how (e.g. `fix: add button no longer drifts off the content on desktop`).
- Push to the remote every time you commit, not in a batch at the end.
- Never run a dev server to verify changes. Verify with `npm run lint`, `tsc --noEmit`, and `npm run build` only.
