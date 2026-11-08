# Shelfside

Manage your home library on the go. See what you read and own at a glance - organised the way you want.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Useful Commands

- `npm run dev` — dev server on http://localhost:3000
- `npm run lint` — ESLint (flat config, `eslint-config-next`).
- `npm run format` — Prettier over the whole repo; `npm run format:check` verifies without writing.
- `npm run typecheck` — type generation and `tsc --noEmit`.
- `npm run test` — Vitest, single run; `npm run test:watch` for watch mode. Unit tests live next to the module they cover (`src/lib/*.test.ts`).
- `npm run build` — production build; run after any structural change (new/deleted routes or files).
- `npm run screenshot -- <url>` — Playwright capture of a page at desktop and mobile sizes; PNGs land in `evidence/` (gitignored). Browsers install once with `npx playwright install chromium`.

## Verifying changes

Before any review — human or AI — verify the change yourself, in this order:

1. `npm run lint` — zero errors, zero warnings
2. `npm run typecheck` — zero errors
3. `npm run test` — all green
4. `npm run format:check` (or `format` before committing)
5. `npm run build` — passes without errors or warnings

For changes that touch `src/app/**` or `src/components/**`, also do end-to-end verification — this is the one case where the dev server may run:

- start it in the background and wait for it to be ready
- exercise the changed flow end to end, not just the happy path
- capture evidence with `npm run screenshot -- <url>` for each affected page — the script fails on unreachable pages, and the PNG dimensions confirm a real render
- if your model can view images, read the PNGs in `evidence/` and confirm they show what you intended; if it cannot, say so in the PR and leave visual confirmation to the human reviewer
- stop the server when done

Never open a PR that has not passed this ladder. The `pr-filing` skill takes this as step zero and refuses to file without it.

## Code rules

This is a typescript codebase, do the following:

- never use `any` types
- never use return types, rely on inference
- avoid undefined
- never use `as` casting

Follow conventional commits and simple plain English messages describing what you did not how you did it, for example, `docs: changed AGENTS.md`. Make sure to commit often.

When verifying code, never run a dev server unless doing end-to-end testing. Never merge a pull request, period.

When filing a PR, refer to `pr-filing` skill.
