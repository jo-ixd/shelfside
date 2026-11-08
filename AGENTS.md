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
- `npm run test` — Vitest, single run; `npm run test:watch` for watch mode. Unit tests live next to the module they cover (`src/lib/*.test.ts`).
- `npm run build` — production build; run after any structural change (new/deleted routes or files).

## Code rules

This is a typescript codebase, do the following:

- never use `any` types
- never use return types, rely on inference
- avoid undefined
- never use `as` casting

Follow conventional commits and simple plain English messages describing what you did not how you did it, for example, `docs: changed AGENTS.md`. Make sure to commit often.

When verifying code, never run a dev server unless doing end-to-end testing. Never merge a pull request, period.

When filing a PR, refer to `pr-filing` skill.
